import { useAuth } from "@/contexts/AuthContext";
import { useDataSync } from "@/contexts/DataSyncContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { gamificationAPI, authAPI, Level, lookupAPI, PointTransaction, reportingAPI } from "@/services/api";
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
      const [transactionsData, reportsData, levelsData] = await Promise.all([
        gamificationAPI.getMyTransactions(0, 5).catch(() => []),
        reportingAPI.getMyReports(0, 1000).catch(() => []),
        lookupAPI.getLevels().catch(() => []),
      ]);

      setTransactions(transactionsData);
      setReportCount(reportsData.length);
      setLevels(levelsData);

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
      <View style={[styles.header, { marginTop: 40, flexDirection: effectiveRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name={effectiveRTL ? "chevron-forward" : "chevron-back"} size={30} color={YELLOW} />
        </TouchableOpacity>

        <Text numberOfLines={1} style={styles.headerTitle}>
          {t("profile.title")}
        </Text>

        <TouchableOpacity onPress={() => router.push("/settings")} style={styles.iconBtn}>
          <Ionicons name="settings-sharp" size={28} color={YELLOW} />
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

      {/* LAST POINTS */}
      <Text style={[styles.lastPointsTitle, { textAlign: effectiveRTL ? "right" : "left" }]}>
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
});
