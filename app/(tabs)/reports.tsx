// app/(tabs)/reports.tsx ✅ wie index.tsx: Arabisch = LTR | Englisch = RTL (effectiveRTL = !isRTL)

import DonationModal from "@/components/DonationModal";
import { useAuth } from "@/contexts/AuthContext";
import { useDataSync } from "@/contexts/DataSyncContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Category,
  lookupAPI,
  Report,
  reportingAPI,
  ReportStatus,
  ReportStatusHistory,
  Severity,
} from "@/services/api";
import { cacheUserReports, checkConnectivity, getCachedUserReports } from "@/services/offline-service";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import MapView, { Marker } from "react-native-maps";

const BLUE = "#0D2B66";
const CARD_BG = "rgba(255,255,255,0.06)";
const CARD_BORDER = "rgba(255,255,255,0.18)";
const YELLOW = "#F4B400";
const PENDING_COLOR = "#FF9500";
const CONFIRMED_COLOR = "#4CD964";
const API_BASE_URL = "https://api.kashifroad.com";

// Helper function to get full photo URL
const getPhotoUrl = (photoUrls: string | undefined): string | null => {
  if (!photoUrls) return null;
  const firstUrl = photoUrls.split(",")[0].trim();
  if (!firstUrl) return null;
  
  // If already a full URL, return as is
  if (firstUrl.startsWith("http://") || firstUrl.startsWith("https://")) {
    return firstUrl;
  }
  
  // If relative URL starting with /uploads/, convert to /api/reports/uploads/
  if (firstUrl.startsWith("/uploads/")) {
    return `${API_BASE_URL}/api/reports${firstUrl}`;
  }
  
  // If relative URL (starts with /), prepend API base with /api/reports
  if (firstUrl.startsWith("/")) {
    return `${API_BASE_URL}/api/reports${firstUrl}`;
  }
  
  // Otherwise prepend API base with /api/reports/
  return `${API_BASE_URL}/api/reports/${firstUrl}`;
};

// Get the best image to display (annotated if available, otherwise original)
const getDisplayImageUrl = (report: { photo_urls?: string; ai_annotated_url?: string }): string | null => {
  // Prefer AI annotated image if available
  if (report.ai_annotated_url) {
    const url = report.ai_annotated_url.trim();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    // Handle /uploads/ prefix
    if (url.startsWith("/uploads/")) {
      return `${API_BASE_URL}/api/reports${url}`;
    }
    if (url.startsWith("/")) {
      return `${API_BASE_URL}/api/reports${url}`;
    }
    return `${API_BASE_URL}/api/reports/${url}`;
  }
  // Fall back to original photo
  return getPhotoUrl(report.photo_urls);
};

const getConfirmationMeta = (
  status: string
): { icon: string; color: string; label: string; labelAr: string } => {
  switch (status) {
    case "pending":
      return { icon: "⏳", color: PENDING_COLOR, label: "Pending", labelAr: "قيد الانتظار" };
    case "confirmed":
      return { icon: "✓", color: CONFIRMED_COLOR, label: "Confirmed", labelAr: "مؤكد" };
    case "expired":
      return { icon: "✗", color: "#FF3B30", label: "Expired", labelAr: "منتهي" };
    default:
      return { icon: "?", color: "#8E8E93", label: "Unknown", labelAr: "غير معروف" };
  }
};

// Translation map for backend status keys → display names
const STATUS_TRANSLATIONS: { [key: string]: { en: string; ar: string } } = {
  "new": { en: "New", ar: "جديد" },
  "open": { en: "Open", ar: "مفتوح" },
  "in_progress": { en: "In Progress", ar: "قيد المعالجة" },
  "resolved": { en: "Resolved", ar: "تم الإصلاح" },
  "rejected": { en: "Rejected", ar: "مرفوض" },
  "closed": { en: "Closed", ar: "مغلق" },
  "under review": { en: "Under Review", ar: "قيد المراجعة" },
  "being handled": { en: "In Progress", ar: "قيد المعالجة" },
  "completed": { en: "Completed", ar: "مكتمل" },
};

