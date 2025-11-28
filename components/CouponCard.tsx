// components/CouponCard.tsx
import { useLanguage } from "@/contexts/LanguageContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { Coupon } from "../data/coupons";

const PRIMARY = "#0D2B66";
const YELLOW = "#F4B400";

type Props = {
  coupon: Coupon;
  onPress?: () => void;
  showActivateButton?: boolean;
};

export default function CouponCard({ coupon, onPress, showActivateButton = true }: Props) {
  const { t } = useLanguage();

  const title = t(`coupons.${coupon.id}.title`);
  const desc = t(`coupons.${coupon.id}.desc`);
  const validText = t(`coupons.${coupon.id}.validText`);
  const pointsLabel = t(`coupons.${coupon.id}.pointsLabel`);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.cardOuter}
    >
      <View style={styles.cardInner}>
        {/* Header-Badge */}
        <View style={styles.badgeRow}>
          <View style={styles.badgeLeft}>
            <Ionicons name="gift" size={18} color={PRIMARY} />
            <Text style={styles.badgeText}>عرض نقاط</Text>
          </View>

          {coupon.isActive ? (
            <View style={[styles.statusPill, { backgroundColor: "rgba(76,217,100,0.16)" }]}>
              <Ionicons name="checkmark-circle" size={16} color="#4CD964" />
              <Text style={[styles.statusText, { color: "#4CD964" }]}>مفعّل</Text>
            </View>
          ) : (
            <View style={[styles.statusPill, { backgroundColor: "rgba(255,255,255,0.16)" }]}>
              <Ionicons name="time" size={16} color="#FFF" />
              <Text style={[styles.statusText, { color: "#FFF" }]}>متاح</Text>
            </View>
          )}
        </View>

        {/* Inhalt */}
        <View style={styles.mainRow}>
          <Image source={coupon.image} style={styles.icon} />

          <View style={{ flex: 1 }}>
            <Text style={styles.pointsLabel}>{pointsLabel}</Text>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <Text style={styles.desc} numberOfLines={2}>
              {desc}
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

            <View style={styles.button}>
              <Text style={styles.buttonText}>
                {coupon.isActive ? t('common.yes') : t('coupons.activate')}
              </Text>
            </View>
          </View>
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
});
