// app/verify-code.tsx
import React, { useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Keyboard,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {router} from "expo-router";
import { useRouter } from "expo-router";
const BLUE = "#0D2B66";

export default function VerifyCodeScreen() {
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const inputs = useRef<Array<TextInput | null>>([]);
    const router = useRouter();
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
            // hier kannst du später die Verifikation starten
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleSubmit = () => {
        const fullCode = code.join("");
        console.log("CODE:", fullCode);
        // TODO: an Backend/Firebase schicken
    };

    return (
        <View style={styles.root}>
            {/* Titel */}
            <Text style={styles.title}>
                تحقق من هويتك <Ionicons name="lock-closed" size={22} color="#FFD166" />
            </Text>

            {/* Info-Text */}
            <Text style={styles.subtitle}>
                لقد أرسلنا رمزاً مكوّناً من ستة أرقام إلى رقم الهاتف
            </Text>
            <Text style={styles.phoneMasked}>453***</Text>

            {/* Label */}
            <Text style={styles.label}>رمز التفعيل</Text>

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
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitText}>متابعة</Text>
            </TouchableOpacity>

            {/* Nicht erhalten / Nummer ändern */}
            <View style={styles.helperContainer}>
                {/* RESEND CODE */}
                <TouchableOpacity style={styles.helperRow}>
                    <Ionicons
                        name="mail-outline"
                        size={18}
                        color="#FFD166"
                        style={{ marginLeft: 4 }}
                    />
                    <Text style={styles.helperText}>
                        لم تستلم الرمز؟ <Text style={styles.helperLink}>أعد الإرسال</Text>
                    </Text>
                </TouchableOpacity>

                {/* CHANGE PHONE → BACK TO FORGOT */}
                <TouchableOpacity onPress={() => router.replace("/forgot")}>
                    <Text style={styles.helperLink}>تغيير رقم الجوال</Text>
                </TouchableOpacity>
            </View>


            {/* Zurück zu Login */}
            <TouchableOpacity style={styles.backRow} onPress={() => router.replace("/index")}>
                <Text style={styles.backText}>العودة إلى تسجيل الدخول</Text>
            </TouchableOpacity>>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BLUE,
        paddingTop: 80,
        paddingHorizontal: 30,
        direction: "rtl",
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
        textAlign: "left",
        marginBottom: 10,
    },

    codeRow: {
        flexDirection: "row-reverse",
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
        flexDirection: "row-reverse",
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
        flexDirection: "row-reverse",
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
