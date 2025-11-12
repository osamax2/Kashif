import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import GlassButton from '../../components/ui/glass-button';
import {
  Alert,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
// RTL aktivieren
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function ProfileScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!I18nManager.isRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
    }
  }, []);

  const isValidEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value);

  const handleReset = async () => {
    if (!isValidEmail(email)) {
      Alert.alert("خطأ", "الرجاء إدخال بريد إلكتروني صالح.");
      return;
    }

    setSending(true);
    try {
      await new Promise((res) => setTimeout(res, 1000));
      Alert.alert(
          "تم",
          "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني."
      );
      router.push("/login");
    } catch (e) {
      Alert.alert("خطأ", "حدث خطأ أثناء الطلب. حاول مرة أخرى.");
    } finally {
      setSending(false);
    }
  };

  return (
      <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inner}>
            <Text style={styles.title}>نسيت كلمة المرور</Text>

            <Text style={styles.info}>
              أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور
            </Text>

            <View style={styles.form}>
              <Text style={styles.label}>البريد الإلكتروني</Text>

              <View style={styles.inputRow}>
                <FontAwesome
                    name="envelope"
                    size={18}
                    color="#FFFFFF"
                    style={styles.inputIcon}
                />
                <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email@address.com"
                    placeholderTextColor="#DCE8FF"
                    keyboardType="email-address"
                    style={styles.input}
                />
              </View>

              <GlassButton
                  containerStyle={[
                    styles.button,
                    (!isValidEmail(email) || sending) && styles.buttonDisabled,
                  ]}
                  onPress={handleReset}
                  disabled={!isValidEmail(email) || sending}
              >
                <Text style={styles.buttonText}>
                  {sending ? "...جاري الإرسال" : "إعادة تعيين كلمة المرور"}
                </Text>
              </GlassButton>

              <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.backContainer}
              >
                <Text style={styles.backLink}>العودة إلى تسجيل الدخول</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#0D2B66",
    alignItems: "flex-end", // alles nach rechts
    paddingVertical: 80,
    paddingHorizontal: 28,
  },
  inner: {
    width: "100%",
    alignItems: "flex-end", // Inhalte rechtsbündig
    direction: "rtl",
  },
  title: {
    fontFamily: "Tajawal-Bold",
    color: "#FFFFFF",
    fontSize: 26,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 12,
    alignSelf: "flex-end",
  },
  info: {
    fontFamily: "Tajawal-Regular",
    color: "#F4B400",
    textAlign: "right",
    fontSize: 14,
    lineHeight: 22,
    writingDirection: "rtl",
    marginBottom: 30,
    alignSelf: "flex-end",
  },
  form: {
    width: "100%",
    alignItems: "flex-end",
  },
  label: {
    width: "100%",
    fontFamily: "Tajawal-Regular",
    color: "#F4B400",
    fontSize: 16,
    marginBottom: 8,
    textAlign: "right",
    writingDirection: "rtl",
    alignSelf: "flex-end",
  },
  inputRow: {
    width: "100%",
    backgroundColor: "#6F9BEA",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row-reverse", // Icon rechts, Text links
    alignItems: "center",
    marginBottom: 14,
  },
  inputIcon: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontFamily: "Tajawal-Regular",
    textAlign: "right",
    writingDirection: "rtl",
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#F4B400",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 8,
    elevation: 5,
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#0D2B66",
    fontFamily: "Tajawal-Bold",
    fontSize: 16,
    textAlign: "center",
  },
  backContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 28,
  },
  backLink: {
    color: "#DDE9FF",
    textDecorationLine: "underline",
    fontFamily: "Tajawal-Regular",
    fontSize: 15,
  },
});