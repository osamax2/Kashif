// app/(tabs)/coupons.tsx ✅ wie index.tsx: Arabisch = LTR | Englisch = RTL (effectiveRTL = !isRTL)

import CouponCard from "@/components/CouponCard";
import QRCodeModal from "@/components/QRCodeModal";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCoupons, type CouponWithRedemption } from "@/hooks/useCoupons";
import { couponsAPI, type Coupon } from "@/services/coupons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const PRIMARY = "#0D2B66";
const YELLOW = "#F4B400";

export default function CouponsScreen() {
  const { t, locale, isRTL } = useLanguage();

  // ✅ WIE index.tsx: Arabisch=LTR | Englisch=RTL
  const effectiveRTL = !isRTL;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { user, refreshUser } = useAuth();
  const [redeemingId, setRedeemingId] = useState<number | null>(null);

  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [redemptionData, setRedemptionData] = useState<{
    verificationCode: string;
    couponName: string;
    pointsSpent: number;
  } | null>(null);

  const {
    filteredCoupons,
    usedCoupons,
    activeTab,
    setActiveTab,
    search,
    setSearch,
    loading,
    refreshing,
    error,
    onRefresh,
    refetch,
  } = useCoupons({ initialTab: "active" });

  const userPoints = user?.total_points ?? 0;

  const handleShowUsedCouponQR = useCallback(
    (couponWithRedemption: CouponWithRedemption) => {
      if (!couponWithRedemption.redemption) return;

      if (couponWithRedemption.redemption.verified_at) {
        Alert.alert(t("coupons.alreadyVerifiedTitle"), t("coupons.alreadyVerifiedMessage"));
        return;
      }

      setRedemptionData({
        verificationCode: couponWithRedemption.redemption.verification_code,
        couponName: couponWithRedemption.name,
        pointsSpent: couponWithRedemption.redemption.points_spent,
      });
      setQrModalVisible(true);
    },
    [t]
  );

  useEffect(() => {
    if (loading) return;

    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [loading, filteredCoupons.length, fadeAnim]);

  const handleRedeem = useCallback(
    (coupon: Coupon) => {
      if (!user) {
        Alert.alert(t("common.error"), t("coupons.redeem.loginRequired"));
        return;
      }

      if (coupon.points_cost > userPoints) {
        Alert.alert(
          t("coupons.redeem.insufficientTitle"),
          t("coupons.redeem.insufficientMessage", {
            required: coupon.points_cost.toLocaleString(locale ?? "en-US"),
            current: userPoints.toLocaleString(locale ?? "en-US"),
          })
        );
        return;
      }

      const executeRedeem = async () => {
        try {
          setRedeemingId(coupon.id);
          const redemption = await couponsAPI.redeemCoupon(coupon.id);
          await Promise.all([refreshUser(), refetch()]);

          setRedemptionData({
            verificationCode: redemption.verification_code,
            couponName: coupon.name,
            pointsSpent: coupon.points_cost,
          });
          setQrModalVisible(true);
        } catch (err) {
          console.error("Failed to redeem coupon", err);
          Alert.alert(t("common.error"), t("coupons.redeem.errorMessage"));
        } finally {
          setRedeemingId(null);
        }
      };

      Alert.alert(
        t("coupons.redeem.confirmTitle"),
        t("coupons.redeem.confirmMessage", {
          points: coupon.points_cost.toLocaleString(locale ?? "en-US"),
        }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("coupons.redeem.confirmAction"),
            onPress: () => executeRedeem().catch((err) => console.error("Redeem coupon error", err)),
          },
        ]
      );
    },
    [user, userPoints, t, refreshUser, refetch, locale]
  );

  const canRedeemMap = useMemo(() => {
    return new Map<number, boolean>(
      filteredCoupons.map((coupon) => [coupon.id, !user || userPoints >= coupon.points_cost])
    );
  }, [filteredCoupons, user, userPoints]);

  return (
    <View style={styles.root}>
      {/* QR Code Modal */}
      {redemptionData && (
        <QRCodeModal
          visible={qrModalVisible}
          onClose={() => {
            setQrModalVisible(false);
            setRedemptionData(null);
          }}
          verificationCode={redemptionData.verificationCode}
          couponName={redemptionData.couponName}
          pointsSpent={redemptionData.pointsSpent}
        />
      )}

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("coupons.screenTitle")}</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { flexDirection: effectiveRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "inactive" && styles.tabItemActive]}
          onPress={() => setActiveTab("inactive")}
        >
          <Text style={[styles.tabText, activeTab === "inactive" && styles.tabTextActive]}>
            {t("coupons.tabs.inactive")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "used" && styles.tabItemActive]}
          onPress={() => setActiveTab("used")}
        >
          <Text style={[styles.tabText, activeTab === "used" && styles.tabTextActive]}>
            {t("coupons.tabs.used")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "active" && styles.tabItemActive]}
          onPress={() => setActiveTab("active")}
        >
          <Text style={[styles.tabText, activeTab === "active" && styles.tabTextActive]}>
            {t("coupons.tabs.active")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Suche */}
      <View style={[styles.searchBox, { flexDirection: effectiveRTL ? "row-reverse" : "row" }]}>
        <Ionicons name="search" size={20} color={PRIMARY} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t("coupons.searchPlaceholder")}
          placeholderTextColor="#9BB1D8"
          style={[
            styles.searchInput,
            {
              textAlign: effectiveRTL ? "right" : "left",
              writingDirection: effectiveRTL ? "rtl" : "ltr",
            },
          ]}
        />
      </View>

      {error && !loading && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Inhalt */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={YELLOW} />
          <Text style={styles.loadingText}>{t("coupons.loading")}</Text>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            style={{ marginTop: 12 }}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={YELLOW}
                colors={[YELLOW]}
              />
            }
          >
            {activeTab === "used" ? (
              <>
                {usedCoupons.map((c) => (
                  <TouchableOpacity
                    key={`used-${c.id}-${c.redemption?.id}`}
                    onPress={() => handleShowUsedCouponQR(c)}
                    activeOpacity={0.7}
                  >
                    <CouponCard
                      coupon={c}
                      onPress={() => handleShowUsedCouponQR(c)}
                      hideRedeemButton
                      isVerified={!!c.redemption?.verified_at}
                      showVerifiedBadge
                    />
                  </TouchableOpacity>
                ))}
                {usedCoupons.length === 0 && (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>{t("coupons.emptyUsed")}</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {filteredCoupons.map((c) => (
                  <CouponCard
                    key={c.id}
                    coupon={c}
                    onPress={() =>
                      router.push({ pathname: "/coupon-details", params: { id: String(c.id) } })
                    }
                    onRedeem={handleRedeem}
                    isRedeeming={redeemingId === c.id}
                    canRedeem={canRedeemMap.get(c.id) ?? true}
                    showInsufficientMessage={!!user}
                  />
                ))}
                {filteredCoupons.length === 0 && (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>{t("coupons.empty")}</Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PRIMARY,
    paddingTop: 48,
    paddingHorizontal: 14,
    // ❌ direction:"rtl" entfernen (sonst immer RTL!)
  },
  header: {
    alignItems: "center",
    marginBottom: 6,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 24,
    fontFamily: "Tajawal-Bold",
  },
  tabRow: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 4,
    borderRadius: 16,
    marginVertical: 10,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: "center",
  },
  tabItemActive: {
    backgroundColor: "#FFF",
  },
  tabText: {
    color: "#FFF",
    fontSize: 15,
    fontFamily: "Tajawal-Bold",
  },
  tabTextActive: {
    color: PRIMARY,
  },
  searchBox: {
    backgroundColor: "#FFF",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 45,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 10,
    color: PRIMARY,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#E3ECFF",
    marginTop: 10,
    fontFamily: "Tajawal-Regular",
  },
  errorBox: {
    marginTop: 12,
    backgroundColor: "rgba(255, 107, 107, 0.16)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorText: {
    color: "#ffc1c1",
    fontFamily: "Tajawal-Regular",
    textAlign: "center",
    fontSize: 13,
  },
  emptyBox: {
    marginTop: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#E3ECFF",
    fontFamily: "Tajawal-Regular",
  },
});
