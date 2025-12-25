// app/index.tsx ✅ VOLLSTÄNDIG – UMGEKEHRT wie du willst:
// Arabisch = LTR  |  Englisch = RTL

import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import RtlTextInput from "../components/ui/rtl-textinput";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { authAPI } from "../services/api";

export default function Index() {
  const router = useRouter();
  const { setUser } = useAuth();
  const { t, isRTL } = useLanguage();

  // ✅ UMGEKEHRT:
  // Wenn LanguageContext isRTL=true (normal Arabisch), machen wir effektiv LTR.
  // Wenn LanguageContext isRTL=false (normal Englisch), machen wir effektiv RTL.
  const effectiveRTL = !isRTL;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const dir = useMemo(
    () => ({
      textAlign: (effectiveRTL ? "right" : "left") as const,
      writingDirection: (effectiveRTL ? "rtl" : "ltr") as const,
    }),
    [effectiveRTL]
  );

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t("errors.error"), t("errors.enterEmailPassword"));
      return;
    }
    if (!email.includes("@")) {
      Alert.alert(t("errors.error"), t("errors.invalidEmailFormat"));
      return;
    }

    setLoading(true);
    try {
      await authAPI.login({ username: email, password });
      const user = await authAPI.getProfile();
      setUser(user);
    } catch (error: any) {
      if (error.response?.status === 401) {
        Alert.alert(t("errors.error"), t("errors.invalidCredentials"));
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
          error.response?.data?.detail || t("errors.loginError")
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
        {/* HEADER */}
        <View
          style={[
            styles.header,
            { flexDirection: effectiveRTL ? "row-reverse" : "row" },
          ]}
        >
          <Image
            source={require("../assets/images/icon.png")}
            style={[
              styles.logoHeader,
              effectiveRTL
                ? { marginLeft: 12, marginRight: 0 }
                : { marginRight: 12, marginLeft: 0 },
            ]}
            resizeMode="contain"
          />

          <View
            style={[
              styles.headerText,
              { alignItems: effectiveRTL ? "flex-end" : "flex-start" },
            ]}
          >
            <Text style={[styles.appName, dir]}>{t("auth.appName")}</Text>
            <Text style={[styles.appTag, dir]}>{t("auth.appTagline")}</Text>
          </View>
        </View>

        {/* CARD */}
        <View
          style={[
            styles.card,
            { alignItems: effectiveRTL ? "flex-end" : "flex-start" },
          ]}
        >
          <Text style={[styles.title, dir]}>{t("auth.login")}</Text>
          <Text style={[styles.subtitle, dir]}>{t("auth.welcomeBack")}</Text>

          <View style={styles.form}>
            {/* EMAIL */}
            <View style={styles.field}>
              <Text style={[styles.label, dir]}>{t("auth.email")}</Text>

              <RtlTextInput
                // ✅ UMGEKEHRT Richtung rein geben
                isRTL={effectiveRTL}
                value={email}
                onChangeText={setEmail}
                placeholder={t("auth.emailPlaceholder")}
                placeholderTextColor="#AAB3C0"
                style={[styles.inputUnderline, dir]}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* PASSWORD */}
            <View style={styles.field}>
              <Text style={[styles.label, dir]}>{t("auth.password")}</Text>

              <View style={styles.passwordContainer}>
                <RtlTextInput
                  isRTL={effectiveRTL}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("auth.passwordPlaceholder")}
                  placeholderTextColor="#AAB3C0"
                  style={[
                    styles.inputUnderline,
                    dir,
                    {
                      paddingRight: effectiveRTL ? 12 : 44,
                      paddingLeft: effectiveRTL ? 44 : 12,
                    },
                  ]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TouchableOpacity
                  style={[
                    styles.eyeTouch,
                    effectiveRTL ? { left: 6 } : { right: 6 },
                  ]}
                  onPress={() => setShowPassword((v) => !v)}
                  activeOpacity={0.8}
                >
                  <FontAwesome
                    name={showPassword ? "eye" : "eye-slash"}
                    size={18}
                    color="#AAB3C0"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* LOGIN */}
            <TouchableOpacity
              style={[styles.loginButton, loading && { opacity: 0.6 }]}
              activeOpacity={0.9}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>{t("auth.login")}</Text>
              )}
            </TouchableOpacity>

            {/* LINKS */}
            <View
              style={[
                styles.linksContainer,
                { flexDirection: effectiveRTL ? "row-reverse" : "row" },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.linkRow,
                  { flexDirection: effectiveRTL ? "row-reverse" : "row" },
                ]}
                onPress={() => router.push("/register")}
              >
                <FontAwesome
                  name="plus-circle"
                  size={14}
                  color="#F4B400"
                  style={effectiveRTL ? { marginLeft: 6 } : { marginRight: 6 }}
                />
                <Text style={[styles.link, dir]}>
                  {t("auth.createNewAccount")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.linkRow,
                  { flexDirection: effectiveRTL ? "row-reverse" : "row" },
                ]}
                onPress={() => router.push("/forgot")}
              >
                <FontAwesome
                  name="question-circle"
                  size={14}
                  color="#F4B400"
                  style={effectiveRTL ? { marginLeft: 6 } : { marginRight: 6 }}
                />
                <Text style={[styles.link, dir]}>
                  {t("auth.forgotPassword")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: "#033076" },

  container: {
    flexGrow: 1,
    backgroundColor: "#033076",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  header: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 18,
    marginTop: -10,
  },

  logoHeader: { width: 140, height: 140 },

  headerText: {},

  appName: {
    color: "#FFFFFF",
    fontSize: 70,
    fontWeight: "800",
    includeFontPadding: false,
    fontFamily: "Tajawal-Bold",
  },

  appTag: {
    color: "#BFD7EA",
    fontSize: 25,
    includeFontPadding: false,
    fontFamily: "Tajawal-Regular",
  },

  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 18,
    marginTop: 10,
    marginBottom: 20,
  },

  title: {
    fontSize: 25,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: -4,
    includeFontPadding: false,
    fontFamily: "Tajawal-Bold",
    marginVertical: 6,
  },

  subtitle: {
    fontSize: 14,
    color: "#BFD7EA",
    marginBottom: 30,
    includeFontPadding: false,
    fontFamily: "Tajawal-Regular",
  },

  form: { width: "100%" },
  field: { width: "100%", marginBottom: 14 },

  label: {
    color: "#F4B400",
    marginBottom: 8,
    fontSize: 16,
    fontFamily: "Tajawal-Medium",
    includeFontPadding: false,
  },

  inputUnderline: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.4)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: "#FFFFFF",
    includeFontPadding: false,
    textAlignVertical: "center",
    fontSize: 14,
    fontFamily: "Tajawal-Regular",
  },

  passwordContainer: {
    width: "100%",
    position: "relative",
    justifyContent: "center",
  },

  eyeTouch: {
    position: "absolute",
    top: 4,
    padding: 8,
  },

  loginButton: {
    backgroundColor: "#F4B400",
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    marginTop: 18,
    marginBottom: 12,
    shadowColor: "#ffffff",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  loginButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 24,
    fontFamily: "Tajawal-Medium",
  },

  linksContainer: {
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
  },

  linkRow: { alignItems: "center", marginTop: 13 },

  link: {
    color: "#FFFFFF",
    fontSize: 14,
    textDecorationLine: "underline",
    includeFontPadding: false,
    fontFamily: "Tajawal-Regular",
    marginTop: 10,
  },
});
