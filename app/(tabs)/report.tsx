// app/(tabs)/reports.tsx
import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    I18nManager,
} from "react-native";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const BLUE = "#0D2B66";
const YELLOW = "#F4B400";

export default function ReportsScreen() {
    return (
        <View style={styles.root}>
            {/* ░░ HEADER ░░ */}
            <View style={styles.header}>
                <TouchableOpacity>
                    <Text style={styles.back}>‹</Text>
                </TouchableOpacity>

                <Text style={styles.headerTitle}>البلاغات</Text>

                <TouchableOpacity>
                    <Text style={styles.bell}>🔔</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {/* ░░ GLASS STATS CARD ░░ */}
                <View style={styles.glassCard}>
                    <Text style={styles.glassTitle}>إحصائيات بلاغاتي</Text>

                    <View style={styles.glassStatsRow}>
                        <CircleStat
                            percent={90}
                            label="البلاغات المقترحة"
                            color="#7A8BFF"
                        />
                        <CircleStat
                            percent={40}
                            label="البلاغات قيد المعالجة"
                            color="#FF7B7B"
                        />
                        <CircleStat
                            percent={64}
                            label="البلاغات التي تم إصلاحها"
                            color="#6CFFB7"
                        />
                    </View>
                </View>

                {/* ░░ QUICK ALERT CARD ░░ */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitleSmall}>تنبيهات فورية</Text>

                    <View style={styles.rowBetween}>
                        <Text style={styles.alertIcon}>⏰</Text>
                        <TouchableOpacity>
                            <Text style={styles.edit}>تعديل</Text>
                        </TouchableOpacity>
                    </View>
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
        </View>
    );
}

/* ░░ KREIS-KOMPONENTE – CircleStat ░░ */
function CircleStat({
                        percent,
                        label,
                        color,
                    }: {
    percent: number;
    label: string;
    color: string;
}) {
    return (
        <View style={styles.circleBox}>
            <View style={[styles.circle, styles.circleGlow, { borderColor: color }]}>
                <Text style={styles.circleText}>{percent}%</Text>
            </View>
            <Text style={styles.circleLabel}>{label}</Text>
        </View>
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

/* ░░ STYLES ░░ */
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BLUE,
        direction: "rtl",
    },

    /* HEADER */
    header: {
        height: 70,
        paddingHorizontal: 20,
        backgroundColor: BLUE,
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 22,
        color: "#fff",
        fontFamily: "Tajawal-Bold",
    },
    back: { fontSize: 26, color: YELLOW },
    bell: { fontSize: 26, color: YELLOW },

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
    circle: {
        width: 85,
        height: 85,
        borderRadius: 50,
        borderWidth: 6,
        justifyContent: "center",
        alignItems: "center",
    },
    circleGlow: {
        shadowColor: "#ffffff",
        shadowOpacity: 0.7,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
        elevation: 4,
    },
    circleText: {
        color: "#fff",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
    },
    circleLabel: {
        color: "#fff",
        fontSize: 13,
        textAlign: "center",
        marginTop: 8,
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
});
