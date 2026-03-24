// app/(tabs)/reports.tsx
import DonationModal from "@/components/DonationModal";
import Header from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    FlatList,
    Image,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
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

// Status-Konfiguration: Icon + Farbe
const STATUS_META: {
    [key: string]: { icon: string; color: string };
} = {
    "مفتوح": { icon: "🔍", color: "#4DA3FF" },
    "Vekirî": { icon: "🔍", color: "#4DA3FF" },
    "تم الإصلاح": { icon: "✔", color: "#4CD964" },
    "Çareserkirî": { icon: "✔", color: "#4CD964" },
    "قيد المراجعة": { icon: "⏳", color: "#FFD166" },
    "Di nirxandinê de": { icon: "⏳", color: "#FFD166" },
};

// Beispiel-Daten
const INITIAL_DATA = [
    {
        id: "1239878",
        date: "10.11.2024",
        time: "٣:٥٢ م", 
        status: "مفتوح",
        title: "حفرة كبيرة في الشارع الرئيسي",
        short:"حفرة كبيرة",
        description:
            "حفرة عميقة أمام السوق، تسبب خطراً على السيارات والمشاة. تم الإبلاغ عنها صباح اليوم.",
        image: require("../assets/images/example-report.jpg"),

    },
    {
        id: "1239878",
        date: "10.11.2024",
        time: "٣:٥٢ م", 
        status: "مفتوح",
        title: "حفرة كبيرة في الشارع الرئيسي",
        short:"حفرة كبيرة",
        description:
            "حفرة عميقة أمام السوق، تسبب خطراً على السيارات والمشاة. تم الإبلاغ عنها صباح اليوم.",
        image: require("../assets/images/example-report.jpg"),

    },
{
        id: "1239878",
        date: "10.11.2024",
        time: "٣:٥٢ م", 
        status: "مفتوح",
        title: "حفرة كبيرة في الشارع الرئيسي",
        short:"حفرة كبيرة",
        description:
            "حفرة عميقة أمام السوق، تسبب خطراً على السيارات والمشاة. تم الإبلاغ عنها صباح اليوم.",
        image: require("../assets/images/example-report.jpg"),

    },
{
        id: "1239878",
        date: "10.11.2024",
        time: "٣:٥٢ م", 
        status: "مفتوح",
        title: "حفرة كبيرة في الشارع الرئيسي",
        short:"حفرة كبيرة",
        description:
            "حفرة عميقة أمام السوق، تسبب خطراً على السيارات والمشاة. تم الإبلاغ عنها صباح اليوم.",
        image: require("../assets/images/example-report.jpg"),

    },
{
        id: "1239878",
        date: "10.11.2024",
        time: "٣:٥٢ م", 
        status: "مفتوح",
        title: "حفرة كبيرة في الشارع الرئيسي",
        short:"حفرة كبيرة",
        description:
            "حفرة عميقة أمام السوق، تسبب خطراً على السيارات والمشاة. تم الإبلاغ عنها صباح اليوم.",
        image: require("../assets/images/example-report.jpg"),

    },

];

