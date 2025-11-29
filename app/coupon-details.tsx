import CouponCard from "@/components/CouponCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { couponsAPI, isCouponExpired, type Coupon } from "@/services/coupons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PRIMARY = "#0D2B66";  // Blau
const YELLOW = "#F4B400";   // Gelb

export default function CouponDetails() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t, language } = useLanguage();
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCoupon = async () => {
      if (!id) {
        setError(t("coupons.details.missingId"));
        setLoading(false);
        return;
      }

      const couponId = Number(id);
      if (!Number.isFinite(couponId)) {
        setError(t("coupons.details.notFound"));
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await couponsAPI.getCoupon(couponId);
        setCoupon(data);
        setError(null);
      } catch (err) {
        console.error("Failed to load coupon", err);
        setError(t("coupons.details.loadError"));
      } finally {
        setLoading(false);
      }
    };

    fetchCoupon();
  }, [id, t]);

  const validText = useMemo(() => {
    if (!coupon?.expiration_date) {
      return t("coupons.noExpiry");
    }

    try {
      const formatter = new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const formattedDate = formatter.format(new Date(coupon.expiration_date));
      return t("coupons.validUntil", { date: formattedDate });
    } catch (error) {
      console.warn("Failed to format coupon expiration date", error);
      return t("coupons.validUntil", { date: coupon.expiration_date });
    }
  }, [coupon?.expiration_date, language, t]);

  const pointsLabel = useMemo(() => {
    if (!coupon) {
      return "";
    }

    const formattedPoints = Number.isFinite(coupon.points_cost)
      ? coupon.points_cost.toLocaleString(language === "ar" ? "ar-SA" : "en-US")
      : "0";
    return t("coupons.pointsLabel", { points: formattedPoints });
  }, [coupon, language, t]);

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={YELLOW} />
        <Text style={styles.loadingText}>{t("coupons.loading")}</Text>
      </View>
    );
  }

  if (error || !coupon) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={styles.errorText}>{error ?? t("coupons.details.notFound")}</Text>
      </View>
    );
  }

  const isRTL = language === "ar";

  return (
    <View style={[styles.root, isRTL ? styles.directionRTL : styles.directionLTR]}>
      {/* HEADER */}
      <View style={[styles.header, isRTL ? styles.headerRTL : styles.headerLTR]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerIcon}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={PRIMARY} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t("coupons.details.title")}</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* COUPON CARD */}
        <CouponCard coupon={coupon} showActivateButton={false} />

        {/* VALID DATE SECTION */}
        <Text style={styles.sectionGrey}>{validText}</Text>

        {/* OFFER SECTION */}
        <Text style={styles.sectionTitle}>{t("coupons.details.offerTitle")}</Text>
        <Text style={styles.sectionText}>{coupon.description}</Text>

        {/* INFO SECTION */}
        <Text style={styles.sectionTitle}>{t("coupons.details.infoTitle")}</Text>
        <Text style={styles.sectionText}>
          {t("coupons.details.pointsCost", { points: pointsLabel })}
        </Text>

        {/* NOTES SECTION */}
        {coupon.max_usage_per_user != null && (
          <View>
            <Text style={styles.sectionTitle}>{t("coupons.details.usageLimitTitle")}</Text>
            <Text style={styles.sectionText}>
              {t("coupons.details.usageLimit", { count: coupon.max_usage_per_user })}
            </Text>
          </View>
        )}

        {coupon.total_available != null && (
          <View>
            <Text style={styles.sectionTitle}>{t("coupons.details.totalAvailableTitle")}</Text>
            <Text style={styles.sectionText}>
              {t("coupons.details.totalAvailable", { count: coupon.total_available })}
            </Text>
          </View>
        )}

        {isCouponExpired(coupon) && (
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={18} color="#FF453A" />
            <Text style={styles.warningText}>{t("coupons.status.expired")}</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

/* ==================== STYLES ==================== */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    paddingTop: 40,
  },
  directionRTL: {
    direction: "rtl",
  },
  directionLTR: {
    direction: "ltr",
  },

  /* HEADER */
  header: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#FFF",
    height: 60,
    justifyContent: "space-between",
  },
  headerRTL: {
    flexDirection: "row-reverse",
  },
  headerLTR: {
    flexDirection: "row",
  },
  headerTitle: {
    fontSize: 22,
    color: PRIMARY,
    fontFamily: "Tajawal-Bold",
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(13,43,102,0.08)",
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  loadingText: {
    color: PRIMARY,
    marginTop: 16,
    fontFamily: "Tajawal-Bold",
  },
  errorText: {
    color: "#FF6B6B",
    fontFamily: "Tajawal-Bold",
    textAlign: "center",
    fontSize: 16,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },

  /* SECTIONS */
  sectionGrey: {
    fontSize: 15,
    color: "#777",
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
  },

  sectionTitle: {
    fontSize: 20,
    color: PRIMARY,
    fontFamily: "Tajawal-Bold",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 6,
  },

  sectionText: {
    fontSize: 15,
    color: "#444",
    paddingHorizontal: 16,
    lineHeight: 24,
  },
  warningBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,69,58,0.15)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  warningText: {
    color: "#FF453A",
    fontFamily: "Tajawal-Bold",
    fontSize: 15,
  },
});
