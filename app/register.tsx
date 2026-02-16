// app/register.tsx ✅ wie index.tsx: Arabisch = LTR, Englisch = RTL (effectiveRTL = !isRTL)

import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import TermsModal from "../components/TermsModal";
import RtlTextInput from "../components/ui/rtl-textinput";
import { useLanguage } from "../contexts/LanguageContext";
import { authAPI } from "../services/api";

export default function Register() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();

  // ✅ GENAU WIE BEI LOGIN:
  // Arabisch (isRTL=true) => effectiveRTL=false => LTR
  // Englisch (isRTL=false) => effectiveRTL=true => RTL
  const effectiveRTL = !isRTL;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tos, setTos] = useState(false);
  const [news, setNews] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const dir = useMemo(
    () => ({
      textAlign: (effectiveRTL ? "right" : "left") as const,
      writingDirection: (effectiveRTL ? "rtl" : "ltr") as const,
    }),
    [effectiveRTL]
  );

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const validatePassword = (value: string) => {
    if (value.length < 8) return false;
    if (!/[0-9]/.test(value)) return false;
    if (!/[A-Z]/.test(value)) return false;
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return false;
    return true;
  };

  const validatePhoneNumber = (value: string) => {
    const phoneRegex = /^\+?[0-9\s-]{10,}$/;
    return phoneRegex.test(value.trim());
  };

  const onSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert(t("errors.error"), t("errors.enterFullName"));
      return;
    }

    if (!email.trim()) {
      Alert.alert(t("errors.error"), t("errors.enterEmail"));
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert(t("errors.error"), t("errors.invalidEmailFormat"));
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert(
        t("errors.error"),
        t("errors.enterPhoneNumber") || "Please enter your phone number"
      );
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert(
        t("errors.error"),
        t("errors.invalidPhoneFormat") || "Invalid phone number format"
      );
      return;
    }

    if (!password) {
      Alert.alert(t("errors.error"), t("errors.enterPassword"));
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert(
        t("errors.error"),
        t("errors.passwordRequirements") ||
          "Password must be at least 8 characters and contain a number, uppercase letter, and special character"
      );
      return;
    }

    if (!tos) {
      Alert.alert(t("errors.error"), t("errors.mustAgreeToTerms"));
      return;
    }

    setLoading(true);

    try {
      await authAPI.register({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
      });

      // Navigate to verify-pending page instead of auto-login
      // User needs to verify email before they can login
      router.replace({
        pathname: "/verify-pending",
        params: { email: email.trim() },
      });
    } catch (error: any) {
      if (error.response?.status === 400) {
        Alert.alert(t("errors.error"), t("errors.emailAlreadyRegistered"));
      } else if (
        error.code === "ECONNABORTED" ||
        error.message?.includes("timeout")
      ) {
        Alert.alert(t("errors.error"), t("errors.connectionTimeout"));
      } else if (error.message?.includes("Network Error")) {
        Alert.alert(t("errors.error"), t("errors.connectionError"));
      } else {
        Alert.alert(
          t("errors.error"),
          error.response?.data?.detail || t("errors.registerError")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
       <Text style={[styles.title, { width: "100%", textAlign: "center" }]}>
        {t("auth.register")}
            </Text>


        {/* Full Name */}
        <View style={styles.field}>
          <Text style={[styles.label, styles.fullWidthText, dir]}>
            {t("auth.fullName")}
          </Text>
          <RtlTextInput
            isRTL={effectiveRTL}
            style={[styles.input, dir]}
            value={fullName}
            onChangeText={setFullName}
            placeholder={t("auth.fullNamePlaceholder")}
            placeholderTextColor="#AAB3C0"
            editable={!loading}
          />
        </View>

        {/* Email */}
        <View style={styles.field}>
          <Text style={[styles.label, styles.fullWidthText, dir]}>
            {t("auth.email")}
          </Text>
          <RtlTextInput
            isRTL={effectiveRTL}
            style={[styles.input, dir]}
            value={email}
            onChangeText={setEmail}
            placeholder={t("auth.emailPlaceholder")}
            placeholderTextColor="#AAB3C0"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        {/* Phone */}
        <View style={styles.field}>
          <Text style={[styles.label, styles.fullWidthText, dir]}>
            {t("auth.phone")}
          </Text>
          <RtlTextInput
            isRTL={effectiveRTL}
            style={[styles.input, dir]}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder={t("auth.phonePlaceholder")}
            placeholderTextColor="#AAB3C0"
            keyboardType="phone-pad"
            editable={!loading}
          />
        </View>

        {/* Password */}
        <View style={styles.field}>
          <Text style={[styles.label, styles.fullWidthText, dir]}>
            {t("auth.password")}
          </Text>

          <View style={styles.passwordContainer}>
            <RtlTextInput
              isRTL={effectiveRTL}
              style={[
                styles.input,
                dir,
                {
                  paddingRight: effectiveRTL ? 12 : 44,
                  paddingLeft: effectiveRTL ? 44 : 12,
                },
              ]}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.passwordPlaceholder")}
              placeholderTextColor="#AAB3C0"
              secureTextEntry={!showPassword}
              editable={!loading}
            />

            <TouchableOpacity
              style={[
                styles.eyeTouch,
                effectiveRTL ? { left: 8 } : { right: 8 },
              ]}
              onPress={() => setShowPassword((v) => !v)}
              disabled={loading}
            >
              <FontAwesome
                name={showPassword ? "eye" : "eye-slash"}
                size={18}
                color="#AAB3C0"
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.passwordHint, styles.fullWidthText, dir]}>
            {t("errors.passwordRequirements") ||
              "8+ chars, number, uppercase, special char"}
          </Text>
        </View>

        {/* Switches */}
        <View
          style={[
            styles.switchRow,
            { flexDirection: effectiveRTL ? "row-reverse" : "row" },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchText, styles.fullWidthText, dir]}>
              {t("auth.agreeToTerms")}{" "}
              <Text
                style={{ color: '#FFD700', textDecorationLine: 'underline' }}
                onPress={() => setShowTerms(true)}
              >
                {t("terms.viewTerms")}
              </Text>
            </Text>
          </View>
          <Switch value={tos} onValueChange={setTos} disabled={loading} />
        </View>

        <View
          style={[
            styles.switchRow,
            { flexDirection: effectiveRTL ? "row-reverse" : "row" },
          ]}
        >
          <Text style={[styles.switchText, styles.fullWidthText, dir]}>
            {t("auth.receiveNews")}
          </Text>
          <Switch value={news} onValueChange={setNews} disabled={loading} />
        </View>

        {/* Button */}
        <TouchableOpacity
          style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
          onPress={onSubmit}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryText}>{t("auth.createAccount")}</Text>
          )}
        </TouchableOpacity>

        {/* Back to login */}
        <TouchableOpacity
          style={{ width: "100%", alignItems: "center", marginTop: 20 }}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.backToLogin}>
            {t("auth.alreadyHaveAccount")} {t("auth.login")}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <TermsModal
        visible={showTerms}
        onClose={() => setShowTerms(false)}
        showAcceptButton={!tos}
        onAccept={() => {
          setTos(true);
          setShowTerms(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: "#0D2B66" },

  container: {
    flexGrow: 1,
    backgroundColor: "#0D2B66",
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // ✅ damit textAlign sichtbar ist
  fullWidthText: { width: "100%" },

  title: {
    color: "#fff",
    fontSize: 28,
    fontFamily: "Tajawal-Bold",
    textAlign: "center",
    marginBottom: 30,
    width: "100%",
  },

  field: { marginBottom: 18, width: "100%" },

  label: {
    color: "#F4B400",
    fontSize: 16,
    fontFamily: "Tajawal-Medium",
    marginBottom: 8,
  },

  input: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.4)",
    color: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    width: "100%",
    fontFamily: "Tajawal-Regular",
    // ❌ NICHT fix RTL setzen
    // writingDirection: "rtl",
  },

  passwordContainer: {
    width: "100%",
    position: "relative",
    justifyContent: "center",
  },

  eyeTouch: { position: "absolute", top: 6, padding: 6 },

  passwordHint: {
    color: "#AAB3C0",
    fontSize: 12,
    marginTop: 4,
    fontFamily: "Tajawal-Regular",
  },

  switchRow: {
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    width: "100%",
  },

  switchText: {
    color: "#fff",
    flex: 1,
    marginHorizontal: 8,
    fontFamily: "Tajawal-Regular",
  },

  primaryBtn: {
    backgroundColor: "#F4B400",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
    elevation: 3,
    width: "100%",
  },

  primaryText: {
    color: "#fff",
    fontFamily: "Tajawal-Bold",
    fontSize: 18,
  },

  backToLogin: {
    color: "#A8C6FA",
    textDecorationLine: "underline",
    fontFamily: "Tajawal-Regular",
    fontSize: 15,
    textAlign: "center",
  },
});
