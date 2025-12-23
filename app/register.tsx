// app/register.tsx
import { FontAwesome } from "@expo/vector-icons";
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
    TouchableOpacity,
    View
} from "react-native";
import RtlTextInput from '../components/ui/rtl-textinput';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { authAPI } from '../services/api';

export default function Register() {
    const router = useRouter();
    const { setUser } = useAuth();
    const { t, isRTL } = useLanguage();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [tos, setTos] = useState(false);
    const [news, setNews] = useState(false);
    const [loading, setLoading] = useState(false);

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password: string) => {
        // At least 8 characters, must have number, uppercase letter, and special character
        if (password.length < 8) return false;
        if (!/[0-9]/.test(password)) return false; // Must have number
        if (!/[A-Z]/.test(password)) return false; // Must have uppercase
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false; // Must have special char
        return true;
    };
    
    const validatePhoneNumber = (phone: string) => {
        // Simple validation: at least 10 digits
        const phoneRegex = /^\+?[0-9\s-]{10,}$/;
        return phoneRegex.test(phone.trim());
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

        // Phone number is required
        if (!phoneNumber.trim()) {
            Alert.alert(t('errors.error'), t('errors.enterPhoneNumber') || 'Please enter your phone number');
            return;
        }
        
        if (!validatePhoneNumber(phoneNumber)) {
            Alert.alert(t('errors.error'), t('errors.invalidPhoneFormat') || 'Invalid phone number format');
            return;
        }

        if (!password) {
            Alert.alert(t('errors.error'), t('errors.enterPassword'));
            return;
        }

        if (!validatePassword(password)) {
            Alert.alert(
                t('errors.error'), 
                t('errors.passwordRequirements') || 'Password must be at least 8 characters and contain a number, uppercase letter, and special character'
            );
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
                phone_number: phoneNumber.trim(),
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

            {/* 1. Full Name */}
            <View style={styles.field}>
                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.fullName')}</Text>
                <RtlTextInput 
                    style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                    value={fullName} 
                    onChangeText={setFullName} 
                    placeholder={t('auth.fullNamePlaceholder')} 
                    placeholderTextColor="#AAB3C0" 
                    textAlign={isRTL ? 'right' : 'left'}
                    editable={!loading}
                />
            </View>

            {/* 2. Email */}
            <View style={styles.field}>
                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.email')}</Text>
                <RtlTextInput 
                    style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                    value={email} 
                    onChangeText={setEmail} 
                    placeholder={t('auth.emailPlaceholder')} 
                    placeholderTextColor="#AAB3C0" 
                    textAlign={isRTL ? 'right' : 'left'}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                />
            </View>

            {/* 3. Phone */}
            <View style={styles.field}>
                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.phone')}</Text>
                <RtlTextInput 
                    style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                    value={phoneNumber} 
                    onChangeText={setPhoneNumber} 
                    placeholder={t('auth.phonePlaceholder')} 
                    placeholderTextColor="#AAB3C0" 
                    textAlign={isRTL ? 'right' : 'left'}
                    keyboardType="phone-pad"
                    editable={!loading}
                />
            </View>

            {/* 4. Password */}
            <View style={styles.field}>
                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.password')}</Text>
                <View style={styles.passwordContainer}>
                    <RtlTextInput 
                        style={[styles.input, { textAlign: isRTL ? 'right' : 'left', paddingRight: isRTL ? 12 : 40, paddingLeft: isRTL ? 40 : 12 }]}
                        value={password} 
                        onChangeText={setPassword} 
                        placeholder={t('auth.passwordPlaceholder')} 
                        placeholderTextColor="#AAB3C0" 
                        secureTextEntry={!showPassword}
                        textAlign={isRTL ? 'right' : 'left'}
                        editable={!loading}
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
                <Text style={styles.passwordHint}>{t('errors.passwordRequirements') || '8+ chars, number, uppercase, special char'}</Text>
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
    container: { 
        flexGrow: 1, 
        backgroundColor: "#0D2B66", 
        paddingHorizontal: 24, 
        paddingVertical: 40, 
        alignItems: "center",
        justifyContent: "center",
    },
    title: { 
        color: "#fff", 
        fontSize: 28, 
        fontFamily: "Tajawal-Bold", 
        textAlign: "center", 
        marginBottom: 30,
        width: "100%",
    },
    field: { 
        marginBottom: 18,
        width: "100%",
    },
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
    passwordHint: {
        color: "#AAB3C0",
        fontSize: 12,
        marginTop: 4,
        fontFamily: "Tajawal-Regular",
        textAlign: I18nManager.isRTL ? "right" : "left",
    },
    switchRow: { 
        flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
        alignItems: "center", 
        justifyContent: "space-between", 
        marginTop: 10,
        width: "100%",
    },
    switchText: { 
        color: "#fff", 
        flex: 1, 
        textAlign: I18nManager.isRTL ? "right" : "left",
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