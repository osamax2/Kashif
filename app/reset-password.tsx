// app/reset-password.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    I18nManager,
} from "react-native";
import { useLanguage } from "../contexts/LanguageContext";

const BLUE = "#0D2B66";

export default function ResetPasswordScreen() {
    const router = useRouter();
    const { t, isRTL } = useLanguage();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleReset = () => {
        // TODO: hier später Firebase / Backend-Aufruf zum Passwort-Setzen machen
        // Nach Erfolg zurück zum Login:
        router.replace("/index");
    };

    return (
        <View style={styles.root}>
            {/* Titel */}
            <Text style={styles.title}>{t('auth.resetPassword.title')}</Text>

            {/* Erklärungstext */}
            <Text style={styles.subtitle}>
                {t('auth.resetPassword.subtitle')}
            </Text>

            {/* Neues Passwort */}
            <Text style={styles.label}>{t('auth.resetPassword.newPassword')}</Text>
            <View style={styles.inputRow}>
                {/* Schloss-Icon links (optisch rechts wegen RTL) */}
                <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#ffffff"
                    style={isRTL ? styles.iconLeft : styles.iconRight}
                />

                <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#DDE5FF"
                    secureTextEntry={!showPwd}
                    style={styles.input}
                    textAlign={isRTL ? 'right' : 'left'}
                />

                {/* Eye-Icon */}
                <TouchableOpacity
                    onPress={() => setShowPwd((p) => !p)}
                    style={isRTL ? styles.iconRightBtn : styles.iconLeftBtn}
                >
                    <Ionicons
                        name={showPwd ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#ffffff"
                    />
                </TouchableOpacity>
            </View>

            {/* Passwort bestätigen */}
            <Text style={styles.label}>{t('auth.resetPassword.confirmPassword')}</Text>
            <View style={styles.inputRow}>
                <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#ffffff"
                    style={isRTL ? styles.iconLeft : styles.iconRight}
                />

                <TextInput
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholder="••••••••"
                    placeholderTextColor="#DDE5FF"
                    secureTextEntry={!showConfirm}
                    style={styles.input}
                    textAlign={isRTL ? 'right' : 'left'}
                />

                <TouchableOpacity
                    onPress={() => setShowConfirm((p) => !p)}
                    style={isRTL ? styles.iconRightBtn : styles.iconLeftBtn}
                >
                    <Ionicons
                        name={showConfirm ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#ffffff"
                    />
                </TouchableOpacity>
            </View>

            {/* Button Passwort neu setzen */}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleReset}>
                <Text style={styles.primaryText}>{t('auth.resetPassword.resetButton')}</Text>
            </TouchableOpacity>

            {/* Zurück zum Login */}
            <TouchableOpacity
                style={styles.backWrapper}
                onPress={() => router.push("/")}
            >
                <Text style={styles.backText}>{t('auth.resetPassword.backToLogin')}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BLUE,
        paddingTop: Platform.OS === "ios" ? 80 : 60,
        paddingHorizontal: 24,
    },

    title: {
        color: "#FFFFFF",
        fontSize: 28,
        fontFamily: "Tajawal-Bold",
        textAlign: "center",
        marginBottom: 12,
    },

    subtitle: {
        color: "#FFD166",
        fontSize: 14,
        fontFamily: "Tajawal-Regular",
        textAlign: I18nManager.isRTL ? "right" : "left",
        lineHeight: 22,
        marginBottom: 32,
    },

    label: {
        color: "#FFD166",
        fontSize: 14,
        fontFamily: "Tajawal-Medium",
        textAlign: I18nManager.isRTL ? "right" : "left",
        marginBottom: 8,
    },

    inputRow: {
        flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
        alignItems: "center",
        backgroundColor: "#5B82D9",
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 52,
        marginBottom: 18,
    },

    input: {
        flex: 1,
        color: "#FFFFFF",
        fontSize: 16,
        fontFamily: "Tajawal-Regular",
    },

    iconLeft: {
        marginLeft: 8,
    },

    iconRight: {
        marginRight: 8,
    },

    iconRightBtn: {
        paddingHorizontal: 4,
        paddingVertical: 4,
    },

    iconLeftBtn: {
        paddingHorizontal: 4,
        paddingVertical: 4,
    },

    primaryBtn: {
        backgroundColor: "#F4B400",
        borderRadius: 10,
        paddingVertical: 14,
        marginTop: 10,
    },

    primaryText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
        textAlign: "center",
    },

    backWrapper: {
        marginTop: 50,
        alignItems: "center",
    },

    backText: {
        color: "#BFD7EA",
        fontSize: 15,
        fontFamily: "Tajawal-Regular",
        textDecorationLine: "underline",
    },
});
