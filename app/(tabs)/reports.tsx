// app/(tabs)/reports.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    FlatList,
    Image,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import MapView, { Marker } from "react-native-maps";

const BLUE = "#0D2B66";
const CARD_BG = "rgba(255,255,255,0.06)";
const CARD_BORDER = "rgba(255,255,255,0.18)";
const YELLOW = "#F4B400";

// Status-Konfiguration: Icon + Farbe
const STATUS_META: {
    [key: string]: { icon: string; color: string };
} = {
    "مفتوح": { icon: "🔍", color: "#4DA3FF" },
    "تم الإصلاح": { icon: "✔", color: "#4CD964" },
    "قيد المراجعة": { icon: "⏳", color: "#FFD166" },
};

// Beispiel-Daten
const INITIAL_DATA = [
    {
        id: "1239878",
        date: "10.11.2024",
        status: "مفتوح",
        title: "حفرة كبيرة في الشارع الرئيسي",
        description:
            "حفرة عميقة أمام السوق، تسبب خطراً على السيارات والمشاة. تم الإبلاغ عنها صباح اليوم.",
        image: require("../../assets/images/example-report.jpg"),

    },
    {
        id: "6676434",
        date: "12.05.2022",
        status: "تم الإصلاح",
        title: "إشارة مرور معطلة",
        description:
            "إشارة المرور عند التقاطع الرئيسي كانت متوقفة عن العمل، وتم إصلاحها من قبل البلدية.",
        image: require("../../assets/images/example-report.jpg"),

    },
    {
        id: "1234567",
        date: "01.12.2021",
        status: "قيد المراجعة",
        title: "كاميرا سرعة غير واضحة",
        description:
            "كاميرا السرعة الجديدة لا تظهر بشكل واضح للسائقين، وتم إرسال البلاغ للمراجعة.",
        image: require("../../assets/images/example-report.jpg"),
        alignItems: "left",
    },
];

// kleine Komponente für die Prozent-Kreise
type CircleStatProps = {
    percent: number;
    label: string;
    color: string;
};

