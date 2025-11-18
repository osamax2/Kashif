// app/reset-password.tsx
import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const BLUE = "#0D2B66";

export default function ResetPasswordScreen() {
    const router = useRouter();

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
            <Text style={styles.title}>كلمة مرور جديدة</Text>

            {/* Erklärungstext */}
            <Text style={styles.subtitle}>
                يجب أن تكون كلمة المرور الجديدة مختلفة عن السابقة،
                {"\n"}
                وأن تحتوي على ٨ أحرف على الأقل ومكوّنة من أحرف أرقام ورموز
            </Text>

            {/* Neues Passwort */}
            <Text style={styles.label}>كلمة المرور الجديدة</Text>
            <View style={styles.inputRow}>
                {/* Schloss-Icon links (optisch rechts wegen RTL) */}
                <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#ffffff"
                    style={styles.iconLeft}
                />

                <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#DDE5FF"
                    secureTextEntry={!showPwd}
                    style={styles.input}
                    textAlign="right"
                />

                {/* Eye-Icon */}
                <TouchableOpacity
                    onPress={() => setShowPwd((p) => !p)}
                    style={styles.iconRightBtn}
                >
                    <Ionicons
                        name={showPwd ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#ffffff"
                    />
                </TouchableOpacity>
            </View>

            {/* Passwort bestätigen */}
            <Text style={styles.label}>تأكيد كلمة المرور</Text>
            <View style={styles.inputRow}>
                <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#ffffff"
                    style={styles.iconLeft}
                />

                <TextInput
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholder="••••••••"
                    placeholderTextColor="#DDE5FF"
                    secureTextEntry={!showConfirm}
                    style={styles.input}
                    textAlign="right"
                />

                <TouchableOpacity
                    onPress={() => setShowConfirm((p) => !p)}
                    style={styles.iconRightBtn}
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
                <Text style={styles.primaryText}>إعادة تعيين كلمة المرور</Text>
            </TouchableOpacity>

            {/* Zurück zum Login */}
            <TouchableOpacity
                style={styles.backWrapper}
                onPress={() => router.back("/index")}
            >
                <Text style={styles.backText}>العودة إلى تسجيل الدخول</Text>
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
        direction: "rtl",
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
        textAlign: "left",
        lineHeight: 22,
        marginBottom: 32,
    },

    label: {
        color: "#FFD166",
        fontSize: 14,
        fontFamily: "Tajawal-Medium",
        textAlign: "left",
        marginBottom: 8,
    },

    inputRow: {
        flexDirection: "row-reverse",
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

    iconRightBtn: {
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
