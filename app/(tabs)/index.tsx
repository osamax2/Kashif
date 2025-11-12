import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from 'expo-router';
import React, { useState } from "react";
import {
  I18nManager,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import RtlTextInput from '../../components/ui/rtl-textinput';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function Index() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header (logo + app name) */}
        <View style={styles.header}>
          <Image
              source={require("../../assets/images/icon.png")}
              style={styles.logoHeader}
              resizeMode="contain"
          />
          <View style={styles.headerText}>
            <Text style={styles.appName}>كاشف</Text>
            <Text style={styles.appTag}>عينك على الطريق</Text>
          </View>
        </View>

        {/* Card / Form area */}
        <View style={styles.card}>
          <Text style={styles.title}>تسجيل الدخول</Text>
          <Text style={styles.subtitle}>مرحباً بعودتك</Text>

          {/* Form (wraps email, password, buttons, links) */}
          <View style={styles.form}>
            {/* E-Mail */}
            <View style={styles.field}>
              <Text style={styles.label}>البريد الإلكتروني</Text>
              <RtlTextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@email.com"
                  placeholderTextColor="#AAB3C0"
                  style={styles.inputUnderline}
                  textAlign="right"
              />
            </View>

            {/* Passwort */}
            <View style={styles.field}>
              <Text style={styles.label}>كلمة المرور</Text>
              <View style={styles.passwordContainer}>
                <RtlTextInput
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    style={styles.inputUnderline}
                    placeholder="••••••••"
                    placeholderTextColor="#AAB3C0"
                    textAlign="right"
                />
                <TouchableOpacity style={[styles.eyeTouch, I18nManager.isRTL ? { right: 8 } : { left: 8 }]}>
                  <Text style={styles.eyeIcon}>👁️</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login-Button */}
            <TouchableOpacity style={styles.loginButton} activeOpacity={0.9}>
              <Text style={styles.loginButtonText}>تسجيل الدخول</Text>
              <FontAwesome name="bolt" size={18} color="#0D2B66" style={[styles.boltIcon, I18nManager.isRTL ? { marginRight: 8 } : { marginLeft: 8 }]} />
            </TouchableOpacity>

            <Text style={styles.orText}>أو سجل باستخدام</Text>

            <View style={styles.socialRow}>
              <TouchableOpacity style={[styles.socialButton, styles.whatsapp]}>
                <FontAwesome name="whatsapp" size={18} color="#fff" style={I18nManager.isRTL ? { marginLeft: 8 } : { marginRight: 8 }} />
                <Text style={styles.socialText}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.socialButton, styles.facebook]}>
                <FontAwesome name="facebook" size={18} color="#fff" style={I18nManager.isRTL ? { marginLeft: 8 } : { marginRight: 8 }} />
                <Text style={styles.socialText}>Facebook</Text>
              </TouchableOpacity>
            </View>

            {/* Links unten */}
            <View style={styles.linksContainer}>
              <TouchableOpacity style={styles.linkRow}>
                <FontAwesome name="plus-circle" size={14} color="#F4B400" style={I18nManager.isRTL ? { marginRight: 6 } : { marginLeft: 6 }} />
                <Text style={styles.link}>أنشئ حسابًا جديدًا</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/forgot')}>
                <FontAwesome name="question-circle" size={14} color="#F4B400" style={I18nManager.isRTL ? { marginRight: 6 } : { marginLeft: 6 }} />
                <Text style={styles.link}>نسيت كلمة المرور؟</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#0D2B66", // Dunkelblau
    alignItems: "flex-start",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  header: {
    width: "100%",
    flexDirection: "row-reverse", // RTL: logo on the right
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 12,
    paddingBottom: 10,
  },
  logoHeader: {
    width: 110,
    height: 110,
    marginLeft: 12, // Platz zwischen Logo und Text (für row-reverse)
  },
  headerText: {
    flex: 1,
    alignItems: "flex-start", // Text rechts vom Logo (RTL)
  },
  appName: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: 'rtl',
    includeFontPadding: false,
    fontFamily: 'Tajawal-Bold',
  },
  appTag: {
    color: "#BFD7EA",
    fontSize: 14,
    textAlign: "right",
    writingDirection: 'rtl',
    includeFontPadding: false,
    fontFamily: 'Tajawal-Regular',
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 10,
    textAlign: "right",
    includeFontPadding: false,
    fontFamily: 'Tajawal-Bold',
  },
  subtitle: {
    fontSize: 14,
    color: "#BFD7EA",
    marginBottom: 30,
    textAlign: "right",
    includeFontPadding: false,
    fontFamily: 'Tajawal-Regular',
  },
  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 20,
    display: "flex",
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
    direction:"rtl",
    marginTop: 8,
    marginBottom: 20,
  },
  field: { width: "100%", marginBottom: 14, },//alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start' },
  form: {
    display: 'flex',
    width: '100%',
    //alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
  },
  label: {
    width: '100%',
    textAlign: 'right',
    writingDirection:'rtl',
    color: '#F4B400',
    marginBottom: 8,
    fontSize: 16,
    fontFamily: 'Tajawal-Medium',
    includeFontPadding: false,
  },
  inputUnderline: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.4)",
    paddingVertical: 8,
    paddingRight: 12,
    paddingLeft: 0,
    color: "#FFFFFF",
    textAlign: "right",
    writingDirection: 'rtl',
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontSize: 14,
  },
  passwordContainer: {
    width: "100%",
    position: "relative",
    justifyContent: "center",
  },
  eyeTouch: {
    position: "absolute",
    top: 6,
    padding: 6,
  },
  eyeIcon: {
    color: "#AAB3C0",
    fontSize: 18,
  },
  loginButton: {
    backgroundColor: "#F4B400",
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    marginTop: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3, // Android shadow
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    color: "#0D2B66",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "right",
    writingDirection: 'rtl',
    fontFamily: 'Tajawal-Medium',
  },
  boltIcon: { marginLeft: 8, backgroundColor: "#FFFFFF", padding: 2, borderRadius: 6 },
  orText: {
    color: "#FFFFFF",
    fontSize: 13,
    marginVertical: 10,
    textAlign: 'center',
    width: '100%',
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  whatsapp: {
    backgroundColor: "#25D366",
  },
  facebook: {
    backgroundColor: "#1877F2",
  },
  socialText: {
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "right",
    writingDirection: 'rtl',
    includeFontPadding: false,
    fontFamily: 'Tajawal-Medium',
  },
  linksContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
  },
  linkRow: { flexDirection: "row-reverse", alignItems: "center" },
  link: {
    color: "#FFFFFF",
    fontSize: 13,
    textDecorationLine: "underline",
    textAlign: "right",
    writingDirection: 'rtl',
    includeFontPadding: false,
    fontFamily: 'Tajawal-Regular',
  },
});
