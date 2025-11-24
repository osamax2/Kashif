import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
    Animated,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
const BLUE = "#0D2B66";

export default function ForgotScreen() {
    const [method, setMethod] = useState<"email" | "phone" | null>(null);
    const [successVisible, setSuccessVisible] = useState(false);
    const [showBottomActions, setShowBottomActions] = useState(false);
    const router = useRouter();
    const inputAnim = useRef(new Animated.Value(0)).current;

    const handleSubmit = () => {
        setSuccessVisible(true);

        setTimeout(() => {
            setShowBottomActions(true);
        }, 600);
    };

    const showInput = () => {
        Animated.timing(inputAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: false,
        }).start();
    };

    const selectMethod = (m: "email" | "phone") => {
        setMethod(m);
        showInput();
    };

    return (
        <View style={styles.root}>
            {/* HEADER */}
            <Text style={styles.title}>نسيت كلمة المرور</Text>

            <Text style={styles.subtitle}>
                اختر طريقة الاستعادة ثم أدخل بياناتك لإعادة تعيين كلمة المرور
            </Text>

            {/* SELECT METHOD */}
            <View style={styles.pillsRow}>
                <TouchableOpacity
                    style={[styles.pill, method === "email" && styles.pillActive]}
                    onPress={() => selectMethod("email")}
                >
                    <Ionicons
                        name="mail"
                        size={20}
                        color={method === "email" ? "#FFD166" : "#FFFFFF"}
                        style={{ marginLeft: 6 }}
                    />
                    <Text
                        style={[
                            styles.pillText,
                            method === "email" && { color: "#FFD166" },
                        ]}
                    >
                        البريد الإلكتروني
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.pill, method === "phone" && styles.pillActive]}
                    onPress={() => selectMethod("phone")}
                >
                    <Ionicons
                        name="call"
                        size={20}
                        color={method === "phone" ? "#FFD166" : "#FFFFFF"}
                        style={{ marginLeft: 6 }}
                    />
                    <Text
                        style={[
                            styles.pillText,
                            method === "phone" && { color: "#FFD166" },
                        ]}
                    >
                        رقم الهاتف
                    </Text>
                </TouchableOpacity>
            </View>

            {/* INPUT FIELD */}
            <Animated.View
                style={[
                    styles.inputWrapper,
                    {
                        opacity: inputAnim,
                        marginTop: inputAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 20],
                        }),
                    },
                ]}
            >
                {method === "email" && (
                    <TextInput
                        placeholder="example@email.com"
                        placeholderTextColor="#AAB3C0"
                        style={styles.input}
                        textAlign="right"
                    />
                )}

                {method === "phone" && (
                    <TextInput
                        placeholder="+963"
                        placeholderTextColor="#AAB3C0"
                        keyboardType="phone-pad"
                        style={styles.input}
                        textAlign="right"
                    />
                )}
            </Animated.View>

            {/* RESET */}
            {method && (
                <TouchableOpacity style={styles.resetButton} onPress={() => router.push("/verify-code")}>
                    <Text style={styles.resetText}>إعادة تعيين كلمة المرور</Text>
                </TouchableOpacity>
            )}
            {/* BOTTOM ACTIONS */}
            {showBottomActions && (
                <View style={styles.bottomActions}>

            {/* BACK */}
            <TouchableOpacity>
                <Text style={styles.backLink}>العودة إلى تسجيل الدخول</Text>
            </TouchableOpacity>

                </View>
            )}

            {/* SUCCESS POPUP */}
            <Modal visible={successVisible} transparent animationType="fade">
                <View style={styles.modalBg}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>🎉 تم الإرسال بنجاح</Text>
                        <Text style={styles.modalMsg}>
                            تم إرسال رمز التفعيل إلى هاتفك. يرجى التحقق والمتابعة.
                        </Text>

                        <TouchableOpacity
                            style={styles.modalBtn}
                            onPress={() => setSuccessVisible(false)}
                        >
                            <Text style={styles.modalBtnText}>متابعة</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BLUE,
        paddingTop: 80,
        paddingHorizontal: 24,
        direction: "rtl",
    },

    title: {
        color: "#FFFFFF",
        fontSize: 32,
        fontFamily: "Tajawal-Bold",
        textAlign: "center",
        marginBottom: 10,
    },

    subtitle: {
        color: "#FFD166",
        fontSize: 16,
        textAlign: "center",
        marginBottom: 20,
        fontFamily: "Tajawal-Regular",
    },

    pillsRow: {
        flexDirection: "row-reverse",
        justifyContent: "center",
        gap: 10,
        marginTop: 10,
    },

    pill: {
        flexDirection: "row-reverse",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.07)",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.15)",
    },

    pillActive: {
        backgroundColor: "rgba(255,255,255,0.18)",
        borderColor: "#FFD166",
    },

    pillText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontFamily: "Tajawal-Medium",
    },

    inputWrapper: {
        width: "100%",
    },

    input: {
        backgroundColor: "#FFFFFF",
        width: "100%",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        fontSize: 16,
        fontFamily: "Tajawal-Regular",
        color: "#000",
    },

    resetButton: {
        backgroundColor: "#F4B400",
        paddingVertical: 14,
        borderRadius: 10,
        marginTop: 25,
    },

    resetText: {
        textAlign: "center",
        color: "#fff",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
    },

    backLink: {
        marginTop: 80,
        textAlign: "center",
        color: "#BFD7EA",
        textDecorationLine: "underline",
        fontSize: 15,
        fontFamily: "Tajawal-Regular",
    },

    modalBg: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.55)",
        justifyContent: "center",
        alignItems: "center",
    },

    modalBox: {
        width: "80%",
        backgroundColor: "rgba(255,255,255,0.95)",
        padding: 22,
        borderRadius: 22,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 10,
    },

    modalTitle: {
        fontSize: 20,
        fontFamily: "Tajawal-Bold",
        color: "#0D2B66",
        marginBottom: 8,
    },

    modalMsg: {
        fontSize: 15,
        fontFamily: "Tajawal-Regular",
        color: "#333",
        textAlign: "center",
        marginBottom: 20,
    },

    modalBtn: {
        backgroundColor: "#F4B400",
        paddingVertical: 10,
        paddingHorizontal: 40,
        borderRadius: 16,
    },

    modalBtnText: {
        color: "#fff",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
    },

    bottomActions: {
        marginTop: 25,
        gap: 10,
    },

    linkText: {
        color: "#FFD166",
        fontSize: 15,
        fontFamily: "Tajawal-Bold",
        textDecorationLine: "underline",
        textAlign: "right",
    },
});