const CATEGORY_TRANSLATIONS: { [key: string]: { en: string; ar: string } } = {
  "infrastructure": { en: "Infrastructure", ar: "البنية التحتية" },
  "environment": { en: "Environment", ar: "البيئة" },
  "safety": { en: "Safety", ar: "السلامة" },
  "pothole": { en: "Pothole", ar: "حفرة" },
  "accident": { en: "Accident", ar: "حادث" },
  "lighting": { en: "Lighting", ar: "إضاءة" },
  "speed_camera": { en: "Speed Camera", ar: "كاشف سرعة" },
  "speedcamera": { en: "Speed Camera", ar: "كاشف سرعة" },
  "other": { en: "Other", ar: "أخرى" },
};

const SEVERITY_TRANSLATIONS: { [key: string]: { en: string; ar: string } } = {
  "low": { en: "Low", ar: "منخفضة" },
  "medium": { en: "Medium", ar: "متوسطة" },
  "high": { en: "High", ar: "عالية" },
};

const translateCategory = (name: string, language: string): string => {
  const key = name.toLowerCase().trim();
  const entry = CATEGORY_TRANSLATIONS[key];
  if (entry) return language === "ar" ? entry.ar : entry.en;
  if (/[\u0600-\u06FF]/.test(name)) return name;
  return name;
};

const translateSeverity = (name: string, language: string): string => {
  const key = name.toLowerCase().trim();
  const entry = SEVERITY_TRANSLATIONS[key];
  if (entry) return language === "ar" ? entry.ar : entry.en;
  if (/[\u0600-\u06FF]/.test(name)) return name;
  return name;
};

const translateStatus = (statusName: string, language: string): string => {
  const key = statusName.toLowerCase().trim();
  const entry = STATUS_TRANSLATIONS[key];
  if (entry) return language === "ar" ? entry.ar : entry.en;
  // Fallback: check if it's already an Arabic name
  if (/[\u0600-\u06FF]/.test(statusName)) return statusName;
  return statusName;
};

