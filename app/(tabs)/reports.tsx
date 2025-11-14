import React from "react";
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from "react-native";

export default function ReportsScreen() {
    const reports = [
        { id: "1239878", date: "10.11.2024", status: "مفتوح", icon: "🔍" },
        { id: "6676434", date: "12.05.2022", status: "تم الإصلاح", icon: "✔️" },
        { id: "1234567", date: "01.12.2021", status: "قيد المراجعة", icon: "⏳" },
    ];

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>البلاغات</Text>
            <TouchableOpacity>
                <Text style={styles.bell}>🔔</Text>
            </TouchableOpacity>

            {/* Section Title */}
            <Text style={styles.sectionTitle}>إحصائيات بلاغاتي</Text>

            {/* Neon Stats Row */}
            <View style={styles.statsRow}>
                <NeonCircle title="البلاغات المقترحة" value="90%" color="#4F46E5" />
                <NeonCircle title="البلاغات قيد المعالجة" value="40%" color="#FF6B6B" />
                <NeonCircle title="تم إصلاحها" value="64%" color="#4ADE80" />
            </View>



            {/* ░░ MODERNE REPORT-KARTEN ░░ */}
            <Text style={styles.sectionTitleSmall}>قائمة بلاغاتي</Text>

            <View style={{ marginHorizontal: 16, marginTop: 10 }}>
                <ReportCard
                    number="1239878"
                    date="10.11.2024"
                    status="مفتوح"
                    icon="🔎"
                    color="#4FD1C5"
                />

                <ReportCard
                    number="6676434"
                    date="12.05.2022"
                    status="تم الإصلاح"
                    icon="✔️"
                    color="#68D391"
                />

                <ReportCard
                    number="1234567"
                    date="01.12.2021"
                    status="قيد المراجعة"
                    icon="⏳"
                    color="#F6AD55"
                />
            </View>
        </ScrollView>
    );
}
/* ░░ MODERNE REPORT-CARD ░░ */
function ReportCard({
                        number,
                        date,
                        status,
                        icon,
                        color,
                    }: {
    number: string;
    date: string;
    status: string;
    icon: string;
    color: string;
}) {
    return (
        <View style={[styles.cardRow, { borderLeftColor: color }]}>
            <View style={styles.cardRowContent}>
                <Text style={styles.cardStatusText}>
                    {status} {icon}
                </Text>

                <Text style={styles.cardDate}>{date}</Text>

                <Text style={styles.cardNumber}>{number}</Text>
            </View>
        </View>
    );
}

/* ---------------------- Neon Circle Component ---------------------- */

function NeonCircle({ title, value, color }) {
    return (
        <View style={styles.circleContainer}>
            <View style={[styles.circleGlow, { shadowColor: color }]} />
            <View style={[styles.circle, { borderColor: color }]}>
                <Text style={styles.circleValue}>{value}</Text>
            </View>
            <Text style={styles.circleLabel}>{title}</Text>
        </View>
    );
}

/* ---------------------- Styles ---------------------- */

const BLUE = "#0D2B66";
const YELLOW = "#F4B400";

