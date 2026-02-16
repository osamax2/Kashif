import Header from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// ❌ WEG DAMIT (macht alles immer RTL und kaputt)
// I18nManager.allowRTL(true);
// I18nManager.forceRTL(true);

const BLUE = "#0D2B66";
const LIGHT_CARD = "rgba(255,255,255,0.09)";
const BORDER = "rgba(255,255,255,0.18)";
const YELLOW = "#F4B400";

export default function ModernNotifications() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { notifications, loading, refreshNotifications, markAsRead, markAllAsRead } =
    useNotifications();

  // ✅ WIE index.tsx: Arabisch = LTR | Englisch = RTL
  const effectiveRTL = !isRTL;

  const dir = useMemo(
    () => ({
      row: { flexDirection: effectiveRTL ? "row-reverse" : "row" } as const,
      textAlign: { textAlign: effectiveRTL ? "right" : "left" } as const,
    }),
    [effectiveRTL]
  );

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: any) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (notification.related_report_id) {
      router.push(`/(tabs)/reports?reportId=${notification.related_report_id}` as any);
    }
  };

  const clearAll = async () => {
    await markAllAsRead();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "report_status_updated":
      case "report_resolved":
        return { icon: "checkmark-circle", color: "#4ADE80" };
      case "report_in_progress":
        return { icon: "sync", color: "#60A5FA" };
      case "report_rejected":
        return { icon: "close-circle", color: "#EF4444" };
      case "points_earned":
        return { icon: "star", color: "#F4B400" };
      case "achievement":
        return { icon: "trophy", color: "#F4B400" };
      default:
        return { icon: "notifications", color: "#FFD166" };
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return t("notifications.timeAgo.justNow");
    if (minutes < 60) return t("notifications.timeAgo.minutesAgo", { minutes });
    if (hours < 24) return t("notifications.timeAgo.hoursAgo", { hours });
    if (days === 1) return t("notifications.timeAgo.yesterday");
    return t("notifications.timeAgo.daysAgo", { days });
  };

  const renderItem = ({ item }: { item: any }) => {
    const meta = getIcon(item.type);

    return (
      <TouchableOpacity onPress={() => handleNotificationPress(item)} activeOpacity={0.8}>
        <View style={[styles.card, dir.row, !item.is_read && styles.unreadCard]}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: meta.color + "22" },
              // ✅ Abstand je nach Richtung
              effectiveRTL ? { marginLeft: 14, marginRight: 0 } : { marginRight: 14, marginLeft: 0 },
            ]}
          >
            <Ionicons name={meta.icon as any} size={26} color={meta.color} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.msg, dir.textAlign, !item.is_read && styles.unreadText]}>
              {(!effectiveRTL && item.title_en) ? item.title_en : item.title}
            </Text>
            {item.body && <Text style={[styles.body, dir.textAlign]}>
              {(!effectiveRTL && item.body_en) ? item.body_en : item.body}
            </Text>}
            <Text style={[styles.time, dir.textAlign]}>{formatTime(item.created_at)}</Text>
          </View>

          {!item.is_read && (
            <View
              style={[
                styles.unreadDot,
                // ✅ Dot auf der “Außenseite”
                effectiveRTL ? { marginRight: 0, marginLeft: 8 } : { marginLeft: 0, marginRight: 8 },
              ]}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const hasUnread = notifications.some((n) => !n.is_read);

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.root}>
        <Header
          title={t("notifications.title")}
          // ✅ WIE index: Richtung invertiert
          leftIcon={effectiveRTL ? "chevron-forward" : "chevron-back"}
          onLeftPress={() => router.back()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={YELLOW} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
     <Header
  title={t("notifications.title")}
  leftIcon={!isRTL ? "chevron-back" : undefined}
  rightIcon={isRTL ? "chevron-forward" : undefined}
  onLeftPress={() => router.back()}
  onRightPress={() => router.back()}
/>



      

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={YELLOW}
            colors={[YELLOW]}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-circle" size={50} color={YELLOW} />
            <Text style={styles.emptyText}>{t("notifications.noNotifications")}</Text>
            <Text style={styles.emptySub}>{t("notifications.noNotificationsSubtitle")}</Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />

      {hasUnread && (
        <TouchableOpacity
          style={[styles.clearButton, { flexDirection: effectiveRTL ? "row-reverse" : "row" }]}
          onPress={clearAll}
          activeOpacity={0.9}
        >
          <Ionicons
            name="checkmark-done-outline"
            size={20}
            color={BLUE}
            style={effectiveRTL ? { marginLeft: 6 } : { marginRight: 6 }}
          />
          <Text style={styles.clearButtonText}>{t("notifications.markAllRead")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BLUE,
    paddingHorizontal: 20,
    paddingTop: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    alignItems: "center",
    padding: 16,
    borderRadius: 22,
    backgroundColor: LIGHT_CARD,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },

  unreadCard: {
    backgroundColor: "rgba(244, 180, 0, 0.1)",
    borderColor: "rgba(244, 180, 0, 0.3)",
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  msg: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Tajawal-Regular",
    marginBottom: 4,
  },

  unreadText: {
    fontFamily: "Tajawal-Bold",
  },

  body: {
    color: "#B9CBF2",
    fontSize: 14,
    fontFamily: "Tajawal-Regular",
    marginBottom: 4,
  },

  time: {
    color: "#B9CBF2",
    fontSize: 13,
    fontFamily: "Tajawal-Regular",
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: YELLOW,
  },

  emptyBox: {
    marginTop: 80,
    alignItems: "center",
    paddingHorizontal: 20,
  },

  emptyText: {
    marginTop: 10,
    fontSize: 18,
    color: "#fff",
    fontFamily: "Tajawal-Bold",
  },

  emptySub: {
    marginTop: 6,
    fontSize: 14,
    color: "#B9CBF2",
    fontFamily: "Tajawal-Regular",
    textAlign: "center",
  },

  clearButton: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    alignItems: "center",
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: YELLOW,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  clearButtonText: {
    color: BLUE,
    fontSize: 16,
    fontFamily: "Tajawal-Bold",
  },
});
