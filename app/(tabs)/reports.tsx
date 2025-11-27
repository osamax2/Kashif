// app/(tabs)/reports.tsx
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
    Category,
    lookupAPI,
    Report,
    reportingAPI,
    ReportStatus,
    Severity
} from "@/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
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

// Status-Konfiguration: Icon + Farbe (wird aus Backend geladen)
const getStatusMeta = (statusName: string, language: string): { icon: string; color: string } => {
    const statusMapAr: { [key: string]: { icon: string; color: string } } = {
        "مفتوح": { icon: "🔍", color: "#4DA3FF" },
        "قيد المراجعة": { icon: "⏳", color: "#FFD166" },
        "قيد المعالجة": { icon: "🔧", color: "#FF9500" },
        "تم الإصلاح": { icon: "✔", color: "#4CD964" },
        "مرفوض": { icon: "✖", color: "#FF3B30" },
    };
    const statusMapEn: { [key: string]: { icon: string; color: string } } = {
        "open": { icon: "🔍", color: "#4DA3FF" },
        "under review": { icon: "⏳", color: "#FFD166" },
        "in progress": { icon: "🔧", color: "#FF9500" },
        "resolved": { icon: "✔", color: "#4CD964" },
        "rejected": { icon: "✖", color: "#FF3B30" },
    };
    const statusMap = language === 'ar' ? statusMapAr : statusMapEn;
    return statusMap[statusName.toLowerCase()] || { icon: "📋", color: "#8E8E93" };
};

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
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const [reports, setReports] = useState<Report[]>([]);
    const [statuses, setStatuses] = useState<ReportStatus[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [severities, setSeverities] = useState<Severity[]>([]);
    const [selected, setSelected] = useState<Report | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Statistiken
    const [stats, setStats] = useState({
        open: 0,
        inProgress: 0,
        resolved: 0,
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            // Parallel laden für bessere Performance
            const [reportsData, statusesData, categoriesData, severitiesData] = await Promise.all([
                reportingAPI.getMyReports(0, 1000).catch(() => []),
                lookupAPI.getStatuses().catch(() => []),
                lookupAPI.getCategories().catch(() => []),
                lookupAPI.getSeverities().catch(() => []),
            ]);

            setReports(reportsData);
            setStatuses(statusesData);
            setCategories(categoriesData);
            setSeverities(severitiesData);

            // Statistiken berechnen
            calculateStats(reportsData, statusesData);
        } catch (error) {
            console.error('Error loading reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (reportsData: Report[], statusesData: ReportStatus[]) => {
        const statusMap = new Map(statusesData.map(s => [s.id, s.name]));
        
        let open = 0;
        let inProgress = 0;
        let resolved = 0;

        reportsData.forEach(report => {
            const statusName = statusMap.get(report.status_id);
            if (statusName === "مفتوح") open++;
            else if (statusName === "قيد المراجعة" || statusName === "قيد المعالجة") inProgress++;
            else if (statusName === "تم الإصلاح") resolved++;
        });

        const total = reportsData.length || 1;
        setStats({
            open: Math.round((open / total) * 100),
            inProgress: Math.round((inProgress / total) * 100),
            resolved: Math.round((resolved / total) * 100),
        });
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const openDetails = (report: Report) => {
        setSelected(report);
        setDetailVisible(true);
    };

    const closeDetails = () => {
        setDetailVisible(false);
        setSelected(null);
    };

    const getStatusName = (statusId: number): string => {
        const status = statuses.find(s => s.id === statusId);
        return status?.name || "غير معروف";
    };

    const getCategoryName = (categoryId: number): string => {
        const category = categories.find(c => c.id === categoryId);
        return category?.name || "غير معروف";
    };

    const getSeverityName = (severityId: number): string => {
        const severity = severities.find(s => s.id === severityId);
        return severity?.name || "غير معروف";
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SY', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    if (loading) {
        return (
            <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={YELLOW} />
                <Text style={{ color: '#FFFFFF', marginTop: 10, fontFamily: 'Tajawal-Regular' }}>
                    جاري تحميل البلاغات...
                </Text>
            </View>
        );
    }



    const renderReport = ({ item, index }: { item: Report; index: number }) => {
        const statusName = getStatusName(item.status_id);
        return (
            <Swipeable
                overshootLeft={false}
                overshootRight={false}
                renderRightActions={() => (
                    <View style={[styles.swipeAction, styles.swipeDetails]}>
                        <Text style={styles.swipeText}>ℹ️ تفاصيل</Text>
                    </View>
                )}
                onSwipeableRightOpen={() => openDetails(item)}
            >
                <ReportCard 
                    report={item} 
                    index={index} 
                    statusName={statusName}
                    formattedDate={formatDate(item.created_at)}
                    onPress={() => openDetails(item)}
                    language={language}
                />
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
                    marginTop: 18,
                    marginBottom: 19,
                    textAlign: "right",
                    paddingHorizontal: 29,
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
                <CircleStat percent={stats.open} label="البلاغات المفتوحة" color="#4DA3FF" />
                <CircleStat percent={stats.inProgress} label="قيد المعالجة" color="#FFD166" />
                <CircleStat percent={stats.resolved} label="تم إصلاحها" color="#4CD964" />
            </View>

            {/* Überschrift Liste */}
            <View style={styles.listHeaderRow}>
                <Text style={styles.listHeaderText}>قائمة بلاغاتي</Text>
            </View>

            {/* LISTE */}
            {reports.length > 0 ? (
                <FlatList
                    data={reports}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderReport}
                    contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 }}>
                    <Ionicons name="document-text-outline" size={64} color="rgba(255,255,255,0.3)" />
                    <Text style={{ color: '#FFFFFF', fontSize: 18, marginTop: 16, fontFamily: 'Tajawal-Regular' }}>
                        لا توجد بلاغات حتى الآن
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 8, fontFamily: 'Tajawal-Regular' }}>
                        قم بإنشاء بلاغ جديد من الخريطة
                    </Text>
                </View>
            )}

            {/* DETAILS-POPUP */}
            <Modal visible={detailVisible} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalGlass}>
                        {selected && (
                            <>
                                {/* Bild */}
                                {selected.photo_urls ? (
                                    <Image 
                                        source={{ uri: selected.photo_urls.split(',')[0] }} 
                                        style={styles.modalImage} 
                                    />
                                ) : (
                                    <View style={[styles.modalImage, { backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }]}>
                                        <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.3)" />
                                    </View>
                                )}

                                {/* Titel */}
                                <Text style={styles.modalTitle}>
                                    {selected.title || getCategoryName(selected.category_id)}
                                </Text>

                                {/* Status */}
                                <View style={styles.modalStatusRow}>
                                    <Text
                                        style={[
                                            styles.modalStatusIcon,
                                            { color: getStatusMeta(getStatusName(selected.status_id), language).color },
                                        ]}
                                    >
                                        {getStatusMeta(getStatusName(selected.status_id), language).icon}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.modalStatusText,
                                            { color: getStatusMeta(getStatusName(selected.status_id), language).color },
                                        ]}
                                    >
                                        {getStatusName(selected.status_id)}
                                    </Text>
                                </View>

                                {/* ID + Datum */}
                                <View style={styles.modalMetaRow}>
                                    <Text style={styles.modalMetaText}>
                                        رقم البلاغ: {selected.id}
                                    </Text>
                                    <Text style={styles.modalMetaText}>
                                        التاريخ: {formatDate(selected.created_at)}
                                    </Text>
                                </View>

                                {/* Kategorie + Schweregrad */}
                                <View style={styles.modalMetaRow}>
                                    <Text style={styles.modalMetaText}>
                                        الفئة: {getCategoryName(selected.category_id)}
                                    </Text>
                                    <Text style={styles.modalMetaText}>
                                        الخطورة: {getSeverityName(selected.severity_id)}
                                    </Text>
                                </View>

                                {/* Adresse */}
                                {selected.address_text && (
                                    <Text style={[styles.modalMetaText, { marginBottom: 10 }]}>
                                        📍 {selected.address_text}
                                    </Text>
                                )}

                                {/* Beschreibung */}
                                <Text style={styles.modalDescription}>
                                    {selected.description}
                                </Text>

                                {/* Mini-Map */}
                                <View style={styles.miniMapContainer}>
                                    <MapView
                                        style={styles.miniMap}
                                        initialRegion={{
                                            latitude: parseFloat(selected.latitude.toString()),
                                            longitude: parseFloat(selected.longitude.toString()),
                                            latitudeDelta: 0.01,
                                            longitudeDelta: 0.01,
                                        }}
                                    >
                                        <Marker
                                            coordinate={{ 
                                                latitude: parseFloat(selected.latitude.toString()), 
                                                longitude: parseFloat(selected.longitude.toString()) 
                                            }}
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
                        statusName,
                        formattedDate,
                        onPress,
                        language,
                    }: {
    report: Report;
    index: number;
    statusName: string;
    formattedDate: string;
    onPress: () => void;
    language: string;
}) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            delay: index * 60,
        }).start();
    }, []);

    const meta = getStatusMeta(statusName, language);

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
                        <Text style={styles.reportId}>#{report.id}</Text>
                        <Text style={styles.reportDate}>{formattedDate}</Text>
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
                            {statusName}
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
        flex: 2,
        backgroundColor: BLUE,
        paddingTop: Platform.OS === "ios" ? 48 : 45,
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
        paddingHorizontal: 10,
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
