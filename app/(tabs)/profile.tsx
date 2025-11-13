// app/(tabs)/profile.tsx
import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    I18nManager,
    Alert,
    Linking,
    Share,
} from "react-native";
import * as Clipboard from "expo-clipboard";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const BLUE = "#0D2B66";
const YELLOW = "#F4B400";

export default function ProfileScreen() {
    // später kannst du diese Werte dynamisch aus der DB setzen
    const level = 4;
    const points = 340;
    const name = "أحمد محمد";

    const profileLink = "https://kashif.app/user/123"; // TODO: echten Link einsetzen

    const handleShareAchievement = async () => {
        const message = `أنا في المستوى ${level} في تطبيق كاشف ومعي ${points} نقطة! جرّب التطبيق من هنا: ${profileLink}`;

        try {
            // 1) Erst versuchen, WhatsApp zu öffnen
            const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(
                message
            )}`;
            const canOpen = await Linking.canOpenURL(whatsappUrl);

            if (canOpen) {
                await Linking.openURL(whatsappUrl);
                return;
            }

            // 2) Fallback: Link kopieren + normales Share-Menü
            await Clipboard.setStringAsync(profileLink);
            Alert.alert(
                "تم نسخ الرابط",
                "تم نسخ رابط إنجازك إلى الحافظة، يمكنك لصقه في أي تطبيق."
            );

            await Share.share({ message });
        } catch (error) {
            console.log(error);
            Alert.alert("خطأ", "تعذر مشاركة إنجازك الآن. حاول مرة أخرى لاحقاً.");
        }
    };

    return (
        <View style={styles.root}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn}>
                    <Text style={styles.backIcon}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>الملف الشخصي</Text>
                <View style={{ width: 32 }} />
            </View>

            {/* Big Circle Level */}
            <View style={styles.levelCircle}>
                <Text style={styles.levelNumber}>{level}</Text>
            </View>

            <Text style={styles.levelName}>محترف 🚀</Text>

            {/* Progress Bar */}
            <View style={styles.progressBar}>
                <View style={styles.progressFill} />
            </View>

            {/* Points */}
            <Text style={styles.points}>
                <Text style={{ color: YELLOW }}>{points}</Text> نقطة 🪙
            </Text>

            {/* Username */}
            <Text style={styles.username}>{name}</Text>

            {/* Rank Section */}
            <View style={styles.rankBox}>
                <Text style={styles.rankLine}>🏆 المركز الرابع في منطقتك</Text>
                <Text style={styles.rankLine}>🏆 المركز السادس في سوريا</Text>
            </View>

            {/* Latest Points */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>آخر النقاط المكتسبة:</Text>

                <View style={styles.pointsContainer}>
                    <View style={styles.pointRow}>
                        <Text style={styles.pointText}> +10 بلاغ جديد</Text>
                        <Text style={styles.pointIcon}>📢</Text>
                    </View>

                    <View style={styles.pointRow}>
                        <Text style={styles.pointText}> +20 تم إصلاح</Text>
                        <Text style={styles.pointIcon}>🔧</Text>
                    </View>

                    <View style={styles.pointRow}>
                        <Text style={styles.pointText}> +10 بلاغ جديد</Text>
                        <Text style={styles.pointIcon}>📢</Text>
                    </View>
                </View>
            </View>

            {/* Button */}
            <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareAchievement}
            >
                <Text style={styles.shareButtonText}>شارك إنجازك</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BLUE,
        paddingTop: 50,
        paddingHorizontal: 20,
        direction: "rtl",
        alignItems: "center",
    },

    header: {
        width: "100%",
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
    },

    backBtn: {
        width: 32,
        height: 32,
        justifyContent: "center",
        alignItems: "center",
    },

    backIcon: {
        color: YELLOW,
        fontSize: 22,
    },

    headerTitle: {
        color: "#FFFFFF",
        fontSize: 22,
        fontFamily: "Tajawal-Bold",
    },

    levelCircle: {
        width: 130,
        height: 130,
        backgroundColor: "#335A9A",
        borderRadius: 70,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 10,
    },

    levelNumber: {
        color: YELLOW,
        fontSize: 38,
        fontFamily: "Tajawal-Bold",
    },

    levelName: {
        color: "#FFFFFF",
        fontSize: 18,
        marginTop: 10,
        fontFamily: "Tajawal-Medium",
    },

    progressBar: {
        width: "80%",
        height: 12,
        backgroundColor: "#1A3A70",
        borderRadius: 10,
        marginTop: 16,
        overflow: "hidden",
    },

    progressFill: {
        width: "60%",
        height: "100%",
        backgroundColor: YELLOW,
    },

    points: {
        color: "#FFFFFF",
        fontSize: 16,
        marginTop: 12,
        fontFamily: "Tajawal-Regular",
        textAlign: "right",
    },

    username: {
        color: "#FFFFFF",
        fontSize: 20,
        marginTop: 8,
        fontFamily: "Tajawal-Bold",
        textAlign: "center",
    },

    rankBox: {
        marginTop: 20,
        alignItems: "center",
        gap: 4,
    },

    rankLine: {
        color: "#FFFFFF",
        fontSize: 15,
        fontFamily: "Tajawal-Regular",
    },

    section: {
        marginTop: 28,
        width: "90%",
    },

    sectionTitle: {
        color: YELLOW,
        fontSize: 18,
        marginBottom: 10,
        fontFamily: "Tajawal-Bold",
    },

    pointsContainer: {
        width: "100%",
        gap: 8,
        marginTop: 8,
    },

    pointRow: {
        flexDirection: "row-reverse",  // 🔥 WICHTIG → RTL
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#133B7A",
        paddingVertical: 5,
        paddingHorizontal: 14,
        borderRadius: 10,
    },

    pointText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontFamily: "Tajawal-Regular",
        textAlign: "left",            // 🔥 Text rechts
        flex: 1,                       // 🔥 Schiebt Icon nach links
    },

    pointIcon: {
        fontSize: 20,
        marginLeft: 10,                // Abstand vom Text
    },

    shareButton: {
        backgroundColor: YELLOW,
        paddingVertical: 12,
        borderRadius: 8,
        width: "100%",
        marginTop: 18,
        marginBottom: 12,
        shadowColor: "#ffffff",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
        alignItems: "center",
        justifyContent: "center",
    },

    shareButtonText: {
        color: "#0D2B66",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
    },
});
