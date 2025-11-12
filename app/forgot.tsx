import { ensureRTL, rtlStyles } from '@/constants/rtl';
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

// RTL nur einmal aktivieren
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function ForgotPassword() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [sending, setSending] = useState(false);

    useEffect(() => {
        ensureRTL();
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
            Alert.alert("تم", "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.");
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
                contentContainerStyle={[styles.container, rtlStyles.scrollContent]}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.title}>نسيت كلمة المرور</Text>

                <Text style={styles.info}>
                    أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور
                </Text>
                <View style={styles.form}>
                    <Text style={[styles.label, rtlStyles.textRight]}>البريد الإلكتروني</Text>

                    <View style={styles.inputRow}>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="email@address.com"
                            placeholderTextColor="#DCE8FF"
                            keyboardType="email-address"
                            style={[styles.input, rtlStyles.textRight]}
                            textAlign="right"
                        />
                        <FontAwesome name="envelope" size={18} color="#FFFFFF" style={styles.inputIcon} />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, (!isValidEmail(email) || sending) && styles.buttonDisabled]}
                        onPress={handleReset}
                        disabled={!isValidEmail(email) || sending}
                        activeOpacity={0.9}
                    >
                        <Text style={styles.buttonText}>
                            {sending ? "...جاري الإرسال" : "إعادة تعيين كلمة المرور"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => router.back()} style={{ width: '100%' }}>
                        <Text style={styles.backLink}>العودة إلى تسجيل الدخول</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#0D2B66',
        alignItems: 'flex-end', // Inhalt rechtsbündig
        justifyContent: 'flex-start',
        paddingVertical: 80,
        paddingHorizontal: 28,
        direction: 'rtl',
    },
    title: {
        fontFamily: "Tajawal-Bold",
        color: "#FFFFFF",
        fontSize: 26,
        textAlign: "right",
        writingDirection: "rtl",
        alignSelf: "flex-end",
        marginBottom: 12,
    },
    info: {
        fontFamily: "Tajawal-Regular",
        color: "#F4B400",
        fontSize: 14,
        textAlign: "right",
        writingDirection: "rtl",
        alignSelf: "flex-end",
        marginBottom: 30,
        lineHeight: 22,
    },
    form: {
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
    inputRow: {
        width: '100%',
        backgroundColor: '#6F9BEA',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row-reverse', // Icon rechts
        alignItems: 'center',
        marginBottom: 14,
    },
    inputIcon: {
        marginLeft: 8,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Tajawal-Regular',
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    button: {
        width: "100%",
        backgroundColor: "#F4B400",
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 8,
        elevation: 5,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: {
        color: "#0D2B66",
        fontFamily: "Tajawal-Bold",
        fontSize: 16,
        textAlign: "center",
        writingDirection: "rtl",
    },
    backLink: {
        color: "#A8C6FA",
        textDecorationLine: "underline",
        fontFamily: "Tajawal-Regular",
        fontSize: 15,
        writingDirection: "rtl",
        textAlign: "center", // Text zentriert
        alignSelf: "center", // gesamte Komponente mittig
        marginTop: 40,
        width: "100%", // nimmt volle Breite ein, damit der Text exakt mittig sitzt
    },

});

