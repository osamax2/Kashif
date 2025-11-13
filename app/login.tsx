import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, I18nManager } from "react-native";
import { useRouter } from "expo-router";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = () => {
        // Nach Login → Tabs öffnen
        router.replace("/(tabs)/home");
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>تسجيل الدخول</Text>

            <Text style={styles.label}>البريد الإلكتروني</Text>
            <TextInput
                style={styles.input}
                placeholder="example@email.com"
                placeholderTextColor="#AAB3C0"
                value={email}
                onChangeText={setEmail}
                textAlign="right"
            />

            <Text style={styles.label}>كلمة المرور</Text>
            <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#AAB3C0"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                textAlign="right"
            />

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                <Text style={styles.loginText}>تسجيل الدخول</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/forgot")}>
                <Text style={styles.link}>نسيت كلمة المرور؟</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/register")}>
                <Text style={styles.link}>إنشاء حساب جديد</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0D2B66",
        padding: 30,
        justifyContent: "center",
    },
    title: {
        color: "white",
        fontSize: 30,
        textAlign: "center",
        marginBottom: 40,
        fontFamily: "Tajawal-Bold",
    },
    label: {
        color: "#F4B400",
        marginBottom: 6,
        fontSize: 16,
        fontFamily: "Tajawal-Medium",
        textAlign: "right",
    },
    input: {
        backgroundColor: "rgba(255,255,255,0.1)",
        padding: 12,
        borderRadius: 8,
        color: "white",
        marginBottom: 20,
        fontFamily: "Tajawal-Regular",
    },
    loginButton: {
        backgroundColor: "#F4B400",
        padding: 14,
        borderRadius: 8,
        marginTop: 10,
    },
    loginText: {
        color: "#0D2B66",
        textAlign: "center",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
    },
    link: {
        color: "#FFFFFF",
        textAlign: "center",
        marginTop: 14,
        textDecorationLine: "underline",
        fontFamily: "Tajawal-Regular",
    }
});
