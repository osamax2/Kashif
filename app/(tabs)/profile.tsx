import { useAuth } from "@/contexts/AuthContext";
import { gamificationAPI, Level, lookupAPI, PointTransaction, reportingAPI } from "@/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    I18nManager, Image, Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const BLUE = "#0D2B66";
const YELLOW = "#F4B400";

export default function ProfileScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const shareLink = "https://your-app-link.com"; // hier deinen echten Link eintragen
    const [profileImage, setProfileImage] = useState<string | null>(null);
    
    // Backend data state
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<PointTransaction[]>([]);
    const [reportCount, setReportCount] = useState(0);
    const [levels, setLevels] = useState<Level[]>([]);
    const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
    const [nextLevel, setNextLevel] = useState<Level | null>(null);
    const [progressPercentage, setProgressPercentage] = useState(0);

    // Load data from backend
    useEffect(() => {
        loadProfileData();
    }, [user]);

    const loadProfileData = async () => {
        if (!user) return;
        
        setLoading(true);
        try {
            // Load in parallel for better performance
            const [transactionsData, reportsData, levelsData] = await Promise.all([
                gamificationAPI.getMyTransactions(0, 5).catch(() => []),
                reportingAPI.getMyReports(0, 1000).catch(() => []),
                lookupAPI.getLevels().catch(() => [])
            ]);

            setTransactions(transactionsData);
            setReportCount(reportsData.length);
            setLevels(levelsData);

            // Calculate current level and progress
            if (levelsData.length > 0) {
                const sortedLevels = [...levelsData].sort((a, b) => a.min_report_number - b.min_report_number);
                
                let current = sortedLevels[0];
                let next = sortedLevels[1] || null;
                
                for (let i = 0; i < sortedLevels.length; i++) {
                    if (reportsData.length >= sortedLevels[i].min_report_number) {
                        current = sortedLevels[i];
                        next = sortedLevels[i + 1] || null;
                    }
                }
                
                setCurrentLevel(current);
                setNextLevel(next);

                // Calculate progress to next level
                if (next) {
                    const currentMin = current.min_report_number;
                    const nextMin = next.min_report_number;
                    const progress = ((reportsData.length - currentMin) / (nextMin - currentMin)) * 100;
                    setProgressPercentage(Math.min(Math.max(progress, 0), 100));
                } else {
                    setProgressPercentage(100);
                }
            }
        } catch (error) {
            console.error('Error loading profile data:', error);
        } finally {
            setLoading(false);
        }
    };

// Bild laden beim Start
useEffect(() => {
    async function loadImage() {
        const saved = await AsyncStorage.getItem("profileImage");
        if (saved) setProfileImage(saved);
    }
    loadImage();
}, []);

// Bild speichern
const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
    });

    if (!result.canceled) {
        const uri = result.assets[0].uri;
        setProfileImage(uri);
        await AsyncStorage.setItem("profileImage", uri);
    }
};

const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
    });

    if (!result.canceled) {
        const uri = result.assets[0].uri;
        setProfileImage(uri);
        await AsyncStorage.setItem("profileImage", uri);
    }
};

