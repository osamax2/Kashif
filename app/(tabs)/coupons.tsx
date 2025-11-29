// app/(tabs)/coupons.tsx
import CouponCard from "@/components/CouponCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCoupons } from "@/hooks/useCoupons";
import { useAuth } from "@/contexts/AuthContext";
import { couponsAPI, type Coupon } from "@/services/coupons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
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
  const { t, locale } = useLanguage();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { user, refreshUser } = useAuth();
  const [redeemingId, setRedeemingId] = useState<number | null>(null);

  const {
    filteredCoupons,
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

  useEffect(() => {
    if (loading) {
      return;
    }

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
          await couponsAPI.redeemCoupon(coupon.id);
          await Promise.all([refreshUser(), refetch()]);
          Alert.alert(t("coupons.redeem.successTitle"), t("coupons.redeem.successMessage"));
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
            onPress: () => {
              executeRedeem().catch((err) => console.error("Redeem coupon error", err));
            },
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
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("coupons.screenTitle")}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "inactive" && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab("inactive")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "inactive" && styles.tabTextActive,
            ]}
          >
            {t("coupons.tabs.inactive")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "active" && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab("active")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "active" && styles.tabTextActive,
            ]}
          >
            {t("coupons.tabs.active")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Suche */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={PRIMARY} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t("coupons.searchPlaceholder")}
          placeholderTextColor="#9BB1D8"
          style={styles.searchInput}
          textAlign="right"
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
    direction: "rtl",
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
    flexDirection: "row-reverse",
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
    flexDirection: "row-reverse",
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
