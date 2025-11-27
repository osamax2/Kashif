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
import { authAPI } from '../services/api';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function Register() {
    const router = useRouter();
    const { setUser } = useAuth();
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
            Alert.alert('خطأ', 'الرجاء إدخال الاسم الكامل');
            return;
        }

        if (!email.trim()) {
            Alert.alert('خطأ', 'الرجاء إدخال البريد الإلكتروني');
            return;
        }

        if (!validateEmail(email)) {
            Alert.alert('خطأ', 'الرجاء إدخال بريد إلكتروني صحيح');
            return;
        }

        if (!password) {
            Alert.alert('خطأ', 'الرجاء إدخال كلمة المرور');
            return;
        }

        if (!validatePassword(password)) {
            Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }

        if (!tos) {
            Alert.alert('خطأ', 'يجب الموافقة على شروط الاستخدام وسياسة الخصوصية');
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
                'تم التسجيل بنجاح',
                'تم إنشاء حسابك بنجاح!',
                [
                    {
                        text: 'حسناً',
                        // AuthContext will handle navigation
                    }
                ]
            );

        } catch (error: any) {
            console.error('Registration error:', error);

            if (error.response?.status === 400) {
                Alert.alert('خطأ', 'البريد الإلكتروني مسجل بالفعل');
            } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                Alert.alert('خطأ', 'انتهت مهلة الاتصال. الرجاء المحاولة مرة أخرى');
            } else if (error.message?.includes('Network Error')) {
                Alert.alert('خطأ في الاتصال', 'تعذر الاتصال بالخادم. الرجاء التحقق من الاتصال بالإنترنت');
            } else {
                Alert.alert('خطأ', error.response?.data?.detail || 'حدث خطأ أثناء التسجيل');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>إنشاء حساب جديد</Text>

            <View style={styles.field}>
                <Text style={styles.label}>الاسم الكامل</Text>
                <TextInput 
                    style={styles.input} 
                    value={fullName} 
                    onChangeText={setFullName} 
                    placeholder="اكتب اسمك الكامل" 
                    placeholderTextColor="#AAB3C0" 
                    textAlign="right" 
                    editable={!loading}
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>البريد الإلكتروني</Text>
                <TextInput 
                    style={styles.input} 
                    value={email} 
                    onChangeText={setEmail} 
                    placeholder="example@email.com" 
                    placeholderTextColor="#AAB3C0" 
                    textAlign="right"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>كلمة المرور</Text>
                <TextInput 
                    style={styles.input} 
                    value={password} 
                    onChangeText={setPassword} 
                    placeholder="6 أحرف على الأقل" 
                    placeholderTextColor="#AAB3C0" 
                    secureTextEntry 
                    textAlign="right"
                    editable={!loading}
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>رقم الهاتف (اختياري)</Text>
                <TextInput 
                    style={styles.input} 
                    value={phoneNumber} 
                    onChangeText={setPhoneNumber} 
                    placeholder="+966 XX XXX XXXX" 
                    placeholderTextColor="#AAB3C0" 
                    textAlign="right"
                    keyboardType="phone-pad"
                    editable={!loading}
                />
            </View>

            <View style={styles.switchRow}>
                <Text style={styles.switchText}>أوافق على شروط الاستخدام وسياسة الخصوصية</Text>
                <Switch value={tos} onValueChange={setTos} disabled={loading} />
            </View>
            <View style={styles.switchRow}>
                <Text style={styles.switchText}>أرغب في استلام آخر الأخبار والعروض عبر البريد الإلكتروني</Text>
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
                    <Text style={styles.primaryText}>تسجيل حساب جديد</Text>
                )}
            </TouchableOpacity>

            {/* Unten: zurück zum Login – zentriert */}
            <TouchableOpacity 
                style={{ width: "100%", alignItems: "center", marginTop: 20 }} 
                onPress={() => router.back()}
                disabled={loading}
            >
                <Text style={styles.backToLogin}>لديك حساب؟ سجل الدخول</Text>
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