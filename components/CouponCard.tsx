// components/CouponCard.tsx
import { useLanguage } from "@/contexts/LanguageContext";
import { isCouponActive, isCouponExpired, type Coupon } from "@/services/coupons";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PRIMARY = "#0D2B66";
const YELLOW = "#F4B400";
const FALLBACK_IMAGE = require("@/assets/icons/pothole.png");

type Props = {
  coupon: Coupon;
  onPress?: () => void;
  showActivateButton?: boolean;
  onRedeem?: (coupon: Coupon) => void;
  isRedeeming?: boolean;
  canRedeem?: boolean;
  showInsufficientMessage?: boolean;
};

export default function CouponCard({
  coupon,
  onPress,
  showActivateButton = true,
  onRedeem,
  isRedeeming = false,
  canRedeem = true,
  showInsufficientMessage = true,
}: Props) {
  const { t, language } = useLanguage();

  const active = isCouponActive(coupon);
  const expired = isCouponExpired(coupon);

  const statusConfig = useMemo(() => {
    if (active) {
      return {
        backgroundColor: "rgba(76,217,100,0.16)",
        color: "#4CD964",
        icon: "checkmark-circle" as const,
        label: t("coupons.status.active"),
      };
    }

    if (expired) {
      return {
        backgroundColor: "rgba(255,69,58,0.16)",
        color: "#FF453A",
        icon: "close-circle" as const,
        label: t("coupons.status.expired"),
      };
    }

    return {
      backgroundColor: "rgba(255,255,255,0.16)",
      color: "#FFFFFF",
      icon: "time" as const,
      label: t("coupons.status.available"),
    };
  }, [active, expired, t]);

  const pointsLabel = useMemo(() => {
    const formattedPoints = Number.isFinite(coupon.points_cost)
      ? coupon.points_cost.toLocaleString(language === "ar" ? "ar-SA" : "en-US")
      : "0";
    return t("coupons.pointsLabel", { points: formattedPoints });
  }, [coupon.points_cost, language, t]);

  const validText = useMemo(() => {
    if (!coupon.expiration_date) {
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
  }, [coupon.expiration_date, language, t]);

  const imageSource = coupon.image_url
    ? { uri: coupon.image_url }
    : FALLBACK_IMAGE;

  const redeemDisabled = !active || !onRedeem || isRedeeming || !canRedeem;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.9 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={styles.cardOuter}
    >
      <View style={styles.cardInner}>
        {/* Header-Badge */}
        <View style={styles.badgeRow}>
          <View style={styles.badgeLeft}>
            <Ionicons name="gift" size={18} color={PRIMARY} />
            <Text style={styles.badgeText}>{t("coupons.badgeLabel")}</Text>
          </View>

          <View
            style={[styles.statusPill, { backgroundColor: statusConfig.backgroundColor }]}
          >
            <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>

        {/* Inhalt */}
        <View style={styles.mainRow}>
          <Image source={imageSource} style={styles.icon} resizeMode="cover" />

          <View style={{ flex: 1 }}>
            <Text style={styles.pointsLabel}>{pointsLabel}</Text>
            <Text style={styles.title} numberOfLines={2}>
              {coupon.name}
            </Text>
            <Text style={styles.desc} numberOfLines={2}>
              {coupon.description}
            </Text>

            <View style={styles.validRow}>
              <Ionicons name="calendar-outline" size={14} color="#C7D5F3" />
              <Text style={styles.validText}>{validText}</Text>
            </View>
          </View>
        </View>

        {/* Button */}
        {showActivateButton && (
          <View style={styles.footerRow}>
            <View style={styles.pointsChip}>
              <Text style={styles.pointsChipText}>{pointsLabel}</Text>
            </View>

            <View style={{ flex: 1 }} />

            {active ? (
              <TouchableOpacity
                style={[styles.button, redeemDisabled && styles.buttonDisabled]}
                activeOpacity={0.9}
                onPress={() => onRedeem?.(coupon)}
                disabled={redeemDisabled}
              >
                {isRedeeming ? (
                  <ActivityIndicator size="small" color={PRIMARY} />
                ) : (
                  <Text style={[styles.buttonText, redeemDisabled && styles.buttonTextDisabled]}>
                    {t("coupons.redeemButton")}
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={[styles.button, styles.buttonDisabled]}>
                <Text style={[styles.buttonText, styles.buttonTextDisabled]}>
                  {t("coupons.viewDetails")}
                </Text>
              </View>
            )}
          </View>
        )}

        {showActivateButton && active && !canRedeem && showInsufficientMessage && (
          <Text style={styles.pointsWarning}>
            {t("coupons.redeemInsufficientLabel", { points: pointsLabel })}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    marginBottom: 14,
  },
  cardInner: {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 18,
    padding: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  badgeRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  badgeLeft: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(244,180,0,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: PRIMARY,
    fontSize: 12,
    fontFamily: "Tajawal-Bold",
  },
  statusPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Tajawal-Medium",
  },
  mainRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginTop: 6,
  },
  icon: {
    width: 56,
    height: 56,
    marginLeft: 14,
    borderRadius: 12,
  },
  pointsLabel: {
    color: YELLOW,
    fontSize: 14,
    fontFamily: "Tajawal-Bold",
    textAlign: "right",
  },
  title: {
    color: PRIMARY,
    fontSize: 18,
    fontFamily: "Tajawal-Bold",
    marginTop: 2,
    textAlign: "right",
  },
  desc: {
    color: "#444",
    fontSize: 13,
    marginTop: 4,
    textAlign: "right",
  },
  validRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  validText: {
    color: "#C7D5F3",
    fontSize: 12,
    fontFamily: "Tajawal-Regular",
  },
  footerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginTop: 10,
  },
  pointsChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(13,43,102,0.08)",
  },
  pointsChipText: {
    color: PRIMARY,
    fontSize: 13,
    fontFamily: "Tajawal-Bold",
  },
  button: {
    backgroundColor: YELLOW,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  buttonText: {
    color: PRIMARY,
    fontSize: 15,
    fontFamily: "Tajawal-Bold",
  },
  buttonDisabled: {
    backgroundColor: "rgba(244, 180, 0, 0.24)",
    opacity: 0.8,
  },
  buttonTextDisabled: {
    color: "rgba(13,43,102,0.6)",
  },
  pointsWarning: {
    color: "#FF6B6B",
    fontFamily: "Tajawal-Bold",
    fontSize: 13,
    textAlign: "right",
    marginTop: 8,
  },
});