// Popup öffnen
const changePhoto = () => {
    // kleines Modal
    Alert.alert(
        "تغيير الصورة",
        "اختر طريقة إضافة صورتك",
        [
            { text: "📷 التقاط صورة", onPress: takePhoto },
            { text: "🖼️ اختيار من المعرض", onPress: pickImage },
            { text: "إلغاء", style: "cancel" }
        ]
    );
};

    const handleShareAchievement = async () => {
        const points = user?.total_points || 0;
        // 1) Link kopieren
        await Clipboard.setStringAsync(shareLink);
        alert("✔️ تم نسخ الرابط بنجاح!");

        // 2) WhatsApp öffnen
        const message = `🔥 إنجازي في كاشف:\nلقد حصلت على ${points} نقطة!\n\n${shareLink}`;
        const url = `whatsapp://send?text=${encodeURIComponent(message)}`;

        Linking.openURL(url).catch(() => {
            alert("❌ WhatsApp غير مثبت على هذا الجهاز");
        });
    };

    // Helper function to get transaction icon
    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'report_created':
                return 'add-circle';
            case 'report_resolved':
                return 'checkmark-circle';
            case 'report_verified':
                return 'shield-checkmark';
            case 'redemption':
                return 'gift';
            default:
                return 'notifications';
        }
    };

    // Helper function to get transaction text
    const getTransactionText = (transaction: PointTransaction) => {
        const points = transaction.points > 0 ? `+${transaction.points}` : transaction.points;
        
        switch (transaction.transaction_type) {
            case 'report_created':
                return `${points} بلاغ جديد`;
            case 'report_resolved':
                return `${points} تم الإصلاح`;
            case 'report_verified':
                return `${points} تم التحقق`;
            case 'redemption':
                return `${points} استبدال`;
            default:
                return `${points} ${transaction.description || 'نقاط'}`;
        }
    };

    if (loading) {
        return (
            <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={YELLOW} />
                <Text style={{ color: '#FFFFFF', marginTop: 10, fontFamily: 'Tajawal-Regular' }}>
                    جاري تحميل البيانات...
                </Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* HEADER */}
            <View style={[styles.header, { marginTop: 40 }]}> 
                <TouchableOpacity onPress={() => router.push('/settings')} style={styles.iconBtn}>
                        <Ionicons name="settings-sharp" size={28} color={YELLOW} />
                </TouchableOpacity>
                    <Text numberOfLines={1} style={styles.headerTitle}>الملف الشخصي</Text>

                    <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                        <Ionicons name="chevron-forward" size={30} color={YELLOW} />
                    </TouchableOpacity>
            </View>

            <View style={styles.photoWrapper}>
    <TouchableOpacity onPress={changePhoto}>

        {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profilePhoto} />
        ) : (
            <View style={styles.emptyPhoto}>
                <Ionicons name="camera" size={36} color="#FFD166" />
            </View>
        )}

        {/* kleiner Edit-Button */}
        <View style={styles.editBadge}>
            <Ionicons name="pencil" size={16} color="#0D2B66" />
        </View>
    </TouchableOpacity>
