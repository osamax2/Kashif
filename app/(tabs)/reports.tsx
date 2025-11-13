// app/(tabs)/reports.tsx
import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    I18nManager,
    TouchableOpacity,
} from "react-native";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const BLUE = "#0D2B66";
const YELLOW = "#F4B400";

export default function ReportsScreen() {
    const reports = [
        { id: "1239878", date: "10.11.2024", status: "مفتوح", icon: "🔍" },
        { id: "6676434", date: "12.05.2022", status: "تم الإصلاح", icon: "✔️" },
        { id: "1234567", date: "01.12.2021", status: "قيد المراجعة", icon: "⏳" },
    ];

    const stats = [
        { label: "البلاغات المفتوحة", value: "90%" },
        { label: "البلاغات قيد المعالجة", value: "40%" },
        { label: "البلاغات التي تم إصلاحها", value: "64%" },
    ];

    return (
        <View style={styles.root}>
            {/* HEADER */}
            <View className="header" style={styles.header}>
                <Text style={styles.headerTitle}>البلاغات</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
                {/* STATS MINIMAL */}
                <Text style={styles.sectionTitle}>إحصائيات بلاغاتي</Text>

                <View style={styles.statsContainer}>
                    {stats.map((s, idx) => (
                        <View key={idx} style={styles.statRow}>
                            <View style={styles.statCircleOuter}>
                                <View style={styles.statCircleInner} />
                                <Text style={styles.statValue}>{s.value}</Text>
                            </View>

                            <View style={styles.statTextBox}>
                                <Text style={styles.statLabel}>{s.label}</Text>
                                <Text style={styles.statSub}>آخر 30 يومًا</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* ALERT CARD */}
                <View style={styles.alertCard}>
                    <Text style={styles.alertTitle}>تنبيهات فورية</Text>
                    <Text style={styles.alertText}>⏰ لا توجد تنبيهات جديدة في الوقت الحالي.</Text>
                    <TouchableOpacity>
                        <Text style={styles.alertLink}>إدارة التنبيهات</Text>
                    </TouchableOpacity>
                </View>

                {/* REPORT CARDS */}
                <Text style={styles.sectionTitle}>قائمة بلاغاتي</Text>

                <View style={styles.listContainer}>
                    {reports.map((r) => (
                        <TouchableOpacity key={r.id} style={styles.reportCard} activeOpacity={0.85}>
                            <View style={styles.reportHeaderRow}>
                                <Text style={styles.reportStatus}>
                                    {r.icon} {r.status}
                                </Text>
                                <Text style={styles.reportDate}>{r.date}</Text>
                            </View>

                            <View style={styles.reportBottomRow}>
                                <Text style={styles.reportIdLabel}>رقم البلاغ</Text>
                                <Text style={styles.reportIdValue}>{r.id}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BLUE,
        direction: "rtl",
    },

    header: {
        height: 70,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 10,
    },
    headerTitle: {
        color: "#FFFFFF",
        fontSize: 22,
        fontFamily: "Tajawal-Bold",
    },

    sectionTitle: {
        color: "#FFFFFF",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
        marginTop: 10,
        marginBottom: 8,
        marginRight: 18,
    },

    /* STATS MINIMAL */
    statsContainer: {
        marginHorizontal: 16,
        borderRadius: 16,
        backgroundColor: "#103A78",
        paddingHorizontal: 14,
        paddingVertical: 12,
    },

    statRow: {
        flexDirection: "row-reverse",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.08)",
    },

    statCircleOuter: {
        width: 46,
        height: 46,
        borderRadius: 23,
        borderWidth: 2,
        borderColor: "#A8C6FA",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 12,
        position: "relative",
    },
    statCircleInner: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: "#F4B400",
        position: "absolute",
        opacity: 0.7,
    },
    statValue: {
        color: "#FFFFFF",
        fontSize: 14,
        fontFamily: "Tajawal-Bold",
    },

    statTextBox: {
        flex: 1,
    },
    statLabel: {
        color: "#FFFFFF",
        fontSize: 15,
        fontFamily: "Tajawal-Bold",
        textAlign: "right",
    },
    statSub: {
        color: "#A8C6FA",
        fontSize: 12,
        fontFamily: "Tajawal-Regular",
        marginTop: 2,
        textAlign: "right",
    },

    /* ALERT CARD */
    alertCard: {
        marginTop: 16,
        marginHorizontal: 16,
        backgroundColor: "#123D7F",
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.15)",
    },
    alertTitle: {
        color: YELLOW,
        fontFamily: "Tajawal-Bold",
        fontSize: 16,
        marginBottom: 6,
    },
    alertText: {
        color: "#E2ECFF",
        fontFamily: "Tajawal-Regular",
        fontSize: 13,
        marginBottom: 10,
    },
    alertLink: {
        color: "#A8C6FA",
        fontFamily: "Tajawal-Medium",
        fontSize: 13,
        textDecorationLine: "underline",
    },

    /* REPORT CARDS */
    listContainer: {
        marginHorizontal: 16,
        marginTop: 8,
    },

    reportCard: {
        backgroundColor: "#103A78",
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },

    reportHeaderRow: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },

    reportStatus: {
        color: "#FFFFFF",
        fontSize: 14,
        fontFamily: "Tajawal-Bold",
    },

    reportDate: {
        color: "#A8C6FA",
        fontSize: 12,
        fontFamily: "Tajawal-Regular",
    },

    reportBottomRow: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 4,
    },

    reportIdLabel: {
        color: "#D0D9F5",
        fontSize: 12,
        fontFamily: "Tajawal-Regular",
    },

    reportIdValue: {
        color: YELLOW,
        fontSize: 14,
        fontFamily: "Tajawal-Bold",
    },
});
