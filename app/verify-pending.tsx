// app/verify-pending.tsx
import { FontAwesome } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "../contexts/LanguageContext";

export default function VerifyPending() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || "";

  const effectiveRTL = !isRTL;

  const handleContinue = () => {
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      <View style={styles.content}>
        {/* Email Icon */}
        <View style={styles.iconContainer}>
          <FontAwesome name="envelope-o" size={80} color="#10B981" />
          <View style={styles.checkBadge}>
            <FontAwesome name="check" size={20} color="#fff" />
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.title, { textAlign: effectiveRTL ? "right" : "left" }]}>
          {t("auth.verifyPending.title")}
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { textAlign: effectiveRTL ? "right" : "left" }]}>
          {t("auth.verifyPending.subtitle")}
        </Text>

        {/* Email Display */}
        {email ? (
          <View style={styles.emailContainer}>
            <FontAwesome name="envelope" size={16} color="#6B7280" />
            <Text style={styles.emailText}>{email}</Text>
          </View>
        ) : null}

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={[styles.instructionText, { textAlign: effectiveRTL ? "right" : "left" }]}>
            {t("auth.verifyPending.instruction1")}
          </Text>
          <Text style={[styles.instructionText, { textAlign: effectiveRTL ? "right" : "left" }]}>
            {t("auth.verifyPending.instruction2")}
          </Text>
        </View>

        {/* Spam Note */}
        <View style={styles.noteContainer}>
          <FontAwesome name="info-circle" size={16} color="#F59E0B" />
          <Text style={[styles.noteText, { textAlign: effectiveRTL ? "right" : "left" }]}>
            {t("auth.verifyPending.spamNote")}
          </Text>
        </View>
      </View>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>
            {t("auth.verifyPending.continue")}
          </Text>
          <FontAwesome 
            name={effectiveRTL ? "arrow-left" : "arrow-right"} 
            size={18} 
            color="#fff" 
            style={styles.buttonIcon}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: "center",
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    position: "relative",
  },
  checkBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#F8FAFC",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    width: "100%",
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    lineHeight: 24,
    marginBottom: 24,
    width: "100%",
  },
  emailContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 10,
  },
  emailText: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
  },
  instructionsContainer: {
    width: "100%",
    marginBottom: 24,
    gap: 12,
  },
  instructionText: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    width: "100%",
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: "#92400E",
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  continueButton: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  buttonIcon: {
    marginLeft: 4,
  },
});