</View>


            {/* USERNAME */}
            <Text style={styles.userName}>{user?.full_name || 'مستخدم'}</Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
           

            {/* PROGRESS BAR */}
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
            </View>

            <Text style={styles.pointsText}>
                {user?.total_points || 0} نقطة <Text style={{ fontSize: 20 }}>🏅</Text>
            </Text>
            <Text style={styles.levelText}>
                {currentLevel?.name || 'مبتدئ'} {nextLevel ? `(${Math.round(progressPercentage)}% إلى ${nextLevel.name})` : '🚀'}
            </Text>
        

            {/* STATS */}
            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Ionicons name="star" size={28} color={YELLOW} />
                    <Text style={styles.statNumber}>{user?.total_points || 0}</Text>
                    <Text style={styles.statLabel}>النقاط</Text>
                </View>

                <View style={styles.statBox}>
                    <Ionicons name="rocket" size={28} color={YELLOW} />
                    <Text style={styles.statNumber}>{currentLevel?.id || 1}</Text>
                    <Text style={styles.statLabel}>المستوى</Text>
                </View>

                <View style={styles.statBox}>
                    <Ionicons name="bar-chart" size={28} color={YELLOW} />
                    <Text style={styles.statNumber}>{reportCount}</Text>
                    <Text style={styles.statLabel}>البلاغات</Text>
                </View>
            </View>

            {/* LAST POINTS */}
            <Text style={styles.lastPointsTitle}>آخر النقاط المكتسبة:</Text>

            {transactions.length > 0 ? (
                transactions.map((transaction) => (
                    <View key={transaction.id} style={styles.pointsCard}>
                        <Ionicons 
                            style={styles.pointsCardIcon} 
                            name={getTransactionIcon(transaction.transaction_type)} 
                            size={22} 
                            color={transaction.points > 0 ? YELLOW : '#FF6B6B'} 
                        />
                        <Text style={styles.pointsCardText}>
                            {getTransactionText(transaction)}
                        </Text>
                    </View>
                ))
            ) : (
                <View style={styles.pointsCard}>
                    <Text style={styles.pointsCardText}>لا توجد معاملات حتى الآن</Text>
                </View>
            )}

            {/* SHARE BUTTON – EINZIGER BUTTON */}
            <TouchableOpacity style={styles.shareBtn} onPress={handleShareAchievement}>
                <Text style={styles.shareText}>شارك إنجازك</Text>
            </TouchableOpacity>
        </ScrollView>

        

    );


}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BLUE,
        direction: "rtl",
        paddingHorizontal: 20,
        paddingTop: 5,
    
         minHeight: "100%",
    },

    headerRow: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 40,
        marginBottom: 20,
    },

    header: {
        width: "100%",
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom:18,
    },

    headerTitle: {
        color: "#FFFFFF",
        fontSize: 22,
        fontFamily: "Tajawal-Bold",
        flex: 1,
        textAlign: "center",
    },

    iconBtn: {
        padding: 6,
        width: 44,
        height: 44,
        justifyContent: "center",
        alignItems: "center",
    },

    levelCircle: {
        width: 130,
        height: 130,
        borderRadius: 80,
        backgroundColor: "#2C4A87",
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "center",
    },

    levelNumber: {
        color: "#FFD166",
        fontSize: 42,
        fontFamily: "Tajawal-Bold",
    },

    levelText: {
        color: "#FFFFFF",
        fontSize: 22,
        textAlign: "center",
        marginVertical: 10,
        fontFamily: "Tajawal-Bold",
    },

    progressBar: {
        width: "80%",
        height: 16,
        borderRadius: 20,
        backgroundColor: "#1B3768",
        alignSelf: "center",
        overflow: "hidden",
        marginBottom: 8,
    },

    progressFill: {
        height: "100%",
        backgroundColor: YELLOW,
    },

    pointsText: {
        color: "#FFFFFF",
        fontSize: 20,
        textAlign: "center",
        marginBottom: 0,
        fontFamily: "Tajawal-Bold",
    },

    userName: {
        color: "#FFFFFF",
        fontSize: 20,
        textAlign: "center",
        marginBottom: 8,
        marginTop: 9,
        fontFamily: "Tajawal-Bold",
    },

    userEmail: {
        color: "#BFD7EA",
        fontSize: 14,
        textAlign: "center",
        marginBottom: 10,
        fontFamily: "Tajawal-Regular",
    },

    statsRow: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        marginBottom: 20,
    },

    statBox: {
        width: "30%",
        backgroundColor: "#123A7A",
        paddingVertical: 12,
        borderRadius: 18,
        alignItems: "center",
    },

    statNumber: {
        color: "#FFD166",
        fontSize: 20,
        fontFamily: "Tajawal-Bold",
        marginTop: 4,
    },

    statLabel: {
        color: "#FFFFFF",
        fontSize: 12,
        fontFamily: "Tajawal-Regular",
        marginTop: 4,
    },

    lastPointsTitle: {
        color: "#FFD166",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
        marginBottom: 10,
    },

    pointsCard: {
        backgroundColor: "#123A7A",
        padding: 12,
        borderRadius: 14,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 12,
        direction: "rtl",
    },

    pointsCardText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontFamily: "Tajawal-Regular",
        textAlign: "left",
        flex: 1,
    },

    pointsCardIcon: {
        marginRight: 4,
    },

    shareBtn: {
        backgroundColor: YELLOW,
        paddingVertical: 14,
        borderRadius: 14,
        marginTop: 10,
        alignItems: "center",
    },

    shareText: {
        color: "#fff",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
    },
    photoWrapper: {
    alignSelf: "center",
    marginTop: 10,
},

profilePhoto: {
    width: 130,
    height: 130,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: "#FFD166",
},

emptyPhoto: {
    width: 130,
    height: 130,
    borderRadius: 70,
    backgroundColor: "#2C4A87",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFD166",
},

editBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFD166",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
},

});