const getStatusMeta = (statusName: string, _language: string): { icon: string; color: string } => {
  const metaMap: { [key: string]: { icon: string; color: string } } = {
    "new": { icon: "🔍", color: "#4DA3FF" },
    "open": { icon: "🔍", color: "#4DA3FF" },
    "جديد": { icon: "🔍", color: "#4DA3FF" },
    "مفتوح": { icon: "🔍", color: "#4DA3FF" },
    "under review": { icon: "⏳", color: "#FFD166" },
    "قيد المراجعة": { icon: "⏳", color: "#FFD166" },
    "in_progress": { icon: "🔧", color: "#FF9500" },
    "in progress": { icon: "🔧", color: "#FF9500" },
    "being handled": { icon: "🔧", color: "#FF9500" },
    "قيد المعالجة": { icon: "🔧", color: "#FF9500" },
    "resolved": { icon: "✔", color: "#4CD964" },
    "completed": { icon: "✔", color: "#4CD964" },
    "تم الإصلاح": { icon: "✔", color: "#4CD964" },
    "مكتمل": { icon: "✔", color: "#4CD964" },
    "rejected": { icon: "✖", color: "#FF3B30" },
    "مرفوض": { icon: "✖", color: "#FF3B30" },
    "closed": { icon: "🔒", color: "#8E8E93" },
    "مغلق": { icon: "🔒", color: "#8E8E93" },
  };
  return metaMap[statusName.toLowerCase().trim()] || { icon: "📋", color: "#8E8E93" };
};

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
  const { reportId } = useLocalSearchParams<{ reportId?: string }>();
  const { user } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const { refreshKey } = useDataSync();

  // ✅ wie index.tsx
  const effectiveRTL = !isRTL;

  const [reports, setReports] = useState<Report[]>([]);
  const [statuses, setStatuses] = useState<ReportStatus[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [severities, setSeverities] = useState<Severity[]>([]);
  const [selected, setSelected] = useState<Report | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [statusHistory, setStatusHistory] = useState<ReportStatusHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [donationModalVisible, setDonationModalVisible] = useState(false);

  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0 });

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState<number | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  // Auto-open report detail when navigated via deep-link (e.g. from notification tap)
  useEffect(() => {
    if (reportId && reports.length > 0 && !loading) {
      const targetReport = reports.find((r) => r.id === Number(reportId));
      if (targetReport) {
        openDetails(targetReport);
      }
    }
  }, [reportId, reports, loading]);

  const loadData = async () => {
    try {
      setLoading(true);

      const online = await checkConnectivity();
      
      if (!online) {
        // Offline fallback: show cached user reports
        const cached = await getCachedUserReports();
        if (cached.length > 0) {
          setReports(cached as any);
          console.log(`📦 Loaded ${cached.length} cached user reports`);
        }
        setLoading(false);
        return;
      }

      const [reportsData, statusesData, categoriesData, severitiesData] = await Promise.all([
        reportingAPI.getMyReports(0, 10000).catch(() => []),
        lookupAPI.getStatuses().catch(() => []),
        lookupAPI.getCategories().catch(() => []),
        lookupAPI.getSeverities().catch(() => []),
      ]);

      setReports(reportsData);
      setStatuses(statusesData);
      setCategories(categoriesData);
      setSeverities(severitiesData);

      calculateStats(reportsData, statusesData);
      
      // Cache user reports for offline access
      if (reportsData.length > 0) {
        cacheUserReports(reportsData as any);
      }
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reportsData: Report[], statusesData: ReportStatus[]) => {
    const statusMap = new Map(statusesData.map((s) => [s.id, s.name]));

    let open = 0;
    let inProgress = 0;
    let resolved = 0;
    let other = 0;

    reportsData.forEach((report) => {
      const statusName = (statusMap.get(report.status_id) || "").toLowerCase();

      if (
        statusName.includes("مفتوح") ||
        statusName.includes("open") ||
        statusName.includes("new") ||
        statusName === "مفتوح" ||
        statusName === "open" ||
        statusName === "new"
      ) {
        open++;
      } else if (
        statusName.includes("قيد المراجعة") ||
        statusName.includes("قيد المعالجة") ||
        statusName.includes("under review") ||
        statusName.includes("in progress") ||
        statusName.includes("in_progress") ||
        statusName.includes("being handled") ||
        statusName === "قيد المراجعة" ||
        statusName === "قيد المعالجة" ||
        statusName === "under review" ||
        statusName === "in progress" ||
        statusName === "in_progress"
      ) {
        inProgress++;
      } else if (
        statusName.includes("تم الإصلاح") ||
        statusName.includes("resolved") ||
        statusName.includes("completed") ||
        statusName === "تم الإصلاح" ||
        statusName === "resolved" ||
        statusName === "completed"
      ) {
        resolved++;
      } else {
        other++;
      }
    });

    const total = reportsData.length || 1;

    setStats({
      open: Math.round((open / total) * 100),
      inProgress: Math.round((inProgress / total) * 100),
      resolved: Math.round((resolved / total) * 100),
    });

    console.log("📊 Stats:", { total: reportsData.length, open, inProgress, resolved, other });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleConfirmReport = async (reportId: number) => {
    if (confirming) return;

    try {
      setConfirming(true);
      const result = await reportingAPI.confirmReport(reportId);

      if (result.success) {
        Alert.alert(
          t("reports.confirmSuccess"),
          t("reports.confirmSuccessMessage", { points: result.points_awarded })
        );
        await loadData();
        closeDetails();
      }
    } catch (error: any) {
      console.error("Error confirming report:", error);
      Alert.alert(t("reports.confirmError"), t("reports.confirmErrorMessage"));
    } finally {
      setConfirming(false);
    }
  };

  const openDetails = (report: Report) => {
    setSelected(report);
    setDetailVisible(true);
    setHistoryExpanded(false);
    loadStatusHistory(report.id);
  };

  const loadStatusHistory = async (reportId: number) => {
    try {
      setHistoryLoading(true);
      const history = await reportingAPI.getReportHistory(reportId);
      setStatusHistory(history);
    } catch (error) {
      console.error("Error loading status history:", error);
      setStatusHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailVisible(false);
    setSelected(null);
    setStatusHistory([]);
    setHistoryExpanded(false);
  };

  const getStatusName = (statusId: number): string => {
    const raw = statuses.find((s) => s.id === statusId)?.name || "غير معروف";
    return translateStatus(raw, language);
  };
  const getCategoryName = (categoryId: number): string => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return language === "ar" ? "غير معروف" : "Unknown";
    if (language === "ar" && cat.name_ar) return cat.name_ar;
    if (language !== "ar" && cat.name_en) return cat.name_en;
    return translateCategory(cat.name, language);
  };
  const getSeverityName = (severityId: number): string => {
    const sev = severities.find((s) => s.id === severityId);
    if (!sev) return language === "ar" ? "غير معروف" : "Unknown";
    return translateSeverity(sev.name, language);
  };

  // Filtered reports based on search + filters
  const filteredReports = reports.filter((r) => {
    // Status filter
    if (activeStatusFilter !== null && r.status_id !== activeStatusFilter) return false;
    // Category filter
    if (activeCategoryFilter !== null && r.category_id !== activeCategoryFilter) return false;
    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = (r.title || '').toLowerCase();
      const desc = (r.description || '').toLowerCase();
      const addr = (r.address_text || '').toLowerCase();
      const catName = getCategoryName(r.category_id).toLowerCase();
      if (!title.includes(q) && !desc.includes(q) && !addr.includes(q) && !catName.includes(q) && !r.id.toString().includes(q)) return false;
    }
    return true;
  });

  // ✅ Datum nach echter Sprache (nicht effectiveRTL)
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === "ar" ? "ar-SY" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={YELLOW} />
        <Text style={{ color: "#FFFFFF", marginTop: 10, fontFamily: "Tajawal-Regular" }}>
          {t("reports.loading")}
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
            <Text style={styles.swipeText}>ℹ️ {t("reports.detailsButton")}</Text>
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
          effectiveRTL={effectiveRTL}
        />
      </Swipeable>
    );
  };

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={[styles.header, { flexDirection: effectiveRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name={effectiveRTL ? "chevron-forward" : "chevron-back"} size={30} color={YELLOW} />
        </TouchableOpacity>

        <Text numberOfLines={1} style={styles.headerTitle}>
          {t("reports.title")}
        </Text>

        <TouchableOpacity
          style={styles.bellBtn}
          activeOpacity={0.85}
          onPress={() => router.push("/notifications")}
          accessibilityLabel="فتح الإشعارات"
          accessibilityRole="button"
        >
          <Ionicons name="notifications" size={22} color={BLUE} />
        </TouchableOpacity>
      </View>

      {/* STATISTICS TITLE */}
      <Text
        style={{
          color: "#FFD166",
          fontSize: 18,
          fontFamily: "Tajawal-Bold",
          marginTop: 18,
          marginBottom: 19,
          textAlign: "center", // ✅ schöner und neutral
          paddingHorizontal: 29,
        }}
      >
        <Text style={styles.listHeaderText}>{t("reports.statistics")}</Text>
      </Text>

      {/* Drei Kreise */}
      <View
        style={{
          flexDirection: effectiveRTL ? "row-reverse" : "row",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          marginBottom: 10,
        }}
      >
        <CircleStat percent={stats.open} label={t("reports.openReports")} color="#4DA3FF" />
        <CircleStat percent={stats.inProgress} label={t("reports.inProgressReports")} color="#FFD166" />
        <CircleStat percent={stats.resolved} label={t("reports.resolvedReports")} color="#4CD964" />
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { flexDirection: effectiveRTL ? 'row-reverse' : 'row' }]}> 
          <Ionicons name="search" size={18} color="#8E8E93" style={{ marginHorizontal: 6 }} />
          <TextInput
            style={[styles.searchInput, { textAlign: effectiveRTL ? 'right' : 'left' }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={language === 'ar' ? 'ابحث في البلاغات...' : 'Search reports...'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#8E8E93" style={{ marginHorizontal: 4 }} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* CATEGORY FILTER */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={{ maxHeight: 38, marginBottom: 4 }}
      >
        <TouchableOpacity
          style={[styles.filterChip, activeCategoryFilter === null && styles.filterChipActive]}
          onPress={() => setActiveCategoryFilter(null)}
        >
          <Text style={[styles.filterChipText, activeCategoryFilter === null && styles.filterChipTextActive]}>
            {language === 'ar' ? 'الكل' : 'All'}
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.filterChip, activeCategoryFilter === cat.id && styles.filterChipActive]}
            onPress={() => setActiveCategoryFilter(activeCategoryFilter === cat.id ? null : cat.id)}
          >
            <Text style={[styles.filterChipText, activeCategoryFilter === cat.id && styles.filterChipTextActive]}>
              {language === 'ar' ? (cat.name_ar || cat.name) : (cat.name_en || cat.name)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* STATUS FILTER */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={{ maxHeight: 38, marginBottom: 6 }}
      >
        <TouchableOpacity
          style={[styles.filterChip, activeStatusFilter === null && styles.filterChipActive]}
          onPress={() => setActiveStatusFilter(null)}
        >
          <Text style={[styles.filterChipText, activeStatusFilter === null && styles.filterChipTextActive]}>
            {language === 'ar' ? 'كل الحالات' : 'All Statuses'}
          </Text>
        </TouchableOpacity>
        {statuses.map((st) => {
          const meta = getStatusMeta(st.name, language);
          return (
            <TouchableOpacity
              key={st.id}
              style={[styles.filterChip, activeStatusFilter === st.id && styles.filterChipActive]}
              onPress={() => setActiveStatusFilter(activeStatusFilter === st.id ? null : st.id)}
            >
              <Text style={{ fontSize: 12, marginRight: 3 }}>{meta.icon}</Text>
              <Text style={[styles.filterChipText, activeStatusFilter === st.id && styles.filterChipTextActive]}>
                {translateStatus(st.name, language)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* LIST HEADER */}
      <View
        style={[
          styles.listHeaderRow,
          { alignItems: effectiveRTL ? "flex-end" : "flex-start", flexDirection: effectiveRTL ? 'row-reverse' : 'row', justifyContent: 'space-between' },
        ]}
      >
        <Text style={[styles.listHeaderText, { textAlign: effectiveRTL ? "right" : "left" }]}>
          {t("reports.myReportsList")}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'Tajawal-Regular', paddingHorizontal: 10 }}>
          {filteredReports.length}/{reports.length}
        </Text>
      </View>

      {/* LIST */}
      {filteredReports.length > 0 ? (
        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderReport}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          getItemLayout={(_, index) => ({
            length: 88, // approximate card height
            offset: 88 * index,
            index,
          })}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40 }}>
          <Ionicons name="document-text-outline" size={64} color="rgba(255,255,255,0.3)" />
          <Text style={{ color: "#FFFFFF", fontSize: 18, marginTop: 16, fontFamily: "Tajawal-Regular" }}>
            {t("reports.noReports")}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginTop: 8, fontFamily: "Tajawal-Regular" }}>
            {t("reports.createNewReport")}
          </Text>
        </View>
      )}

      {/* DETAILS MODAL */}
      <Modal visible={detailVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalGlass}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '90%' }}>
            {selected && (
              <>
                {getDisplayImageUrl(selected) ? (
                  <View style={{ position: 'relative' }}>
                    <Image source={{ uri: getDisplayImageUrl(selected)! }} style={styles.modalImage} />
                    {selected.ai_annotated_url && (
                      <View style={styles.aiAnalyzedBadge}>
                        <Text style={styles.aiAnalyzedText}>🤖 AI</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View
                    style={[
                      styles.modalImage,
                      { backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
                    ]}
                  >
                    <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.3)" />
                  </View>
                )}

                <Text style={[styles.modalTitle, { textAlign: effectiveRTL ? "right" : "left" }]}>
                  {selected.title || getCategoryName(selected.category_id)}
                </Text>

                <View style={[styles.modalStatusRow, { flexDirection: effectiveRTL ? "row-reverse" : "row" }]}>
                  <Text style={[styles.modalStatusIcon, { color: getStatusMeta(getStatusName(selected.status_id), language).color }]}>
                    {getStatusMeta(getStatusName(selected.status_id), language).icon}
                  </Text>
                  <Text style={[styles.modalStatusText, { color: getStatusMeta(getStatusName(selected.status_id), language).color }]}>
                    {getStatusName(selected.status_id)}
                  </Text>
                </View>

                <View style={[styles.modalMetaRow, { flexDirection: effectiveRTL ? "row-reverse" : "row" }]}>
                  <Text style={styles.modalMetaText}>
                    {t("reports.reportNumber")}: {selected.id}
                  </Text>
                  <Text style={styles.modalMetaText}>
                    {t("reports.date")}: {formatDate(selected.created_at)}
                  </Text>
                </View>

                <View style={[styles.modalMetaRow, { flexDirection: effectiveRTL ? "row-reverse" : "row" }]}>
                  <Text style={styles.modalMetaText}>
                    {t("reports.category")}: {getCategoryName(selected.category_id)}
                  </Text>
                  <Text style={styles.modalMetaText}>
                    {t("reports.severity")}: {getSeverityName(selected.severity_id)}
                  </Text>
                </View>

                {selected.address_text && (
                  <Text style={[styles.modalMetaText, { marginBottom: 10, textAlign: effectiveRTL ? "right" : "left" }]}>
                    📍 {selected.address_text}
                  </Text>
                )}

                <Text style={[styles.modalDescription, { textAlign: effectiveRTL ? "right" : "left" }]}>
                  {selected.description}
                </Text>

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
                        longitude: parseFloat(selected.longitude.toString()),
                      }}
                    >
                      <Text style={{ fontSize: 28 }}>📍</Text>
                    </Marker>
                  </MapView>
                </View>

                {selected.confirmation_status && (
                  <View
                    style={[
                      styles.confirmationStatusContainer,
                      { backgroundColor: getConfirmationMeta(selected.confirmation_status).color + "22" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.confirmationStatusText,
                        { color: getConfirmationMeta(selected.confirmation_status).color },
                      ]}
                    >
                      {getConfirmationMeta(selected.confirmation_status).icon}{" "}
                      {language === "ar"
                        ? getConfirmationMeta(selected.confirmation_status).labelAr
                        : getConfirmationMeta(selected.confirmation_status).label}
                    </Text>
                    {selected.confirmation_status === "pending" && selected.user_id === user?.id && (
                      <Text style={styles.pendingHintText}>
                        {language === "ar" ? "في انتظار تأكيد من مستخدم آخر" : "Waiting for confirmation from another user"}
                      </Text>
                    )}
                    {(selected.confirmation_count || 0) > 0 && (
                      <Text style={styles.confirmationCountText}>
                        {language === "ar" 
                          ? `تم التأكيد بواسطة ${selected.confirmation_count} مستخدم${selected.confirmation_count > 1 ? 'ين' : ''}` 
                          : `Confirmed by ${selected.confirmation_count} user${selected.confirmation_count > 1 ? 's' : ''}`}
                      </Text>
                    )}
                  </View>
                )}

                {/* STATUS HISTORY TIMELINE */}
                <TouchableOpacity
                  style={styles.historyToggle}
                  onPress={() => setHistoryExpanded(!historyExpanded)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={historyExpanded ? "chevron-up" : "chevron-down"} 
                    size={18} 
                    color="#FFD166" 
                  />
                  <Text style={styles.historyToggleText}>
                    {language === "ar" ? "سجل الحالة" : "Status History"}
                  </Text>
                </TouchableOpacity>

                {historyExpanded && (
                  <View style={styles.historyContainer}>
                    {historyLoading ? (
                      <ActivityIndicator size="small" color="#FFD166" style={{ marginVertical: 10 }} />
                    ) : statusHistory.length > 0 ? (
                      statusHistory.map((entry, idx) => {
                        const newStatusName = getStatusName(entry.new_status_id);
                        const oldStatusName = entry.old_status_id ? getStatusName(entry.old_status_id) : null;
                        const meta = getStatusMeta(newStatusName, language);
                        const isLast = idx === statusHistory.length - 1;
                        const entryDate = new Date(entry.created_at);
                        const formattedTime = entryDate.toLocaleString(
                          language === "ar" ? "ar-SY" : "en-US",
                          { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }
                        );
                        
                        return (
                          <View key={entry.id} style={[styles.historyEntry, { flexDirection: effectiveRTL ? "row-reverse" : "row" }]}>
                            {/* Timeline line + dot */}
                            <View style={styles.timelineDotContainer}>
                              <View style={[styles.timelineDot, { backgroundColor: meta.color }]} />
                              {!isLast && <View style={styles.timelineLine} />}
                            </View>

                            {/* Content */}
                            <View style={[styles.historyContent, { alignItems: effectiveRTL ? "flex-end" : "flex-start" }]}>
                              <Text style={[styles.historyStatusText, { color: meta.color }]}>
                                {meta.icon} {newStatusName}
                              </Text>
                              {oldStatusName && (
                                <Text style={styles.historyFromText}>
                                  {language === "ar" ? `من: ${oldStatusName}` : `From: ${oldStatusName}`}
                                </Text>
                              )}
                              {entry.comment && (
                                <Text style={[styles.historyComment, { textAlign: effectiveRTL ? "right" : "left" }]}>
                                  {entry.comment}
                                </Text>
                              )}
                              <Text style={styles.historyDate}>{formattedTime}</Text>
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.noHistoryText}>
                        {language === "ar" ? "لا يوجد سجل للحالة" : "No status history available"}
                      </Text>
                    )}
                  </View>
                )}

                {/* WhatsApp Share Button */}
                <Pressable
                  style={styles.whatsappButton}
                  onPress={() => {
                    const title = selected.title || getCategoryName(selected.category_id);
                    const desc = selected.description || '';
                    const statusText = getStatusName(selected.status_id);
                    const lat = selected.latitude;
                    const lng = selected.longitude;
                    const msg = `🚨 *${language === 'ar' ? 'بلاغ كاشف' : 'Kashif Report'}*\n\n📋 *${language === 'ar' ? 'العنوان' : 'Title'}:* ${title}\n📝 *${language === 'ar' ? 'الوصف' : 'Description'}:* ${desc}\n🔢 *${language === 'ar' ? 'رقم البلاغ' : 'Report #'}:* ${selected.id}\n📌 *${language === 'ar' ? 'الحالة' : 'Status'}:* ${statusText}\n\n📍 *${language === 'ar' ? 'الموقع' : 'Location'}:*\nhttps://www.google.com/maps?q=${lat},${lng}`;
                    const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
                    Linking.openURL(url).catch(() => {
                      Alert.alert(language === 'ar' ? 'واتساب غير مثبت على هذا الجهاز' : 'WhatsApp is not installed on this device');
                    });
                  }}
                >
                  <Text style={styles.whatsappButtonText}>
                    {language === 'ar' ? '📱 مشاركة عبر واتساب' : '📱 Share via WhatsApp'}
                  </Text>
                </Pressable>

                {/* Donate Button */}
                <Pressable
                  style={styles.donateButton}
                  onPress={() => {
                    setDetailVisible(false);
                    setDonationModalVisible(true);
                  }}
                >
                  <Text style={styles.donateButtonText}>
                    {language === 'ar' ? '❤️ تبرع' : '❤️ Donate'}
                  </Text>
                </Pressable>

                <View style={[styles.modalButtonsRow, { flexDirection: effectiveRTL ? "row-reverse" : "row" }]}>
                  {(selected.confirmation_status === "pending" || selected.confirmation_status === "confirmed") && selected.user_id !== user?.id && (
                    <Pressable
                      style={[styles.stillThereButton, confirming && styles.buttonDisabled]}
                      onPress={() => handleConfirmReport(selected.id)}
                      disabled={confirming}
                    >
                      {confirming ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.stillThereButtonText}>✓ {t("reports.stillThere")}</Text>
                      )}
                    </Pressable>
                  )}

                  <Pressable style={[styles.modalButton, { flex: 1 }]} onPress={closeDetails}>
                    <Text style={styles.modalButtonText}>{t("reports.close")}</Text>
                  </Pressable>
                </View>
              </>
            )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DONATION MODAL */}
      <DonationModal
        visible={donationModalVisible}
        onClose={() => setDonationModalVisible(false)}
        report={selected ? {
          id: selected.id,
          title: selected.title || getCategoryName(selected.category_id),
          repair_cost: Number(selected.repair_cost || 0),
          total_donated: Number(selected.total_donated || 0),
        } : null}
      />
    </View>
  );
}

