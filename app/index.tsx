import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from 'expo-router';
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    I18nManager,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import RtlTextInput from '../components/ui/rtl-textinput';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { authAPI } from '../services/api';

export default function Index() {
  const router = useRouter();
  const { setUser } = useAuth();
  const { t, isRTL } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    // Validation
    if (!email || !password) {
      Alert.alert(t('errors.error'), t('errors.enterEmailPassword'));
      return;
    }

    if (!email.includes('@')) {
      Alert.alert(t('errors.error'), t('errors.invalidEmailFormat'));
      return;
    }

    setLoading(true);
    
    try {
      const response = await authAPI.login({
        username: email,
        password: password,
      });

      console.log('Login successful:', response);
      
      // Get user profile
      const user = await authAPI.getProfile();
      
      // Update auth context
      setUser(user);
      
      // Navigate to home (AuthContext will handle this)
      // router.replace('/(tabs)/home');
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.response?.status === 401) {
        Alert.alert(t('errors.error'), t('errors.invalidCredentials'));
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        Alert.alert(t('errors.error'), t('errors.connectionTimeout'));
      } else if (error.message?.includes('Network Error')) {
        Alert.alert(t('errors.error'), t('errors.connectionError'));
      } else {
        Alert.alert(t('errors.error'), error.response?.data?.detail || t('errors.loginError'));
      }
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={styles.appName}>{t('auth.appName')}</Text>
            <Text style={styles.appTag}>{t('auth.appTagline')}</Text>
          </View>
        </View>

        {/* Card / Form area */}
        <View style={styles.card}>
          <Text style={styles.title}>{t('auth.login')}</Text>
          <Text style={styles.subtitle}>{t('auth.welcomeBack')}</Text>

          {/* Form (wraps email, password, buttons, links) */}
          <View style={styles.form}>
            {/* E-Mail */}
            <View style={styles.field}>
              <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.email')}</Text>
              <RtlTextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('auth.emailPlaceholder')}
                  placeholderTextColor="#AAB3C0"
                  style={[styles.inputUnderline, { textAlign: isRTL ? 'right' : 'left' }]}
                  textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            {/* Passwort */}
            <View style={styles.field}>
              <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.password')}</Text>
              <View style={styles.passwordContainer}>
                <RtlTextInput
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    style={[styles.inputUnderline, { textAlign: isRTL ? 'right' : 'left', paddingRight: isRTL ? 12 : 40, paddingLeft: isRTL ? 40 : 12 }]}
                    placeholder={t('auth.passwordPlaceholder')}
                    placeholderTextColor="#AAB3C0"
                    textAlign={isRTL ? 'right' : 'left'}
                />
                <TouchableOpacity
                    style={[styles.eyeTouch, isRTL ? { left: 8 } : { right: 8 }]}
                    onPress={() => setShowPassword(!showPassword)}
                >
                  <FontAwesome
                      name={showPassword ? "eye" : "eye-slash"}
                      size={18}
                      color="#AAB3C0"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login-Button */}
            <TouchableOpacity
                style={[styles.loginButton, loading && { opacity: 0.6 }]}
                activeOpacity={0.9}
                onPress={handleLogin}
                disabled={loading}
            >
              {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                  <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
              )}
            </TouchableOpacity>

            {/* Links unten */}
            <View style={styles.linksContainer}>
              <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/register')}>
                {/* plus-icon bleibt optional */}
                { <FontAwesome name="plus-circle" size={14} color="#F4B400" style={I18nManager.isRTL ? { marginRight: 6 } : { marginLeft: 6 }} /> }
                <Text style={styles.link}>{t('auth.createNewAccount')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/forgot')}>
                <FontAwesome name="question-circle" size={14} color="#F4B400" style={I18nManager.isRTL ? { marginRight: 6 } : { marginLeft: 6 }} />
                <Text style={styles.link}>{t('auth.forgotPassword')}</Text>
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 45,
    paddingHorizontal: 20,
  },
  header: {
    width: "100%",
    flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
    alignItems: "center",
    justifyContent: I18nManager.isRTL ? "flex-end" : "flex-start",
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
    textAlign: I18nManager.isRTL ? "right" : "left",
    includeFontPadding: false,
    fontFamily: 'Tajawal-Bold',
  },
  appTag: {
    color: "#BFD7EA",
    fontSize: 25,
    textAlign: I18nManager.isRTL ? "right" : "left",
    includeFontPadding: false,
    fontFamily: 'Tajawal-Regular',
  },
  title: {
    fontSize: 25,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: -4,
    textAlign: I18nManager.isRTL ? "right" : "left",
    includeFontPadding: false,
    fontFamily: 'Tajawal-Bold',
    marginVertical: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#BFD7EA",
    marginBottom: 30,
    textAlign: I18nManager.isRTL ? "right" : "left",
    includeFontPadding: false,
    fontFamily: 'Tajawal-Regular',
  },
  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 18,
    display: "flex",
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
    marginTop: 1,
    marginBottom: 20,
  },
  field: { 
    width: "100%", 
    marginBottom: 14,
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
  },
  form: {
    display: 'flex',
    width: '100%',
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
  },
  label: {
    alignSelf: I18nManager.isRTL ? 'flex-end' : 'flex-start',
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
    paddingHorizontal: 12,
    color: "#FFFFFF",
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
