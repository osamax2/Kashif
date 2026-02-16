// app/feedback.tsx — In-App Feedback Screen
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useLanguage } from "../contexts/LanguageContext";
import { reportingAPI } from "../services/api";

const BLUE = "#0D2B66";
const YELLOW = "#F4B400";

const CATEGORIES = [
  { key: "bug", icon: "bug" as const },
  { key: "suggestion", icon: "lightbulb-o" as const },
  { key: "complaint", icon: "exclamation-triangle" as const },
  { key: "other", icon: "comment" as const },
];

export default function FeedbackScreen() {
  const { t, isRTL } = useLanguage();
  const router = useRouter();
  const effectiveRTL = isRTL;

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("suggestion");
  const [loading, setLoading] = useState(false);

  const dir = {
    textAlign: (effectiveRTL ? "right" : "left") as const,
    writingDirection: (effectiveRTL ? "rtl" : "ltr") as const,
  };

  const categoryLabel = (key: string) => {
    switch (key) {
      case "bug": return t("feedback.categoryBug");
      case "suggestion": return t("feedback.categorySuggestion");
      case "complaint": return t("feedback.categoryComplaint");
      default: return t("feedback.categoryOther");
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert(t("errors.error"), t("feedback.subjectPlaceholder"));
      return;
    }
    if (!message.trim()) {
      Alert.alert(t("errors.error"), t("feedback.placeholder"));
      return;
    }

    setLoading(true);
    try {
      await reportingAPI.submitFeedback({
        subject: subject.trim(),
        message: message.trim(),
        category,
      });
      Alert.alert("✓", t("feedback.success"), [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      console.log("Feedback error:", e);
      Alert.alert(t("errors.error"), t("feedback.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { flexDirection: effectiveRTL ? "row-reverse" : "row" }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome
              name={effectiveRTL ? "arrow-right" : "arrow-left"}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
          <Text style={styles.title}>{t("feedback.title")}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Category Selection */}
        <Text style={[styles.label, dir]}>{t("feedback.category")}</Text>
        <View style={[styles.categoryRow, { flexDirection: effectiveRTL ? "row-reverse" : "row" }]}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryChip,
                category === cat.key && styles.categoryChipActive,
              ]}
              onPress={() => setCategory(cat.key)}
            >
              <FontAwesome
                name={cat.icon}
                size={16}
                color={category === cat.key ? BLUE : "#fff"}
              />
              <Text
                style={[
                  styles.categoryText,
                  category === cat.key && styles.categoryTextActive,
                ]}
                numberOfLines={1}
              >
                {categoryLabel(cat.key)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Subject */}
        <Text style={[styles.label, dir]}>{t("feedback.subject")}</Text>
        <TextInput
          style={[styles.input, dir]}
          value={subject}
          onChangeText={setSubject}
          placeholder={t("feedback.subjectPlaceholder")}
          placeholderTextColor="rgba(255,255,255,0.4)"
          editable={!loading}
          maxLength={200}
        />

        {/* Message */}
        <Text style={[styles.label, dir]}>{t("feedback.message")}</Text>
        <TextInput
          style={[styles.textArea, dir]}
          value={message}
          onChangeText={setMessage}
          placeholder={t("feedback.placeholder")}
          placeholderTextColor="rgba(255,255,255,0.4)"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          editable={!loading}
          maxLength={2000}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <FontAwesome name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitText}>{t("feedback.submit")}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: BLUE },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    flex: 1,
    color: "#fff",
    fontSize: 22,
    fontFamily: "Tajawal-Bold",
    textAlign: "center",
  },
  label: {
    color: YELLOW,
    fontSize: 15,
    fontFamily: "Tajawal-Medium",
    marginBottom: 8,
    marginTop: 16,
  },
  categoryRow: {
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: YELLOW,
    borderColor: YELLOW,
  },
  categoryText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Tajawal-Medium",
  },
  categoryTextActive: {
    color: BLUE,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.4)",
    color: "#fff",
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Tajawal-Regular",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 12,
    color: "#fff",
    padding: 14,
    fontSize: 15,
    fontFamily: "Tajawal-Regular",
    minHeight: 140,
  },
  submitBtn: {
    backgroundColor: YELLOW,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    elevation: 3,
  },
  submitText: {
    color: "#fff",
    fontFamily: "Tajawal-Bold",
    fontSize: 17,
  },
});