function CircleStat({ percent, label, color }: CircleStatProps) {
    return (
        <View style={{ alignItems: "center", width: 100 }}>
            <View
                style={{
                    width: 90,
                    height: 90,
                    borderRadius: 50,
                    borderWidth: 6,
                    borderColor: color,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <Text style={{ color: "#fff", fontSize: 22, fontFamily: "Tajawal-Bold" }}>
                    {percent}%
                </Text>
            </View>

            <Text
                style={{
                    color: "#fff",
                    fontSize: 13,
                    textAlign: "center",
                    marginTop: 5,
                    fontFamily: "Tajawal-Regular",
                }}
            >
                {label}
            </Text>
        </View>
    );
}

export default function ReportsScreen() {
    const router = useRouter();
    const [reports, setReports] = useState(INITIAL_DATA);
    const [selected, setSelected] = useState<any | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);

    const openDetails = (report: any) => {
        setSelected(report);
        setDetailVisible(true);
    };

    const closeDetails = () => {
        setDetailVisible(false);
        setSelected(null);
    };



    const renderReport = ({ item, index }: { item: any; index: number }) => {
        return (
            <Swipeable
                overshootLeft={false}
                overshootRight={false}
                renderRightActions={() => (
                    <View style={[styles.swipeAction, styles.swipeDetails]}>
                        <Text style={styles.swipeText}>ℹ️ تفاصيل</Text>
                    </View>
                )}
                onSwipeableRightOpen={() => router.push("/report-list")}
            >
                <ReportCard report={item} index={index} onPress={() => router.push("/report-list")} />
            </Swipeable>
        );
    };

    return (
        <View style={styles.root}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.bellBtn}
                    activeOpacity={0.85}
                    onPress={() => router.push("/notifications")}
                    accessibilityLabel="فتح الإشعارات"
                    accessibilityRole="button"
                >
                    <Ionicons name="notifications" size={22} color={BLUE} />
                </TouchableOpacity>

                <Text numberOfLines={1} style={styles.headerTitle}>البلاغات</Text>

                {/* Back icon (wie im Profil) */}
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-forward" size={30} color={YELLOW} />
                </TouchableOpacity>
            </View>

            {/* إحصائيات بلاغاتي */}
            <Text
                style={{
                    color: "#FFD166",
                    fontSize: 18,
                    fontFamily: "Tajawal-Bold",
                    marginTop: 10,
                    marginBottom: 10,
                    textAlign: "right",
                    paddingHorizontal: 20,
                }}
            >
                <Text style={styles.listHeaderText}>إحصائيات بلاغاتي</Text>
            </Text>

            {/* Drei Kreise */}
            <View
                style={{
                    flexDirection: "row-reverse",
                    justifyContent: "space-between",
                    paddingHorizontal: 20,
                    marginBottom: 10,
                }}
            >
                <CircleStat percent={90} label="البلاغات المقترحة" color="#7A8BFF" />
                <CircleStat percent={40} label="البلاغات قيد المعالجة" color="#FF7777" />
                <CircleStat percent={64} label="تم إصلاحها" color="#4ADE80" />
            </View>

            {/* Überschrift Liste */}
            <View style={styles.listHeaderRow}>
                <Text style={styles.listHeaderText}>قائمة بلاغاتي</Text>
            </View>

            {/* LISTE */}
            <FlatList
                data={reports}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                renderItem={renderReport}
                contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
                showsVerticalScrollIndicator={false}
            />

            {/* DETAILS-POPUP */}
            <Modal visible={detailVisible} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalGlass}>
                        {selected && (
                            <>
                                {/* Bild */}
                                <Image source={selected.image} style={styles.modalImage} />

                                {/* Titel */}
                                <Text style={styles.modalTitle}>{selected.title}</Text>

                                {/* Status */}
                                <View style={styles.modalStatusRow}>
                                    <Text
                                        style={[
                                            styles.modalStatusIcon,
                                            { color: STATUS_META[selected.status].color },
                                        ]}
                                    >
                                        {STATUS_META[selected.status].icon}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.modalStatusText,
                                            { color: STATUS_META[selected.status].color },
                                        ]}
                                    >
                                        {selected.status}
                                    </Text>
                                </View>

                                {/* ID + Datum */}
                                <View style={styles.modalMetaRow}>
                                    <Text style={styles.modalMetaText}>
                                        رقم البلاغ: {selected.id}
                                    </Text>
                                    <Text style={styles.modalMetaText}>
                                        التاريخ: {selected.date}
                                    </Text>
                                </View>

                                {/* Beschreibung */}
                                <Text style={styles.modalDescription}>
                                    {selected.description}
                                </Text>

                                {/* Mini-Map */}
                                <View style={styles.miniMapContainer}>
                                    <MapView
                                        style={styles.miniMap}
                                        initialRegion={{
                                            latitude: 33.5138,
                                            longitude: 36.2765,
                                            latitudeDelta: 0.01,
                                            longitudeDelta: 0.01,
                                        }}
                                    >
                                        <Marker
                                            coordinate={{ latitude: 33.5138, longitude: 36.2765 }}
                                        >
                                            <Text style={{ fontSize: 28 }}>📍</Text>
                                        </Marker>
                                    </MapView>
                                </View>

                                {/* Close Button */}
                                <Pressable style={styles.modalButton} onPress={closeDetails}>
                                    <Text style={styles.modalButtonText}>إغلاق</Text>
                                </Pressable>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

/* ---------- EINZELNE KARTE MIT ANIMATION & GLAS ---------- */

function ReportCard({
                        report,
                        index,
                        onPress,
                    }: {
    report: any;
    index: number;
    onPress: () => void;
}) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            delay: index * 60,
        }).start();
    }, []);

    const meta = STATUS_META[report.status];

    return (
        <Animated.View
            style={[
                styles.cardAnimated,
                {
                    opacity: anim,
                    transform: [
                        {
                            translateY: anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [16, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
                <View
                    style={[
                        styles.reportCard,
                        { borderRightColor: meta.color, shadowColor: meta.color },
                    ]}
                >
                    {/* rechte Seite = ID + Datum (untereinander) */}
                    <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.reportId}>{report.id}</Text>
                        <Text style={styles.reportDate}>{report.date}</Text>
                    </View>

                    {/* linke Seite = Icon + Status (nebeneinander) */}
                    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                        <View
                            style={[
                                styles.statusBubble,
                                { backgroundColor: meta.color + "22" },
                            ]}
                        >
                            <Text style={[styles.statusIcon, { color: meta.color }]}>
                                {meta.icon}
                            </Text>
                        </View>

                        <Text style={[styles.statusText, { color: meta.color }]}>
                            {report.status}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BLUE,
        paddingTop: Platform.OS === "ios" ? 48 : 32,
    },

    /* HEADER */
    header: {
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        
    },
    headerTitle: {
        color: "#fff",
        fontSize: 24,
        fontFamily: "Tajawal-Bold",
        flex: 1,
        textAlign: "center",
    },
    bellBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: YELLOW,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 3,
    },
    iconBtn: {
        padding: 6,
        width: 44,
        height: 44,
        justifyContent: "center",
        alignItems: "center",
    },

    listHeaderRow: {
        paddingHorizontal: 20,
        marginTop: 4,
        marginBottom: 4,
        alignItems: "flex-start",
    },
    listHeaderText: {
        color: "#FFD166",
        fontSize: 16,
        fontFamily: "Tajawal-Bold",
        textAlign: "left",
    },

    /* Card / Glass */
    cardAnimated: {
        marginHorizontal: 16,
        marginVertical: 8,
    },

    reportCard: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderRadius: 20,
        backgroundColor: CARD_BG,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRightWidth: 6,
        shadowOpacity: 0.4,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },

    cardRight: {
        flexDirection: "row-reverse",
        alignItems: "center",
        gap: 10,
    },

    statusBubble: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: "center",
        alignItems: "center",
    },

    statusIcon: {
        fontSize: 24,
    },

    statusText: {
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
        color: "#fff",
    },

    cardLeft: {
        alignItems: "flex-start",
    },

    reportId: {
        color: "#fff",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
    },

    reportDate: {
        color: "#d0d7ea",
        fontSize: 13,
        marginTop: 2,
        fontFamily: "Tajawal-Regular",
    },

    /* Swipe-Actions */
    swipeAction: {
        justifyContent: "center",
        alignItems: "center",
        width: 90,
        marginVertical: 8,
        borderRadius: 18,
    },
    swipeDelete: {
        backgroundColor: "#FF3B30",
    },
    swipeDetails: {
        backgroundColor: "#5856D6",
    },
    swipeText: {
        color: "#fff",
        fontFamily: "Tajawal-Bold",
        fontSize: 14,
    },

    /* Modal / Details */
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.65)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },

    modalGlass: {
        width: "100%",
        borderRadius: 22,
        padding: 16,
        backgroundColor: "rgba(15,37,80,0.95)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.18)",
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 14,
    },

    modalImage: {
        width: "100%",
        height: 200,
        borderRadius: 18,
        marginBottom: 12,
    },

    modalTitle: {
        color: "#fff",
        fontSize: 20,
        fontFamily: "Tajawal-Bold",
        marginBottom: 6,
        textAlign: "left",
    },

    modalStatusRow: {
        flexDirection: "row-reverse",
        alignItems: "center",
        marginBottom: 8,
        gap: 8,
    },

    modalStatusIcon: {
        fontSize: 23,
        alignItems: "center",
    },

    modalStatusText: {
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
    },

    modalMetaRow: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        marginBottom: 10,
    },

    modalMetaText: {
        color: "#ccc",
        fontSize: 14,
        fontFamily: "Tajawal-Regular",
    },

    modalDescription: {
        color: "#fff",
        fontSize: 15,
        fontFamily: "Tajawal-Regular",
        marginBottom: 16,
        textAlign: "left",
    },

    miniMapContainer: {
        height: 160,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 16,
    },

    miniMap: {
        flex: 1,
    },

    modalButton: {
        backgroundColor: "#FFD166",
        paddingVertical: 10,
        borderRadius: 16,
        alignItems: "center",
    },

    modalButtonText: {
        color: BLUE,
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
    },
});
