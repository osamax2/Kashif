// app/leaderboard.tsx
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { FriendLeaderboardEntry, friendsAPI } from "@/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const BLUE = "#0D2B66";
const YELLOW = "#F4B400";

export default function LeaderboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();

  const effectiveRTL = !isRTL;

  const [leaderboard, setLeaderboard] = useState<FriendLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await friendsAPI.getLeaderboard();
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn("Leaderboard fetch error:", err?.message);
      setLeaderboard([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const isArabic = language === "ar";
  const title = isArabic ? "ترتيب الأصدقاء" : "Friend Leaderboard";
  const noFriendsText = isArabic ? "لا يوجد أصدقاء بعد. أضف شخصاً من صفحة الملف الشخصي!" : "No friends yet. Add someone from your profile!";
  const errorText = isArabic ? "حدث خطأ أثناء تحميل الترتيب" : "Failed to load leaderboard";
  const retryText = isArabic ? "إعادة المحاولة" : "Retry";
  const pointsLabel = isArabic ? "نقطة" : "pts";
  const youLabel = isArabic ? "(أنت)" : "(You)";
  const backLabel = isArabic ? "العودة للملف الشخصي" : "Back to Profile";

  const getMedalColor = (rank: number) => {
    if (rank === 1) return "#FFD700";
    if (rank === 2) return "#C0C0C0";
    if (rank === 3) return "#CD7F32";
    return "#AAB3C0";
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* Header */}
      <View style={[styles.header, { flexDirection: effectiveRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={effectiveRTL ? "arrow-forward" : "arrow-back"} size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={YELLOW} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={48} color={YELLOW} />
          <Text style={styles.emptyText}>{errorText}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchLeaderboard}>
            <Text style={styles.retryText}>{retryText}</Text>
          </TouchableOpacity>
        </View>
      ) : leaderboard.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={64} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyText}>{noFriendsText}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={BLUE} style={{ marginRight: 6 }} />
            <Text style={styles.retryText}>
              {backLabel}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {leaderboard.map((entry, index) => {
            const isMe = user?.id === entry.user_id;
            const rank = entry.rank || index + 1;
            return (
              <View
                key={entry.user_id}
                style={[
                  styles.entryRow,
                  isMe && styles.entryRowMe,
                  { flexDirection: effectiveRTL ? "row-reverse" : "row" },
                ]}
              >
                {/* Rank */}
                <View style={[styles.rankContainer, { backgroundColor: rank <= 3 ? getMedalColor(rank) : "rgba(255,255,255,0.1)" }]}>
                  {rank <= 3 ? (
                    <Ionicons name="trophy" size={18} color={rank <= 3 ? BLUE : "#fff"} />
                  ) : (
                    <Text style={styles.rankNumber}>{rank}</Text>
                  )}
                </View>

                {/* Avatar & Name */}
                <View style={[styles.nameContainer, effectiveRTL ? { alignItems: "flex-end" } : {}]}>
                  <View style={{ flexDirection: effectiveRTL ? "row-reverse" : "row", alignItems: "center" }}>
                    <Ionicons name="person-circle" size={32} color={isMe ? YELLOW : "rgba(255,255,255,0.5)"} />
                    <Text style={[styles.nameText, effectiveRTL ? { marginRight: 8 } : { marginLeft: 8 }]}>
                      {entry.full_name || `User #${entry.user_id}`}
                      {isMe ? ` ${youLabel}` : ""}
                    </Text>
                  </View>
                </View>

                {/* Points */}
                <View style={[styles.pointsContainer, { flexDirection: effectiveRTL ? "row-reverse" : "row" }]}>
                  <Text style={styles.pointsValue}>{entry.total_points.toLocaleString()}</Text>
                  <Text style={styles.pointsUnit}> {pointsLabel}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BLUE,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Tajawal-Bold",
    color: "#fff",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Tajawal-Regular",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 24,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: YELLOW,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Tajawal-Medium",
    color: BLUE,
    fontWeight: "600",
  },
  list: {
    padding: 16,
  },
  entryRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  entryRowMe: {
    backgroundColor: "rgba(244,180,0,0.15)",
    borderWidth: 1,
    borderColor: "rgba(244,180,0,0.3)",
  },
  rankContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rankNumber: {
    fontSize: 14,
    fontFamily: "Tajawal-Bold",
    color: "#fff",
  },
  nameContainer: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: "center",
  },
  nameText: {
    fontSize: 15,
    fontFamily: "Tajawal-Medium",
    color: "#fff",
  },
  pointsContainer: {
    alignItems: "center",
  },
  pointsValue: {
    fontSize: 16,
    fontFamily: "Tajawal-Bold",
    color: YELLOW,
  },
  pointsUnit: {
    fontSize: 12,
    fontFamily: "Tajawal-Regular",
    color: "rgba(255,255,255,0.5)",
  },
});
