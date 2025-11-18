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
import RtlTextInput from '../components/ui/rtl-textinput';
//router.replace("/(tabs)/home");
export default function Index() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header (logo + app name) */}
        <View style={styles.header}>
          <Image
              source={require("../assets/images/icon.png")}
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

              </View>
            </View>

            {/* Index-Button */}
            <TouchableOpacity
                style={styles.loginButton}
                activeOpacity={0.9}
                onPress={() => router.replace('/(tabs)/home')} // ← wichtig: replace
            >
              <Text style={styles.loginButtonText}>تسجيل الدخول</Text>
            </TouchableOpacity>

            {/* --- Social Login --- */}
            <Text style={styles.orText}>أو سجل باستخدام</Text>

            {/* WHATSAPP + GOOGLE */}
            <View style={styles.socialRow}>
              {/* WhatsApp */}
              <TouchableOpacity style={[styles.socialButtonModern, { backgroundColor: "#25D366" }]}>
                <FontAwesome name="whatsapp" size={20} color="#fff" style={{ marginLeft: 8 }} />
                <Text style={styles.socialTextModern}>WhatsApp</Text>
              </TouchableOpacity>

              {/* Google */}
              <TouchableOpacity style={[styles.socialButtonModern, { backgroundColor: "rgba(206,43,33,0.92)" }]}>
                <Image
                    source={require("../assets/icons/google.png")}
                    style={{ width: 22, height: 22, marginLeft: 8 }}
                />
                <Text style={styles.socialTextModern}>Google</Text>
              </TouchableOpacity>
            </View>

            {/* Apple – zentriert */}
            <TouchableOpacity style={styles.appleButton}>
              <FontAwesome name="apple" size={24} color="#fff" style={{ marginLeft: -3 }} />
              <Text style={styles.appleText}>تسجيل الدخول باستخدام Apple</Text>
            </TouchableOpacity>



            {/* Links unten */}
            <View style={styles.linksContainer}>
              <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/register')}>
                {/* plus-icon bleibt optional */}
                { <FontAwesome name="plus-circle" size={14} color="#F4B400" style={I18nManager.isRTL ? { marginRight: 6 } : { marginLeft: 6 }} /> }
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
    backgroundColor: "#033076", // Dunkelblau
    // Alles physisch nach links
    alignItems: "flex-end",
    justifyContent: "center",
    paddingVertical: 45,
    paddingHorizontal: 20,
    direction: 'ltr',
  },
  header: {
    width: "100%",
    flexDirection: "row", // LTR: logo left, text right
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 14,
    paddingBottom: 15,
  },
  logoHeader: {
    width: 140,
    height: 140,
    marginRight: 17,
  },
  headerText: {
    flex: -1,
    alignItems: "flex-end",
  },
  appName: {
    color: "#FFFFFF",
    fontSize: 70,
    fontWeight: "800",
    textAlign: "left",
    writingDirection: 'ltr',
    includeFontPadding: false,
    fontFamily: 'Tajawal-Bold',
  },
  appTag: {
    color: "#BFD7EA",
    fontSize: 25,
    textAlign: "left",
    writingDirection: 'ltr',
    includeFontPadding: false,
    fontFamily: 'Tajawal-Regular',
  },
  title: {
    fontSize: 25,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: -4,
    textAlign: "left",
    writingDirection: 'ltr',
    includeFontPadding: false,
    fontFamily: 'Tajawal-Bold',
    marginVertical: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#BFD7EA",
    marginBottom: 30,
    textAlign: "left",
    writingDirection: 'ltr',
    includeFontPadding: false,
    fontFamily: 'Tajawal-Regular',
  },
  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 18,
    display: "flex",
    alignItems: 'flex-end',
    direction:"ltr",
    marginTop: 1,
    marginBottom: 20,
  },
  field: { 
    width: "100%", 
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  form: {
    display: 'flex',
    width: '100%',
    alignItems: 'flex-end',
  },
  label: {
    alignSelf: 'flex-end',
    textAlign: 'left',
    writingDirection:'ltr',
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
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontSize: 14,
    alignSelf: 'flex-end',
  },
  passwordContainer: {
    width: "100%",
    position: "relative",
    justifyContent: "center",
  },
  eyeTouch: {
    position: "absolute",
    top: 6,
    left: 8,
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
    shadowColor: "#ffffff",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3, // Android shadow
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 24,
    textAlign: "left",
    writingDirection: 'ltr',
    fontFamily: 'Tajawal-Medium',
  },
  boltIcon: { marginLeft: 8, backgroundColor: "#FFFFFF", padding: 2, borderRadius: 6 },
  orText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginVertical: 15,
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

  socialText: {
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "left",
    writingDirection: 'ltr',
    includeFontPadding: false,
    fontFamily: 'Tajawal-Medium',
  },
  linksContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
  },
  linkRow: { flexDirection: "row", alignItems: "center" ,marginTop: 13,},
  link: {
    color: "#FFFFFF",
    fontSize: 14,
    textDecorationLine: "underline",
    textAlign: "left",
    writingDirection: 'ltr',
    includeFontPadding: false,
    fontFamily: 'Tajawal-Regular',
    marginTop: 10,

  },
  google: {
    backgroundColor: "rgb(185,66,70)", // Google Red
  },


  socialButtonModern: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 6,
    elevation: 3,
  },

  socialTextModern: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Tajawal-Medium",
  },

  appleButton: {
    width: "100%",
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },

  appleText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Tajawal-Bold",
    marginHorizontal: 8,
  },

});
