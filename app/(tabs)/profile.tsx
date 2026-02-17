import { useAuth } from "@/contexts/AuthContext";
import { useDataSync } from "@/contexts/DataSyncContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Achievement, achievementAPI, authAPI, challengeAPI, FriendInfo, friendsAPI, gamificationAPI, Level, lookupAPI, PointTransaction, reportingAPI, WeeklyChallenge } from "@/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const BLUE = "#0D2B66";
const YELLOW = "#F4B400";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const { refreshKey } = useDataSync();

  // ✅ WIE index.tsx: Arabisch = LTR | Englisch = RTL
  const effectiveRTL = !isRTL;

  const dir = useMemo(
    () => ({
      textAlign: (effectiveRTL ? "right" : "left") as const,
      writingDirection: (effectiveRTL ? "rtl" : "ltr") as const,
    }),
    [effectiveRTL]
  );

  const shareLink = "https://play.google.com/store/apps/details?id=com.kashif.app";
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [reportCount, setReportCount] = useState(0);
  const [levels, setLevels] = useState<Level[]>([]);
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [nextLevel, setNextLevel] = useState<Level | null>(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<WeeklyChallenge[]>([]);
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [friendIdInput, setFriendIdInput] = useState("");

  // Cache-Kontrolle: Daten nur neu laden wenn älter als 30 Sekunden
  const STALE_TIME = 30_000; // 30 Sekunden
  const lastFetchRef = useRef<number>(0);
  const isFetchingRef = useRef(false);
  const lastRefreshKeyRef = useRef(refreshKey);

  useEffect(() => {
    // Nur bei echtem refreshKey-Wechsel (neue Meldung etc.) sofort laden
    if (refreshKey !== lastRefreshKeyRef.current) {
      lastRefreshKeyRef.current = refreshKey;
      lastFetchRef.current = 0; // Cache invalidieren
      loadProfileData(true);
    } else if (isInitialLoad) {
      loadProfileData(true);
    }
  }, [refreshKey]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const isStale = now - lastFetchRef.current > STALE_TIME;

      if (isStale && !isInitialLoad) {
        refreshUser();
        loadProfileData(false);
      }
    }, [refreshUser, isInitialLoad])
  );

  const loadProfileData = async (showLoader: boolean = false) => {
    if (!user) return;

    // Verhindere parallele Fetches
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (showLoader) setLoading(true);

    try {
      const [transactionsData, reportsData, levelsData, achievementsData, challengesData, friendsData] = await Promise.all([
        gamificationAPI.getMyTransactions(0, 5).catch(() => []),
        reportingAPI.getMyReports(0, 1000).catch(() => []),
        lookupAPI.getLevels().catch(() => []),
        achievementAPI.getMyAchievements().catch(() => []),
        challengeAPI.getActive().catch(() => []),
        friendsAPI.getFriends().catch(() => []),
      ]);

      setTransactions(transactionsData);
      setReportCount(reportsData.length);
      setLevels(levelsData);
      setAchievements(achievementsData);
      setChallenges(challengesData);
      setFriends(friendsData);

      if (levelsData.length > 0) {
        const sortedLevels = [...levelsData].sort(
          (a, b) => a.min_report_number - b.min_report_number
        );

        let current = sortedLevels[0];
        let next = sortedLevels[1] || null;

        for (let i = 0; i < sortedLevels.length; i++) {
          if (reportsData.length >= sortedLevels[i].min_report_number) {
            current = sortedLevels[i];
            next = sortedLevels[i + 1] || null;
          }
        }

        setCurrentLevel(current);
        setNextLevel(next);

        if (next) {
          const currentMin = current.min_report_number;
          const nextMin = next.min_report_number;
          const progress =
            ((reportsData.length - currentMin) / (nextMin - currentMin)) * 100;
          setProgressPercentage(Math.min(Math.max(progress, 0), 100));
        } else {
          setProgressPercentage(100);
        }
      }

      lastFetchRef.current = Date.now();

      // Check for new achievements silently
      try {
        const checkResult = await achievementAPI.checkAchievements();
        if (checkResult.new_achievements.length > 0) {
          // Re-fetch achievements to get updated unlock status
          const updatedAchievements = await achievementAPI.getMyAchievements().catch(() => []);
          setAchievements(updatedAchievements);
        }
      } catch (e) {
        // Silent fail - achievements check is not critical
      }

      // Check challenges silently
      try {
        await challengeAPI.check();
        const updatedChallenges = await challengeAPI.getActive().catch(() => []);
        setChallenges(updatedChallenges);
      } catch (e) {
        // Silent fail
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
    } finally {
      isFetchingRef.current = false;
      if (showLoader) {
        setLoading(false);
        setIsInitialLoad(false);
      }
    }
  };

  // Load profile image: prefer server URL, fall back to local AsyncStorage
  useEffect(() => {
    async function loadImage() {
      // Check if the user has a server-stored profile image
      if (user?.image_url) {
        const serverUrl = user.image_url.startsWith("http")
          ? user.image_url
          : `https://api.kashifroad.com${user.image_url}`;
        setProfileImage(serverUrl);
        return;
      }
      // Fall back to local storage
      const saved = await AsyncStorage.getItem("profileImage");
      if (saved) setProfileImage(saved);
    }
    loadImage();
  }, [user?.image_url]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPendingImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPendingImage(result.assets[0].uri);
    }
  };

  const changePhoto = () => {
    Alert.alert(
      t("profile.changePhoto"),
      language === "ar" ? "اختر طريقة إضافة صورتك" : "Choose how to add your photo",
      [
        { text: t("profile.takePhoto"), onPress: takePhoto },
        { text: t("profile.chooseFromGallery"), onPress: pickImage },
        { text: t("common.cancel"), style: "cancel" },
      ]
    );
  };

  const handleShareAchievement = async () => {
    const points = user?.total_points || 0;
    const pointText = points === 1 ? t("profile.point") : t("profile.points");

    // Sprache bleibt echte Sprache (isRTL)
    const message = isRTL
      ? `🔥 إنجازي مع كاشف!\nحصلت على ${points} ${pointText}.\nحمّل التطبيق واحصل على نقاط!\n\n${shareLink}`
      : `🔥 My achievement with Kashif!\nI got ${points} ${pointText}.\nDownload the app and get points!\n\n${shareLink}`;

    try {
      await Share.share({
        message,
        url: Platform.OS === "ios" ? shareLink : undefined,
      });
    } catch (error) {
      await Clipboard.setStringAsync(message);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "report_created":
        return "add-circle";
      case "report_resolved":
        return "checkmark-circle";
      case "report_verified":
        return "shield-checkmark";
      case "redemption":
        return "gift";
      default:
        return "notifications";
    }
  };

  const getTransactionText = (transaction: PointTransaction) => {
    const points = transaction.points > 0 ? `+${transaction.points}` : transaction.points;

    switch (transaction.transaction_type) {
      case "report_created":
        return `${points} ${t("points.transactions.report_created")}`;
      case "report_resolved":
        return `${points} ${t("points.transactions.report_resolved")}`;
      case "report_verified":
        return `${points} ${t("points.transactions.report_verified")}`;
      case "redemption":
        return `${points} ${t("points.transactions.redemption")}`;
      default:
        return `${points} ${transaction.description || t("profile.points")}`;
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={YELLOW} />
        <Text style={{ color: "#FFFFFF", marginTop: 10, fontFamily: "Tajawal-Regular" }}>
          {t("profile.loadingData")}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* PHOTO PREVIEW MODAL */}
      <Modal visible={!!pendingImage} transparent animationType="fade">
        <View style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}>
          <View style={{
            backgroundColor: "#0D2B66",
            borderRadius: 24,
            padding: 24,
            alignItems: "center",
            width: "90%",
          }}>
            {pendingImage && (
              <Image
                source={{ uri: pendingImage }}
                style={{ width: 200, height: 200, borderRadius: 100, borderWidth: 3, borderColor: "#FFD166", marginBottom: 20 }}
              />
            )}
            <View style={{ flexDirection: effectiveRTL ? "row-reverse" : "row", gap: 16 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: YELLOW,
                  paddingVertical: 12,
                  paddingHorizontal: 36,
                  borderRadius: 14,
                  elevation: 4,
                  opacity: uploadingPhoto ? 0.6 : 1,
                }}
                disabled={uploadingPhoto}
                onPress={async () => {
                  if (pendingImage) {
                    setUploadingPhoto(true);
                    try {
                      // Upload to server
                      const result = await authAPI.uploadProfilePicture(pendingImage);
                      const serverUrl = result.image_url.startsWith("http")
                        ? result.image_url
                        : `https://api.kashifroad.com${result.image_url}`;
                      setProfileImage(serverUrl);
                      // Clear old local storage
                      await AsyncStorage.removeItem("profileImage");
                      // Refresh user data to get updated image_url
                      await refreshUser();
                      setPendingImage(null);
                    } catch (error: any) {
                      console.error("Error uploading profile picture:", error);
                      // Fall back to local storage
                      setProfileImage(pendingImage);
                      await AsyncStorage.setItem("profileImage", pendingImage);
                      setPendingImage(null);
                      Alert.alert(
                        language === "ar" ? "تنبيه" : "Notice",
                        language === "ar" 
                          ? "تم حفظ الصورة محلياً. سيتم رفعها لاحقاً." 
                          : "Photo saved locally. It will be uploaded later."
                      );
                    } finally {
                      setUploadingPhoto(false);
                    }
                  }
                }}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontSize: 18, fontFamily: "Tajawal-Bold" }}>
                    {t("common.save")}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: "rgba(255,255,255,0.15)",
                  paddingVertical: 12,
                  paddingHorizontal: 36,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.3)",
                }}
                onPress={() => setPendingImage(null)}
              >
                <Text style={{ color: "#fff", fontSize: 18, fontFamily: "Tajawal-Bold" }}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* HEADER */}
      <View style={[styles.header, { marginTop: 40, flexDirection: "row" }]}>
        {/* LEFT */}
        <TouchableOpacity
          onPress={isRTL ? () => router.back() : () => router.push("/settings")}
          style={styles.iconBtn}
        >
          <Ionicons
            name={isRTL ? "chevron-forward" : "settings-sharp"}
            size={isRTL ? 30 : 28}
            color={YELLOW}
          />
        </TouchableOpacity>

        <Text numberOfLines={1} style={styles.headerTitle}>
          {t("profile.title")}
        </Text>

        {/* RIGHT */}
        <TouchableOpacity
          onPress={isRTL ? () => router.push("/settings") : () => router.back()}
          style={styles.iconBtn}
        >
          <Ionicons
            name={isRTL ? "settings-sharp" : "chevron-forward"}
            size={isRTL ? 28 : 30}
            color={YELLOW}
          />
        </TouchableOpacity>
      </View>

      {/* PHOTO */}
      <View style={styles.photoWrapper}>
        <TouchableOpacity onPress={changePhoto}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.emptyPhoto}>
              <Ionicons name="camera" size={36} color="#FFD166" />
            </View>
          )}

          <View style={[styles.editBadge, effectiveRTL ? { left: 5, right: undefined } : { right: 5 }]}>
            <Ionicons name="pencil" size={16} color="#0D2B66" />
          </View>
        </TouchableOpacity>
      </View>

      {/* USER */}
      <Text style={styles.userName}>{user?.full_name || "مستخدم"}</Text>
      <Text style={styles.userEmail}>{user?.email || ""}</Text>

      {/* PROGRESS */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
      </View>

      <Text style={styles.pointsText}>
        {user?.total_points || 0} {t("profile.point")} <Text style={{ fontSize: 20 }}>🏅</Text>
      </Text>

      <Text style={styles.levelText}>
        {currentLevel?.name || t("profile.level")}{" "}
        {nextLevel ? `(${Math.round(progressPercentage)}% ${t("profile.progressTo")} ${nextLevel.name})` : "🚀"}
      </Text>

      {/* STATS */}
      <View style={[styles.statsRow, { flexDirection: effectiveRTL ? "row-reverse" : "row" }]}>
        <View style={styles.statBox}>
          <Ionicons name="star" size={28} color={YELLOW} />
          <Text style={styles.statNumber}>{user?.total_points || 0}</Text>
          <Text style={styles.statLabel}>{t("profile.points")}</Text>
        </View>

        <View style={styles.statBox}>
          <Ionicons name="rocket" size={28} color={YELLOW} />
          <Text style={styles.statNumber}>{currentLevel?.id || 1}</Text>
          <Text style={styles.statLabel}>{t("profile.level")}</Text>
        </View>

        <TouchableOpacity style={styles.statBox} onPress={() => router.push("/(tabs)/reports")}>
          <Ionicons name="bar-chart" size={28} color={YELLOW} />
          <Text style={styles.statNumber}>{reportCount}</Text>
          <Text style={styles.statLabel}>{t("profile.reports")}</Text>
        </TouchableOpacity>
      </View>

      {/* ACHIEVEMENTS / BADGES */}
      <Text style={[styles.lastPointsTitle, { textAlign: effectiveRTL ? "right" : "left" }]}>
        {t("profile.achievements")} 🏆
      </Text>

      {achievements.length > 0 ? (
        <View style={styles.achievementsGrid}>
          {achievements.map((badge) => {
            const name = effectiveRTL ? badge.name_en : badge.name_ar;
            const desc = effectiveRTL ? badge.description_en : badge.description_ar;
            return (
              <View
                key={badge.id}
                style={[
                  styles.achievementCard,
                  !badge.unlocked && styles.achievementCardLocked,
                ]}
              >
                <Text style={styles.achievementIcon}>{badge.icon}</Text>
                <Text
                  style={[
                    styles.achievementName,
                    !badge.unlocked && styles.achievementNameLocked,
                  ]}
                  numberOfLines={1}
                >
                  {name}
                </Text>
                {badge.unlocked && (
                  <Text style={styles.achievementCheck}>✅</Text>
                )}
                {!badge.unlocked && (
                  <Text style={styles.achievementLock}>🔒</Text>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.pointsCard}>
          <Text style={[styles.pointsCardText, { textAlign: effectiveRTL ? "right" : "left" }]}>
            {t("achievements.empty")}
          </Text>
        </View>
      )}

      {/* WEEKLY CHALLENGES */}
      <Text style={[styles.lastPointsTitle, { textAlign: effectiveRTL ? "right" : "left" }]}>
        {t("profile.weeklyChallenges")} ⚡
      </Text>

      {challenges.length > 0 ? (
        challenges.map((ch) => {
          const title = effectiveRTL ? ch.title_en : ch.title_ar;
          const desc = effectiveRTL ? ch.description_en : ch.description_ar;
          return (
            <View key={ch.id} style={[styles.challengeCard, ch.completed && styles.challengeCardDone]}>
              <View style={[styles.challengeHeader, { flexDirection: effectiveRTL ? "row-reverse" : "row" }]}>
                <Text style={styles.challengeIcon}>{ch.icon}</Text>
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={[styles.challengeTitle, { textAlign: effectiveRTL ? "right" : "left" }]}>{title}</Text>
                  <Text style={[styles.challengeDesc, { textAlign: effectiveRTL ? "right" : "left" }]}>{desc}</Text>
                </View>
                <View style={styles.challengePointsBadge}>
                  <Text style={styles.challengePointsText}>+{ch.bonus_points}</Text>
                </View>
              </View>
              <View style={styles.challengeProgressBar}>
                <View style={[styles.challengeProgressFill, { width: `${ch.progress_percent}%` }]} />
              </View>
              <View style={[styles.challengeFooter, { flexDirection: effectiveRTL ? "row-reverse" : "row" }]}>
                <Text style={styles.challengeProgressText}>
                  {ch.current_value}/{ch.target_value}
                </Text>
                {ch.completed ? (
                  <Text style={styles.challengeDone}>✅ {t("profile.completed")}</Text>
                ) : (
                  <Text style={styles.challengePercent}>{ch.progress_percent}%</Text>
                )}
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.pointsCard}>
          <Text style={[styles.pointsCardText, { textAlign: effectiveRTL ? "right" : "left" }]}>
            {t("profile.noChallenges")}
          </Text>
        </View>
      )}

      {/* FRIENDS / SOCIAL */}
      <Text style={[styles.lastPointsTitle, { textAlign: effectiveRTL ? "right" : "left", marginTop: 10 }]}>
        {t("profile.friends")} 👥
      </Text>

      <View style={styles.friendsRow}>
        <View style={[styles.friendInputRow, { flexDirection: effectiveRTL ? "row-reverse" : "row" }]}>
          <TextInput
            style={[styles.friendInput, { textAlign: effectiveRTL ? "right" : "left" }]}
            placeholder={t("profile.friendIdPlaceholder")}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={friendIdInput}
            onChangeText={setFriendIdInput}
            keyboardType="number-pad"
          />
          <TouchableOpacity
            style={styles.friendAddBtn}
            onPress={async () => {
              const fid = parseInt(friendIdInput);
              if (!fid || isNaN(fid)) return;
              try {
                await friendsAPI.sendRequest(fid);
                Alert.alert("✅", t("profile.friendRequestSent"));
                setFriendIdInput("");
                const updated = await friendsAPI.getFriends().catch(() => []);
                setFriends(updated);
              } catch (e: any) {
                Alert.alert("❌", e?.response?.data?.detail || "Error");
              }
            }}
          >
            <Ionicons name="person-add" size={20} color="#0D2B66" />
          </TouchableOpacity>
        </View>

        {friends.length > 0 ? (
          <View style={styles.friendsList}>
            {friends.map((f) => (
              <View key={f.friendship_id} style={[styles.friendItem, { flexDirection: effectiveRTL ? "row-reverse" : "row" }]}>
                <View style={styles.friendAvatar}>
                  <Ionicons name="person-circle" size={36} color={YELLOW} />
                </View>
                <Text style={[styles.friendName, { textAlign: effectiveRTL ? "right" : "left" }]}>
                  ID: {f.friend_user_id}
                </Text>
                <View style={styles.friendStatusBadge}>
                  <Text style={styles.friendStatusText}>
                    {f.status === "accepted" ? "✅" : "⏳"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noFriendsText}>{t("profile.noFriends")}</Text>
        )}

        <TouchableOpacity
          style={styles.friendLeaderboardBtn}
          onPress={() => router.push("/leaderboard")}
        >
          <Ionicons name="trophy" size={18} color="#0D2B66" />
          <Text style={styles.friendLeaderboardText}>{t("profile.friendLeaderboard")}</Text>
        </TouchableOpacity>
      </View>

      {/* LAST POINTS */}
      <Text style={[styles.lastPointsTitle, { textAlign: effectiveRTL ? "right" : "left", marginTop: 10 }]}>
        {t("profile.lastPoints")}
      </Text>

      {transactions.length > 0 ? (
        transactions.map((transaction) => (
          <View
            key={transaction.id}
            style={[
              styles.pointsCard,
              { flexDirection: effectiveRTL ? "row-reverse" : "row", justifyContent: "space-between" },
            ]}
          >
            <Ionicons
              style={effectiveRTL ? { marginLeft: 4 } : { marginRight: 4 }}
              name={getTransactionIcon(transaction.transaction_type)}
              size={22}
              color={transaction.points > 0 ? YELLOW : "#FF6B6B"}
            />
            <Text style={[styles.pointsCardText, { textAlign: effectiveRTL ? "right" : "left" }]}>
              {getTransactionText(transaction)}
            </Text>
          </View>
        ))
      ) : (
        <View style={styles.pointsCard}>
          <Text style={[styles.pointsCardText, { textAlign: effectiveRTL ? "right" : "left" }]}>
            {t("profile.noTransactions")}
          </Text>
        </View>
      )}

      {/* SHARE */}
      <TouchableOpacity style={styles.shareBtn} onPress={handleShareAchievement}>
        <Text style={styles.shareText}>{t("profile.shareAchievement")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BLUE,
    paddingHorizontal: 20,
    paddingTop: 5,
    minHeight: "100%",
    // ❌ direction:"rtl" raus! (sonst überschreibt alles)
  },

  header: {
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "Tajawal-Bold",
    flex: 1,
    textAlign: "center",
  },

  iconBtn: {
    padding: 6,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },

  levelText: {
    color: "#FFFFFF",
    fontSize: 22,
    textAlign: "center",
    marginVertical: 10,
    fontFamily: "Tajawal-Bold",
  },

  progressBar: {
    width: "80%",
    height: 16,
    borderRadius: 20,
    backgroundColor: "#1B3768",
    alignSelf: "center",
    overflow: "hidden",
    marginBottom: 8,
  },

  progressFill: {
    height: "100%",
    backgroundColor: YELLOW,
  },

  pointsText: {
    color: "#FFFFFF",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 0,
    fontFamily: "Tajawal-Bold",
  },

  userName: {
    color: "#FFFFFF",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 8,
    marginTop: 9,
    fontFamily: "Tajawal-Bold",
  },

  userEmail: {
    color: "#BFD7EA",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
    fontFamily: "Tajawal-Regular",
  },

  statsRow: {
    justifyContent: "space-between",
    marginBottom: 20,
  },

  statBox: {
    width: "30%",
    backgroundColor: "#123A7A",
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: "center",
  },

  statNumber: {
    color: "#FFD166",
    fontSize: 20,
    fontFamily: "Tajawal-Bold",
    marginTop: 4,
  },

  statLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Tajawal-Regular",
    marginTop: 4,
  },

  lastPointsTitle: {
    color: "#FFD166",
    fontSize: 18,
    fontFamily: "Tajawal-Bold",
    marginBottom: 10,
  },

  pointsCard: {
    backgroundColor: "#123A7A",
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    alignItems: "center",
    gap: 12,
    // ❌ direction:"rtl" raus!
  },

  pointsCardText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Tajawal-Regular",
    flex: 1,
  },

  shareBtn: {
    backgroundColor: YELLOW,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
    alignItems: "center",
  },

  shareText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Tajawal-Bold",
  },

  photoWrapper: {
    alignSelf: "center",
    marginTop: 10,
  },

  profilePhoto: {
    width: 130,
    height: 130,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: "#FFD166",
  },

  emptyPhoto: {
    width: 130,
    height: 130,
    borderRadius: 70,
    backgroundColor: "#2C4A87",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFD166",
  },

  editBadge: {
    position: "absolute",
    bottom: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFD166",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },

  // Achievement styles
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 8,
  },

  achievementCard: {
    width: "31%",
    backgroundColor: "#123A7A",
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    borderWidth: 2,
    borderColor: YELLOW,
    minHeight: 90,
    justifyContent: "center",
  },

  achievementCardLocked: {
    borderColor: "rgba(255,255,255,0.1)",
    opacity: 0.5,
  },

  achievementIcon: {
    fontSize: 28,
    marginBottom: 4,
  },

  achievementName: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Tajawal-Medium",
    textAlign: "center",
  },

  achievementNameLocked: {
    color: "rgba(255,255,255,0.5)",
  },

  achievementCheck: {
    fontSize: 12,
    marginTop: 2,
  },

  achievementLock: {
    fontSize: 12,
    marginTop: 2,
  },

  // Challenge styles
  challengeCard: {
    backgroundColor: "#123A7A",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  challengeCardDone: {
    borderColor: YELLOW,
    backgroundColor: "#1a4a8a",
  },
  challengeHeader: {
    alignItems: "center",
    marginBottom: 8,
  },
  challengeIcon: {
    fontSize: 28,
  },
  challengeTitle: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Tajawal-Bold",
  },
  challengeDesc: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontFamily: "Tajawal-Regular",
  },
  challengePointsBadge: {
    backgroundColor: YELLOW,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  challengePointsText: {
    color: "#0D2B66",
    fontFamily: "Tajawal-Bold",
    fontSize: 13,
  },
  challengeProgressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden" as const,
    marginBottom: 6,
  },
  challengeProgressFill: {
    height: "100%" as const,
    backgroundColor: YELLOW,
    borderRadius: 4,
  },
  challengeFooter: {
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  challengeProgressText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontFamily: "Tajawal-Regular",
  },
  challengePercent: {
    color: YELLOW,
    fontSize: 13,
    fontFamily: "Tajawal-Bold",
  },
  challengeDone: {
    color: "#4CAF50",
    fontSize: 13,
    fontFamily: "Tajawal-Bold",
  },

  // Friends styles
  friendsRow: {
    marginBottom: 16,
  },
  friendInputRow: {
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 10,
  },
  friendInput: {
    flex: 1,
    backgroundColor: "#123A7A",
    borderRadius: 12,
    color: "#fff",
    padding: 12,
    fontSize: 15,
    fontFamily: "Tajawal-Regular",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  friendAddBtn: {
    backgroundColor: YELLOW,
    borderRadius: 12,
    padding: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  friendsList: {
    gap: 6,
    marginBottom: 10,
  },
  friendItem: {
    backgroundColor: "#123A7A",
    borderRadius: 12,
    padding: 10,
    alignItems: "center" as const,
    gap: 10,
  },
  friendAvatar: {
    width: 36,
    alignItems: "center" as const,
  },
  friendName: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Tajawal-Medium",
    flex: 1,
  },
  friendStatusBadge: {
    width: 28,
    alignItems: "center" as const,
  },
  friendStatusText: {
    fontSize: 16,
  },
  noFriendsText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontFamily: "Tajawal-Regular",
    textAlign: "center" as const,
    marginVertical: 10,
  },
  friendLeaderboardBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: YELLOW,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  friendLeaderboardText: {
    color: "#0D2B66",
    fontSize: 15,
    fontFamily: "Tajawal-Bold",
  },
});