// kleine Komponente für die Prozent-Kreise
function CircleStat({ percent, label, color }: { percent: number; label: string; color: string }) {
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
    const { isRTL } = useLanguage();
    const [reports, setReports] = useState(INITIAL_DATA);
    const [selected, setSelected] = useState<any | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [donationModalVisible, setDonationModalVisible] = useState(false);

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
                        <Text style={styles.swipeText}>{language === 'ar' ? 'ℹ️ تفاصيل' : language === 'ku' ? 'ℹ️ Hûrgulî' : 'ℹ️ Details'}</Text>
                    </View>
                )}
                onSwipeableRightOpen={() => openDetails(item)}
            >
                <ReportCard report={item} index={index} onPress={() => openDetails(item)} />
            </Swipeable>
        );
    };

    return (
        <View style={styles.root}>
            {/* HEADER */}
            <Header
<<<<<<< HEAD
                title="البلاغات المفتوحة"
=======
                title={language === 'ar' ? 'البلاغات المفتوحة' : language === 'ku' ? 'Raporên vekirî' : 'Open Reports'}
>>>>>>> feature/Ku_feature
                leftIcon={!isRTL ? "chevron-back" : undefined}
                rightIcon={isRTL ? "chevron-forward" : undefined}
                onLeftPress={() => router.back()}
                onRightPress={() => router.back()}
            />

            
            
            

            {/* Überschrift Liste */}
            <View style={styles.listHeaderRow}>
                <Text style={styles.listHeaderText}>{language === 'ar' ? 'قائمة بلاغاتي' : language === 'ku' ? 'Lîsteya raporên min' : 'My Reports List'}</Text>
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
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                    >
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
                                        {language === 'ar' ? 'رقم البلاغ:' : language === 'ku' ? 'Hejmara raporê:' : 'Report ID:'} {selected.id}
                                    </Text>
                                    <Text style={styles.modalMetaText}>
                                        {language === 'ar' ? 'التاريخ:' : language === 'ku' ? 'Dîrok:' : 'Date:'} {selected.date}
                                    </Text>
                                </View>

                                {/* Beschreibung */}
                                <Text style={styles.modalDescription}>
                                    {selected.description}
                                </Text>

                                {/* Mini-Map */}
                                <View style={styles.miniMapContainer} pointerEvents="none">
                                    <MapView
                                        style={styles.miniMap}
                                        scrollEnabled={false}
                                        zoomEnabled={false}
                                        rotateEnabled={false}
                                        pitchEnabled={false}
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

                                {/* WhatsApp Share Button */}
                                <Pressable
                                    style={styles.whatsappButton}
                                    onPress={() => {
<<<<<<< HEAD
                                        const msg = `🚨 *بلاغ كاشف*\n\n📋 *العنوان:* ${selected.title}\n📝 *الوصف:* ${selected.description}\n🔢 *رقم البلاغ:* ${selected.id}\n📅 *التاريخ:* ${selected.date}\n📌 *الحالة:* ${selected.status}\n\n📍 *الموقع:*\nhttps://www.google.com/maps?q=33.5138,36.2765`;
                                        const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
                                        Linking.openURL(url).catch(() => {
                                            alert('WhatsApp غير مثبت على هذا الجهاز');
                                        });
                                    }}
                                >
                                    <Text style={styles.whatsappButtonText}>مشاركة عبر واتساب</Text>
=======
                                        const msg = language === 'ar' 
                                            ? `🚨 *بلاغ كاشف*\n\n📋 *العنوان:* ${selected.title}\n📝 *الوصف:* ${selected.description}\n🔢 *رقم البلاغ:* ${selected.id}\n📅 *التاريخ:* ${selected.date}\n📌 *الحالة:* ${selected.status}\n\n📍 *الموقع:*\nhttps://www.google.com/maps?q=33.5138,36.2765`
                                            : language === 'ku'
                                            ? `🚨 *Raporek Kashif*\n\n📋 *Sernav:* ${selected.title}\n📝 *Danasîn:* ${selected.description}\n🔢 *Hejmara raporê:* ${selected.id}\n📅 *Dîrok:* ${selected.date}\n📌 *Rewş:* ${selected.status}\n\n📍 *Cih:*\nhttps://www.google.com/maps?q=33.5138,36.2765`
                                            : `🚨 *Kashif Report*\n\n📋 *Title:* ${selected.title}\n📝 *Description:* ${selected.description}\n🔢 *Report ID:* ${selected.id}\n📅 *Date:* ${selected.date}\n📌 *Status:* ${selected.status}\n\n📍 *Location:*\nhttps://www.google.com/maps?q=33.5138,36.2765`;
                                        const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
                                        Linking.openURL(url).catch(() => {
                                            alert(language === 'ar' ? 'WhatsApp غير مثبت على هذا الجهاز' : language === 'ku' ? 'WhatsApp li ser vê cîhazê nehati sazkirin' : 'WhatsApp is not installed on this device');
                                        });
                                    }}
                                >
                                    <Text style={styles.whatsappButtonText}>{language === 'ar' ? 'مشاركة عبر واتساب' : language === 'ku' ? 'Parvekirina bi WhatsApp' : 'Share via WhatsApp'}</Text>
>>>>>>> feature/Ku_feature
                                </Pressable>

                                {/* Donate Button */}
                                <Pressable
                                    style={styles.donateButton}
                                    onPress={() => {
                                        setDetailVisible(false);
                                        setDonationModalVisible(true);
                                    }}
                                >
<<<<<<< HEAD
                                    <Text style={styles.donateButtonText}>❤️ تبرع</Text>
=======
                                    <Text style={styles.donateButtonText}>{language === 'ar' ? '❤️ تبرع' : language === 'ku' ? '❤️ Bexş' : '❤️ Donate'}</Text>
>>>>>>> feature/Ku_feature
                                </Pressable>

                                {/* Close Button */}
                                <Pressable style={styles.modalButton} onPress={closeDetails}>
                                    <Text style={styles.modalButtonText}>{language === 'ar' ? 'إغلاق' : language === 'ku' ? 'Bigire' : 'Close'}</Text>
                                </Pressable>
                            </>
                        )}
                    </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* DONATION MODAL */}
            <DonationModal
                visible={donationModalVisible}
                onClose={() => setDonationModalVisible(false)}
                report={selected ? {
                    id: selected.id,
                    title: selected.title,
                    repair_cost: selected.repair_cost,
                    total_donated: selected.total_donated,
                } : null}
            />
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
                        <Text style={styles.reportDate}>{report.time}</Text>
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
                 {report.short}
        
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
        marginBottom: 4,
    },
    headerTitle: {
        color: "#fff",
        fontSize: 26,
        fontFamily: "Tajawal-Bold",
    },
    bellBtn: {
        padding: 4,
    },
    bellIcon: {
        fontSize: 30,

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
        height: 160,
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
        height: 120,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 12,
    },

    miniMap: {
        flex: 1,
    },

    whatsappButton: {
        backgroundColor: "#25D366",
        paddingVertical: 10,
        borderRadius: 16,
        alignItems: "center",
        marginBottom: 10,
        flexDirection: "row-reverse",
        justifyContent: "center",
        gap: 8,
    },

    whatsappButtonText: {
        color: "#fff",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
    },

    donateButton: {
        backgroundColor: "#E91E63",
        paddingVertical: 10,
        borderRadius: 16,
        alignItems: "center",
        marginBottom: 10,
        flexDirection: "row-reverse",
        justifyContent: "center",
        gap: 8,
    },

    donateButtonText: {
        color: "#fff",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
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
