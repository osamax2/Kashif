import { useLanguage } from "@/contexts/LanguageContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import {
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

const PRIMARY = "#0D2B66";
const YELLOW = "#F4B400";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface QRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  verificationCode: string;
  couponName: string;
  pointsSpent: number;
}

export default function QRCodeModal({
  visible,
  onClose,
  verificationCode,
  couponName,
  pointsSpent,
}: QRCodeModalProps) {
  const { t, language } = useLanguage();
  const isRTL = language === "ar";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={[styles.header, isRTL && styles.headerRTL]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isRTL ? "رمز الكوبون" : "Coupon Code"}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Success Icon */}
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
          </View>

          {/* Success Message */}
          <Text style={styles.successTitle}>
            {isRTL ? "تم تفعيل الكوبون بنجاح!" : "Coupon Activated!"}
          </Text>
          <Text style={styles.couponName}>{couponName}</Text>

          {/* QR Code */}
          <View style={styles.qrContainer}>
            <QRCode
              value={verificationCode}
              size={SCREEN_WIDTH * 0.5}
              color={PRIMARY}
              backgroundColor="white"
            />
          </View>

          {/* Verification Code */}
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>
              {isRTL ? "كود التحقق" : "Verification Code"}
            </Text>
            <Text style={styles.codeText}>{verificationCode}</Text>
          </View>

          {/* Points Spent */}
          <View style={styles.pointsContainer}>
            <Ionicons name="star" size={20} color={YELLOW} />
            <Text style={styles.pointsText}>
              {isRTL
                ? `تم خصم ${pointsSpent.toLocaleString("ar-SA")} نقطة`
                : `${pointsSpent.toLocaleString("en-US")} points spent`}
            </Text>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={[styles.instructionsText, isRTL && styles.textRTL]}>
              {isRTL
                ? "اعرض هذا الرمز للموظف عند استخدام الكوبون"
                : "Show this code to the staff when using your coupon"}
            </Text>
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>
              {isRTL ? "تم" : "Done"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  headerRTL: {
    flexDirection: "row-reverse",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(13, 43, 102, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Tajawal-Bold",
    color: PRIMARY,
  },
  headerSpacer: {
    width: 40,
  },
  successIcon: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: "Tajawal-Bold",
    color: "#4CAF50",
    marginBottom: 4,
  },
  couponName: {
    fontSize: 16,
    fontFamily: "Tajawal-Bold",
    color: PRIMARY,
    marginBottom: 20,
    textAlign: "center",
  },
  qrContainer: {
    padding: 16,
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    marginBottom: 16,
  },
  codeContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 12,
    color: "#666",
    fontFamily: "Tajawal-Regular",
    marginBottom: 4,
  },
  codeText: {
    fontSize: 18,
    fontFamily: "Tajawal-Bold",
    color: PRIMARY,
    letterSpacing: 2,
  },
  pointsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(244, 180, 0, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  pointsText: {
    fontSize: 14,
    fontFamily: "Tajawal-Bold",
    color: PRIMARY,
  },
  instructionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  instructionsText: {
    fontSize: 13,
    color: "#666",
    fontFamily: "Tajawal-Regular",
    flex: 1,
  },
  textRTL: {
    textAlign: "right",
  },
  doneButton: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
  },
  doneButtonText: {
    color: "white",
    fontSize: 16,
    fontFamily: "Tajawal-Bold",
    textAlign: "center",
  },
});
