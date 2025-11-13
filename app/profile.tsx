// app/(tabs)/profile.tsx

import React from "react";
import {
    View,
    Text,
    StyleSheet,
    I18nManager,
    TouchableOpacity,
} from "react-native";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function ProfileScreen() {
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
                <Text style={styles.levelNumber}>4</Text>
            </View>

            <Text style={styles.levelName}>محترف 🚀</Text>

            {/* Progress Bar */}
            <View style={styles.progressBar}>
                <View style={styles.progressFill} />
            </View>

            {/* Points */}
            <Text style={styles.points}>
                <Text style={{ color: "#F4B400" }}>340</Text> نقطة 🪙
            </Text>

            {/* Username */}
            <Text style={styles.username}>أحمد محمد</Text>

            {/* Rank Section */}
            <View style={styles.rankBox}>
                <Text style={styles.rankLine}>🏆 المركز الرابع في منطقتك</Text>
                <Text style={styles.rankLine}>🏆 المركز السادس في سوريا</Text>
            </View>

            {/* Latest Points */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>آخر النقاط المكتسبة:</Text>

                <View style={styles.pointRow}>
                    <Text style={styles.pointText}>+10 بلاغ جديد</Text>
                    <Text style={styles.pointIcon}>📢</Text>
                </View>

                <View style={styles.pointRow}>
                    <Text style={styles.pointText}>+20 تم إصلاح</Text>
                    <Text style={styles.pointIcon}>🔧</Text>
                </View>

                <View style={styles.pointRow}>
                    <Text style={styles.pointText}>+10 بلاغ جديد</Text>
                    <Text style={styles.pointIcon}>📢</Text>
                </View>
            </View>

            {/* Button */}
            <TouchableOpacity style={styles.shareButton}>
                <Text style={styles.shareButtonText}>شارك إنجازك</Text>
            </TouchableOpacity>
        </View>
    );
}

const BLUE = "#0D2B66";
const YELLOW = "#F4B400";

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
        color: "#F4B400",
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
    },

    username: {
        color: "#FFFFFF",
        fontSize: 20,
        marginTop: 8,
        fontFamily: "Tajawal-Bold",
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

    pointRow: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        backgroundColor: "#1A3A70",
        padding: 12,
        borderRadius: 10,
        marginBottom: 8,
    },

    pointText: {
        color: "white",
        fontSize: 15,
    },

    pointIcon: {
        fontSize: 20,
    },

    shareButton: {
        marginTop: 26,
        backgroundColor: YELLOW,
        paddingVertical: 14,
        paddingHorizontal: 34,
        borderRadius: 12,
    },

    shareButtonText: {
        color: BLUE,
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
    },
});