const styles = StyleSheet.create({
    container: {
        backgroundColor: BLUE,
        padding: 16,
        direction: "rtl",
        flex: 1,
    },

    header: {
        color: "white",
        fontSize: 26,
        textAlign: "center",
        fontFamily: "Tajawal-Bold",
        marginVertical: 10,
    },

    sectionTitle: {
        color: YELLOW,
        fontSize: 18,
        marginVertical: 14,
        fontFamily: "Tajawal-Bold",
    },

    /* ---------------- Neon Stats ---------------- */
    statsRow: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        marginBottom: 20,
    },

    circleContainer: {
        alignItems: "center",
        width: "33%",
    },
    back: { fontSize: 26, color: YELLOW },
    bell: { fontSize: 26, color: YELLOW },


    circleValue: {
        color: "white",
        fontSize: 22,
        fontFamily: "Tajawal-Bold",
    },

    circleLabel: {
        color: "#DCE1EB",
        marginTop: 6,
        fontFamily: "Tajawal-Regular",
    },

    circleGlow: {
        position: "absolute",
        width: 90,
        height: 90,
        borderRadius: 50,
        shadowRadius: 12,
        shadowOpacity: 0.9,
        shadowOffset: { width: 0, height: 0 },
    },

    /* ---------------- Alerts Box ---------------- */
    alertBox: {
        backgroundColor: "#112F66",
        padding: 16,
        borderRadius: 14,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },

    alertTitle: {
        color: YELLOW,
        fontFamily: "Tajawal-Bold",
        fontSize: 16,
        marginBottom: 6,
    },

    alertText: {
        color: "#DCE1EB",
        fontFamily: "Tajawal-Regular",
        marginBottom: 8,
    },

    alertEdit: {
        color: YELLOW,
        alignSelf: "flex-start",
        fontFamily: "Tajawal-Medium",
    },

    /* ---------------- Neon Table ---------------- */
    table: {
        width: "100%",
        backgroundColor: "#112F66",
        borderRadius: 14,
        overflow: "hidden",
        borderColor: YELLOW,
        borderWidth: 1.2,
    },

    tableHeaderRow: {
        flexDirection: "row-reverse",
        backgroundColor: YELLOW,
        padding: 10,
    },

    tableHeader: {
        flex: 1,
        textAlign: "center",
        color: BLUE,
        fontFamily: "Tajawal-Bold",
        fontSize: 15,
    },

    tableRow: {
        flexDirection: "row-reverse",
        paddingVertical: 12,
        paddingHorizontal: 6,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.08)",
    },

    tableCell: {
        flex: 1,
        textAlign: "center",
        color: "white",
        fontFamily: "Tajawal-Regular",
        fontSize: 15,
    },

    /* GLASS CARD TOP */
    glassCard: {
        backgroundColor: "rgba(255,255,255,0.06)",
        padding: 18,
        marginHorizontal: 16,
        marginTop: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 5,
    },
    glassTitle: {
        color: "#FFFFFF",
        fontFamily: "Tajawal-Bold",
        fontSize: 17,
        textAlign: "center",
        marginBottom: 16,
    },
    glassStatsRow: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
    },

    /* CIRCLES */
    circleBox: {
        alignItems: "center",
        width: "30%",
    },


    circleText: {
        color: "#fff",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
    },


    /* SECTION TITLE */
    sectionTitleSmall: {
        color: "#FFFFFF",
        fontSize: 16,
        marginBottom: 10,
        marginRight: 20,
        marginTop: 20,
        fontFamily: "Tajawal-Bold",
    },

    /* ALERT CARD */
    card: {
        backgroundColor: "#103A78",
        marginHorizontal: 16,
        marginTop: 8,
        padding: 16,
        borderRadius: 16,
        borderColor: "#234C8A",
        borderWidth: 1,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    },
    rowBetween: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        alignItems: "center",
    },
    alertIcon: { fontSize: 22, color: "#FFD166" },
    edit: {
        color: "#A8C6FA",
        textDecorationLine: "underline",
        fontFamily: "Tajawal-Regular",
    },

    /* MODERNE REPORT-KARTEN UNTEN */
    cardRow: {
        backgroundColor: "rgba(255,255,255,0.07)",
        borderRadius: 16,
        marginBottom: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderLeftWidth: 6,
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    cardRowContent: {
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "space-between",
    },
    cardStatusText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontFamily: "Tajawal-Bold",
        width: 120,
        textAlign: "center",
    },
    cardDate: {
        color: "#A8C6FA",
        fontSize: 14,
        fontFamily: "Tajawal-Regular",
        textAlign: "center",
        width: 100,
    },
    cardNumber: {
        color: "#FFFFFF",
        fontSize: 16,
        fontFamily: "Tajawal-Bold",
        textAlign: "center",
        width: 110,
    },
    circle: {
        width: 85,
        height: 85,
        borderRadius: 50,
        borderWidth: 6,
        justifyContent: "center",
        alignItems: "center",
    },
});