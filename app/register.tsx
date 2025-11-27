// app/register.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    I18nManager,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { authAPI } from '../services/api';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function Register() {
    const router = useRouter();
    const { setUser } = useAuth();
    const { t } = useLanguage();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [tos, setTos] = useState(false);
    const [news, setNews] = useState(false);
    const [loading, setLoading] = useState(false);

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password: string) => {
        // At least 6 characters
        return password.length >= 6;
    };

    const onSubmit = async () => {
        // Validation
        if (!fullName.trim()) {
            Alert.alert(t('errors.error'), t('errors.enterFullName'));
            return;
        }

        if (!email.trim()) {
            Alert.alert(t('errors.error'), t('errors.enterEmail'));
            return;
        }

        if (!validateEmail(email)) {
            Alert.alert(t('errors.error'), t('errors.invalidEmailFormat'));
            return;
        }

        if (!password) {
            Alert.alert(t('errors.error'), t('errors.enterPassword'));
            return;
        }

        if (!validatePassword(password)) {
            Alert.alert(t('errors.error'), t('errors.passwordMinLength'));
            return;
        }

        if (!tos) {
            Alert.alert(t('errors.error'), t('errors.mustAgreeToTerms'));
            return;
        }

        setLoading(true);

        try {
            // Register user
            const registeredUser = await authAPI.register({
                email: email.trim(),
                password: password,
                full_name: fullName.trim(),
                phone_number: phoneNumber.trim() || undefined,
            });

            console.log('Registration successful:', registeredUser);

            // Auto-login after registration
            await authAPI.login({
                username: email.trim(),
                password: password,
            });

            // Get user profile
            const user = await authAPI.getProfile();
            
            // Update auth context
            setUser(user);

            Alert.alert(
                t('auth.registrationSuccess'),
                t('auth.accountCreated'),
                [
                    {
                        text: t('auth.ok'),
                        // AuthContext will handle navigation
                    }
                ]
            );

        } catch (error: any) {
            console.error('Registration error:', error);

            if (error.response?.status === 400) {
                Alert.alert(t('errors.error'), t('errors.emailAlreadyRegistered'));
            } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                Alert.alert(t('errors.error'), t('errors.connectionTimeout'));
            } else if (error.message?.includes('Network Error')) {
                Alert.alert(t('errors.error'), t('errors.connectionError'));
            } else {
                Alert.alert(t('errors.error'), error.response?.data?.detail || t('errors.registerError'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{t('auth.register')}</Text>

            <View style={styles.field}>
                <Text style={styles.label}>{t('auth.fullName')}</Text>
                <TextInput 
                    style={styles.input} 
                    value={fullName} 
                    onChangeText={setFullName} 
                    placeholder={t('auth.fullNamePlaceholder')} 
                    placeholderTextColor="#AAB3C0" 
                    textAlign="right" 
                    editable={!loading}
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>{t('auth.email')}</Text>
                <TextInput 
                    style={styles.input} 
                    value={email} 
                    onChangeText={setEmail} 
                    placeholder={t('auth.emailPlaceholder')} 
                    placeholderTextColor="#AAB3C0" 
                    textAlign="right"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>{t('auth.password')}</Text>
                <TextInput 
                    style={styles.input} 
                    value={password} 
                    onChangeText={setPassword} 
                    placeholder={t('auth.passwordMinLength')} 
                    placeholderTextColor="#AAB3C0" 
                    secureTextEntry 
                    textAlign="right"
                    editable={!loading}
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>{t('auth.phoneOptional')}</Text>
                <TextInput 
                    style={styles.input} 
                    value={phoneNumber} 
                    onChangeText={setPhoneNumber} 
                    placeholder={t('auth.phonePlaceholder')} 
                    placeholderTextColor="#AAB3C0" 
                    textAlign="right"
                    keyboardType="phone-pad"
                    editable={!loading}
                />
            </View>

            <View style={styles.switchRow}>
                <Text style={styles.switchText}>{t('auth.agreeToTerms')}</Text>
                <Switch value={tos} onValueChange={setTos} disabled={loading} />
            </View>
            <View style={styles.switchRow}>
                <Text style={styles.switchText}>{t('auth.receiveNews')}</Text>
                <Switch value={news} onValueChange={setNews} disabled={loading} />
            </View>

            <TouchableOpacity 
                style={[styles.primaryBtn, loading && { opacity: 0.6 }]} 
                onPress={onSubmit}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Text style={styles.primaryText}>{t('auth.createAccount')}</Text>
                )}
            </TouchableOpacity>

            {/* Unten: zurück zum Login – zentriert */}
            <TouchableOpacity 
                style={{ width: "100%", alignItems: "center", marginTop: 20 }} 
                onPress={() => router.back()}
                disabled={loading}
            >
                <Text style={styles.backToLogin}>{t('auth.alreadyHaveAccount')} {t('auth.login')}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: "#0D2B66", paddingHorizontal: 24, paddingVertical: 28, alignItems: "stretch", direction: "rtl" },
    title: { color: "#fff", fontSize: 24, fontFamily: "Tajawal-Bold", textAlign: "center", marginBottom: 24 },
    field: { marginBottom: 18 },
    label: { color: "#F4B400", fontSize: 16, fontFamily: "Tajawal-Medium", textAlign: "left", marginBottom: 8 },
    input: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.4)", color: "#fff", paddingVertical: 8, fontSize: 15 },
    switchRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
    switchText: { color: "#fff", flex: 1, textAlign: "left", marginHorizontal: 8 },
    primaryBtn: { backgroundColor: "#F4B400", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 18, elevation: 3 },
    primaryText: { color: "#fff", fontFamily: "Tajawal-Bold", fontSize: 16 },
    backToLogin: { color: "#A8C6FA", textDecorationLine: "underline", fontFamily: "Tajawal-Regular", fontSize: 15, textAlign: "center" },
});