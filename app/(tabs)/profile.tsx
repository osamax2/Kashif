import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    I18nManager,
    Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const BLUE = "#0D2B66";
const YELLOW = "#F4B400";

export default function ProfileScreen() {
    const shareLink = "https://your-app-link.com"; // hier deinen echten Link eintragen
    const points = 340; // Beispielwert

    const handleShareAchievement = async () => {
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

    return (
        <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* HEADER */}
            <View style={styles.headerRow}>
                <TouchableOpacity style={styles.iconBtn}>
                    <Ionicons name="settings-sharp" size={28} color={YELLOW} />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>الملف الشخصي</Text>

                <TouchableOpacity style={styles.iconBtn}>
                    <Ionicons name="chevron-forward" size={30} color={YELLOW} />
                </TouchableOpacity>
            </View>

            {/* LEVEL CIRCLE */}
            <View style={styles.levelCircle}>
                <Text style={styles.levelNumber}>4</Text>
            </View>

            <Text style={styles.levelText}>محترف 🚀</Text>

            {/* PROGRESS BAR */}
            <View style={styles.progressBar}>
                <View style={styles.progressFill} />
            </View>

            <Text style={styles.pointsText}>
                340 نقطة <Text style={{ fontSize: 20 }}>🟡</Text>
            </Text>

            {/* USERNAME */}
            <Text style={styles.userName}>ماكس موستِرمان</Text>

            {/* STATS */}
            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Ionicons name="star" size={28} color={YELLOW} />
                    <Text style={styles.statNumber}>340</Text>
                    <Text style={styles.statLabel}>النقاط</Text>
                </View>

                <View style={styles.statBox}>
                    <Ionicons name="rocket" size={28} color={YELLOW} />
                    <Text style={styles.statNumber}>4</Text>
                    <Text style={styles.statLabel}>المستوى</Text>
                </View>

                <View style={styles.statBox}>
                    <Ionicons name="bar-chart" size={28} color={YELLOW} />
                    <Text style={styles.statNumber}>12</Text>
                    <Text style={styles.statLabel}>البلاغات</Text>
                </View>
            </View>

            {/* LAST POINTS */}
            <Text style={styles.lastPointsTitle}>آخر النقاط المكتسبة:</Text>

            <View style={styles.pointsCard}>
                <Text style={styles.pointsCardText}>+10 بلاغات جديدة</Text>
                <Ionicons name="notifications" size={22} color={YELLOW} />
            </View>

            <View style={styles.pointsCard}>
                <Text style={styles.pointsCardText}>+20 تم إصلاحها</Text>
                <Ionicons name="hammer" size={22} color={YELLOW} />
            </View>

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
    },

    headerRow: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 40,
        marginBottom: 20,
    },

    headerTitle: {
        color: "#FFFFFF",
        fontSize: 24,
        fontFamily: "Tajawal-Bold",
    },

    iconBtn: {
        padding: 6,
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
        width: "70%",
        height: "100%",
        backgroundColor: YELLOW,
    },

    pointsText: {
        color: "#FFFFFF",
        fontSize: 20,
        textAlign: "center",
        marginBottom: 20,
        fontFamily: "Tajawal-Bold",
    },

    userName: {
        color: "#FFFFFF",
        fontSize: 20,
        textAlign: "center",
        marginBottom: 8,
        marginTop: -9,
        fontFamily: "Tajawal-Bold",
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
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        alignItems: "center",
    },

    pointsCardText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontFamily: "Tajawal-Regular",
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
});
