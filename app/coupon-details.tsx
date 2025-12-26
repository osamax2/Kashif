import CouponCard from "@/components/CouponCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { couponsAPI, isCouponExpired, type Coupon } from "@/services/coupons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PRIMARY = "#0D2B66";
const YELLOW = "#F4B400";

export default function CouponDetails() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t, language } = useLanguage();

  // 🔁 UMGEKEHRT:
  // Englisch = RTL | Arabisch = LTR
  const effectiveRTL = language === "en";

  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCoupon() {
      if (!id) {
        setError(t("coupons.details.missingId"));
        setLoading(false);
        return;
      }

      try {
        const data = await couponsAPI.getCoupon(Number(id));
        setCoupon(data);
      } catch {
        setError(t("coupons.details.loadError"));
      } finally {
        setLoading(false);
      }
    }

    loadCoupon();
  }, [id, t]);

  const validText = useMemo(() => {
    if (!coupon?.expiration_date) return t("coupons.noExpiry");

    const formatter = new Intl.DateTimeFormat(
      language === "ar" ? "ar-SA" : "en-US",
      { day: "2-digit", month: "long", year: "numeric" }
    );

    return t("coupons.validUntil", {
      date: formatter.format(new Date(coupon.expiration_date)),
    });
  }, [coupon, language, t]);

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={YELLOW} />
      </View>
    );
  }

  if (error || !coupon) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View
        style={[
          styles.header,
          { flexDirection: effectiveRTL ? "row-reverse" : "row" },
        ]}
      >
        {/* Back Icon */}
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
          <Ionicons
            name={effectiveRTL ? "chevron-forward" : "chevron-back"}
            size={26}
            color={PRIMARY}
          />
        </TouchableOpacity>

        {/* TITLE (immer zentriert) */}
        <Text style={styles.headerTitle}>
          {t("coupons.details.title")}
        </Text>

        {/* Spacer für perfekte Zentrierung */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <CouponCard coupon={coupon} showActivateButton={false} />

        <Text style={styles.greyText}>{validText}</Text>

        <Text style={styles.sectionTitle}>{t("coupons.details.offerTitle")}</Text>
        <Text style={styles.sectionText}>{coupon.description}</Text>

        {coupon.address && (
          <>
            <Text style={styles.sectionTitle}>
              {language === "ar" ? "العنوان" : "Address"}
            </Text>

            <TouchableOpacity
              style={styles.addressRow}
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    coupon.address!
                  )}`
                )
              }
            >
              <Ionicons name="location" size={18} color={PRIMARY} />
              <Text style={styles.addressText}>{coupon.address}</Text>
              <Ionicons name="open-outline" size={16} color="#666" />
            </TouchableOpacity>
          </>
        )}

        {isCouponExpired(coupon) && (
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={18} color="#FF453A" />
            <Text style={styles.warningText}>
              {t("coupons.status.expired")}
            </Text>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    paddingTop: 40,
  },

  center: {
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    height: 60,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
  },

  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(13,43,102,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 22,
    color: PRIMARY,
    fontFamily: "Tajawal-Bold",
  },

  headerSpacer: {
    width: 40,
    height: 40,
  },

  greyText: {
    color: "#777",
    fontSize: 15,
    paddingHorizontal: 16,
    marginTop: 10,
  },

  sectionTitle: {
    fontSize: 20,
    color: PRIMARY,
    fontFamily: "Tajawal-Bold",
    paddingHorizontal: 16,
    marginTop: 18,
  },

  sectionText: {
    fontSize: 15,
    color: "#444",
    paddingHorizontal: 16,
    marginTop: 6,
    lineHeight: 24,
  },

  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0F7FF",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 8,
  },

  addressText: {
    flex: 1,
    color: PRIMARY,
    textDecorationLine: "underline",
  },

  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,69,58,0.15)",
    borderRadius: 12,
    padding: 14,
    margin: 16,
  },

  warningText: {
    color: "#FF453A",
    fontFamily: "Tajawal-Bold",
  },

  errorText: {
    color: "#FF6B6B",
    fontSize: 16,
    fontFamily: "Tajawal-Bold",
  },
});