const ReportCard = React.memo(function ReportCard({
  report,
  index,
  statusName,
  formattedDate,
  onPress,
  language,
  effectiveRTL,
}: {
  report: Report;
  index: number;
  statusName: string;
  formattedDate: string;
  onPress: () => void;
  language: string;
  effectiveRTL: boolean;
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
            {
              borderRightColor: meta.color,
              shadowColor: meta.color,
              flexDirection: effectiveRTL ? "row-reverse" : "row",
            },
          ]}
        >
          {/* side A */}
          <View style={{ alignItems: effectiveRTL ? "flex-end" : "flex-start" }}>
            <Text style={styles.reportId}>#{report.id}</Text>
            <Text style={styles.reportDate}>{formattedDate}</Text>

            {report.confirmation_status && (
              <View
                style={[
                  styles.confirmationBadge,
                  { backgroundColor: getConfirmationMeta(report.confirmation_status).color + "22" },
                ]}
              >
                <Text
                  style={[
                    styles.confirmationBadgeText,
                    { color: getConfirmationMeta(report.confirmation_status).color },
                  ]}
                >
                  {getConfirmationMeta(report.confirmation_status).icon}{" "}
                  {language === "ar"
                    ? getConfirmationMeta(report.confirmation_status).labelAr
                    : getConfirmationMeta(report.confirmation_status).label}
                </Text>
              </View>
            )}
          </View>

          {/* side B */}
          <View
            style={{
              flexDirection: effectiveRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View style={[styles.statusBubble, { backgroundColor: meta.color + "22" }]}>
              <Text style={[styles.statusIcon, { color: meta.color }]}>{meta.icon}</Text>
            </View>

            <Text style={[styles.statusText, { color: meta.color, textAlign: effectiveRTL ? "right" : "left" }]}>
              {statusName}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BLUE,
    paddingTop: Platform.OS === "ios" ? 48 : 45,
  },

  searchContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
  },

  searchBar: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 38,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  searchInput: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Tajawal-Regular',
    flex: 1,
    height: 36,
    padding: 0,
  },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 6,
  },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  filterChipActive: {
    backgroundColor: 'rgba(255,209,102,0.18)',
    borderColor: '#FFD166',
  },

  filterChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Tajawal-Bold',
  },

  filterChipTextActive: {
    color: '#FFD166',
  },

  header: {
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
  },

  listHeaderText: {
    color: "#FFD166",
    fontSize: 16,
    fontFamily: "Tajawal-Bold",
    paddingHorizontal: 10,
  },

  cardAnimated: { marginHorizontal: 16, marginVertical: 8 },

  reportCard: {
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

  statusBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },

  statusIcon: { fontSize: 24 },

  statusText: {
    fontSize: 18,
    fontFamily: "Tajawal-Bold",
    color: "#fff",
  },

  confirmationBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  confirmationBadgeText: {
    fontSize: 11,
    fontFamily: "Tajawal-Bold",
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

  swipeAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    marginVertical: 8,
    borderRadius: 18,
  },

  swipeDetails: { backgroundColor: "#5856D6" },

  swipeText: {
    color: "#fff",
    fontFamily: "Tajawal-Bold",
    fontSize: 14,
  },

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

  modalImage: { width: "100%", height: 200, borderRadius: 18, marginBottom: 12 },
  
  aiAnalyzedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(88, 86, 214, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  aiAnalyzedText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Tajawal-Bold',
  },

  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Tajawal-Bold",
    marginBottom: 6,
  },

  modalStatusRow: { alignItems: "center", marginBottom: 8, gap: 8 },

  modalStatusIcon: { fontSize: 23, alignItems: "center" },

  modalStatusText: { fontSize: 18, fontFamily: "Tajawal-Bold" },

  modalMetaRow: { justifyContent: "space-between", marginBottom: 10 },

  modalMetaText: { color: "#ccc", fontSize: 14, fontFamily: "Tajawal-Regular" },

  modalDescription: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Tajawal-Regular",
    marginBottom: 16,
  },

  miniMapContainer: { height: 160, borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  miniMap: { flex: 1 },

  confirmationStatusContainer: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
  },

  confirmationStatusText: { fontSize: 16, fontFamily: "Tajawal-Bold" },

  pendingHintText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontFamily: "Tajawal-Regular",
    marginTop: 4,
  },

  confirmationCountText: {
    color: "#4CD964",
    fontSize: 13,
    fontFamily: "Tajawal-Medium",
    marginTop: 4,
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

  modalButtonsRow: { gap: 10 },

  stillThereButton: {
    backgroundColor: "#4CD964",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
  },

  stillThereButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Tajawal-Bold",
  },

  buttonDisabled: { opacity: 0.6 },

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

  // Status History Timeline styles
  historyToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginBottom: 4,
    gap: 6,
  },

  historyToggleText: {
    color: "#FFD166",
    fontSize: 15,
    fontFamily: "Tajawal-Bold",
  },

  historyContainer: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  historyEntry: {
    gap: 10,
    marginBottom: 0,
  },

  timelineDotContainer: {
    alignItems: "center",
    width: 20,
  },

  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },

  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    minHeight: 30,
  },

  historyContent: {
    flex: 1,
    paddingBottom: 12,
  },

  historyStatusText: {
    fontSize: 15,
    fontFamily: "Tajawal-Bold",
  },

  historyFromText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontFamily: "Tajawal-Regular",
    marginTop: 2,
  },

  historyComment: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontFamily: "Tajawal-Regular",
    marginTop: 3,
    fontStyle: "italic",
  },

  historyDate: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontFamily: "Tajawal-Regular",
    marginTop: 3,
  },

  noHistoryText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontFamily: "Tajawal-Regular",
    textAlign: "center",
    paddingVertical: 10,
  },
});
