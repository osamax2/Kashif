// app/verify-code.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useLanguage } from "../contexts/LanguageContext";
import { authAPI } from "../services/api";

const BLUE = "#0D2B66";

export default function VerifyCodeScreen() {
    const { t, isRTL } = useLanguage();
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const inputs = useRef<Array<TextInput | null>>([]);
    const router = useRouter();
    const { email } = useLocalSearchParams<{ email: string }>();

    const handleChange = (value: string, index: number) => {
        const digit = value.replace(/[^0-9]/g, "").slice(-1); // nur 1 Ziffer
        const nextCode = [...code];
        nextCode[index] = digit;
        setCode(nextCode);

        if (digit && index < 5) {
            inputs.current[index + 1]?.focus();
        }
        if (index === 5 && digit) {
            Keyboard.dismiss();
            // Auto-submit when all digits entered
            handleSubmit([...nextCode]);
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleSubmit = async (codeArray?: string[]) => {
        const fullCode = (codeArray || code).join("");
        if (fullCode.length !== 6) {
            Alert.alert(
                t('common.error'),
                isRTL ? 'الرجاء إدخال الرمز الكامل' : 'Please enter the full code'
            );
            return;
        }

        if (!email) {
            Alert.alert(
                t('common.error'),
                isRTL ? 'البريد الإلكتروني مفقود' : 'Email is missing'
            );
            return;
        }

        setLoading(true);
        try {
            await authAPI.verifyCode(email, fullCode);
            Alert.alert(
                t('common.success'),
                isRTL ? 'تم التحقق بنجاح' : 'Verification successful',
                [{ text: 'OK', onPress: () => router.replace("/index") }]
            );
        } catch (error: any) {
            const errorMessage = error?.response?.data?.detail || 
                (isRTL ? 'رمز التحقق غير صالح' : 'Invalid verification code');
            Alert.alert(t('common.error'), errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (!email) return;
        
        setResending(true);
        try {
            await authAPI.resendVerificationCode(email);
            Alert.alert(
                t('common.success'),
                isRTL ? 'تم إرسال رمز جديد' : 'New code sent successfully'
            );
        } catch (error: any) {
            const errorMessage = error?.response?.data?.detail || 
                (isRTL ? 'فشل في إرسال الرمز' : 'Failed to send code');
            Alert.alert(t('common.error'), errorMessage);
        } finally {
            setResending(false);
        }
    };

    return (
        <View style={styles.root}>
            {/* Titel */}
            <Text style={styles.title}>
                {t('auth.verifyCode.title')} <Ionicons name="lock-closed" size={22} color="#FFD166" />
            </Text>

            {/* Info-Text */}
            <Text style={styles.subtitle}>
                {t('auth.verifyCode.subtitle')}
            </Text>
            <Text style={styles.phoneMasked}>{t('auth.verifyCode.phoneMasked')}</Text>

            {/* Label */}
            <Text style={styles.label}>{t('auth.verifyCode.codeLabel')}</Text>

            {/* Code-Boxen */}
            <View style={styles.codeRow}>
                {code.map((digit, index) => (
                    <React.Fragment key={index}>
                        {index === 3 && (
                            <Text style={styles.codeDash}>-</Text> // Trenner in der Mitte
                        )}
                        <TextInput
                            ref={(el) => (inputs.current[index] = el)}
                            style={styles.codeInput}
                            value={digit}
                            onChangeText={(v) => handleChange(v, index)}
                            keyboardType="number-pad"
                            maxLength={1}
                            textAlign="center"
                            autoFocus={index === 0}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                        />
                    </React.Fragment>
                ))}
            </View>

            {/* Button */}
            <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                onPress={() => handleSubmit()}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={BLUE} />
                ) : (
                    <Text style={styles.submitText}>{t('auth.verifyCode.continueButton')}</Text>
                )}
            </TouchableOpacity>

            {/* Nicht erhalten / Nummer ändern */}
            <View style={styles.helperContainer}>
                {/* RESEND CODE */}
                <TouchableOpacity style={styles.helperRow} onPress={handleResendCode} disabled={resending}>
                    <Ionicons
                        name="mail-outline"
                        size={18}
                        color="#FFD166"
                        style={isRTL ? { marginLeft: 4 } : { marginRight: 4 }}
                    />
                    <Text style={styles.helperText}>
                        {t('auth.verifyCode.notReceived')} <Text style={styles.helperLink}>{resending ? '...' : t('auth.verifyCode.resend')}</Text>
                    </Text>
                </TouchableOpacity>

                {/* CHANGE PHONE → BACK TO FORGOT */}
                <TouchableOpacity onPress={() => router.replace("/forgot")}>
                    <Text style={styles.helperLink}>{t('auth.verifyCode.changePhone')}</Text>
                </TouchableOpacity>
            </View>


            {/* Zurück zu Login */}
            <TouchableOpacity style={styles.backRow} onPress={() => router.push("/")}>
                <Text style={styles.backText}>{t('auth.verifyCode.backToLogin')}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BLUE,
        paddingTop: 80,
        paddingHorizontal: 30,
    },

    title: {
        color: "#FFFFFF",
        fontSize: 26,
        fontFamily: "Tajawal-Bold",
        textAlign: "center",
        marginBottom: 12,
    },

    subtitle: {
        color: "#FFD166",
        fontSize: 15,
        fontFamily: "Tajawal-Regular",
        textAlign: "center",
    },

    phoneMasked: {
        color: "#FFD166",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
        textAlign: "center",
        marginTop: 4,
        marginBottom: 26,
    },

    label: {
        color: "#FFFFFF",
        fontSize: 16,
        fontFamily: "Tajawal-Bold",
        textAlign: I18nManager.isRTL ? "right" : "left",
        marginBottom: 10,
    },

    codeRow: {
        flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 28,
    },

    codeInput: {
        width: 46,
        height: 60,
        borderRadius: 10,
        backgroundColor: "#5A8BE8",
        marginHorizontal: 4,
        color: "#fff",
        fontSize: 22,
        fontFamily: "Tajawal-Bold",
        textAlignVertical: "center",
    },

    codeDash: {
        color: "#FFFFFF",
        fontSize: 24,
        marginHorizontal: 8,
        marginBottom: 4,
        fontFamily: "Tajawal-Bold",
    },

    submitBtn: {
        backgroundColor: "#F4B400",
        borderRadius: 10,
        paddingVertical: 14,
        marginHorizontal: 10,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },

    submitText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
        textAlign: "center",
    },

    helperContainer: {
        alignItems: "center",
        gap: 6,
        marginBottom: 40,
    },

    helperRow: {
        flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
        alignItems: "center",
    },

    helperText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontFamily: "Tajawal-Regular",
    },

    helperLink: {
        color: "#FFD166",
        fontFamily: "Tajawal-Bold",
    },

    backRow: {
        marginTop: 10,
        flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
        justifyContent: "center",
        alignItems: "center",
    },

    backText: {
        color: "#BFD7EA",
        fontSize: 15,
        fontFamily: "Tajawal-Regular",
        textDecorationLine: "underline",
    },
});
