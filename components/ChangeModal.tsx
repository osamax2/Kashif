// components/ChangeModal.tsx
import React from "react";
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useLanguage } from "../contexts/LanguageContext";

const BLUE = "#0D2B66";
const YELLOW = "#F4B400";

export default function ChangeModal({
                                        visible,
                                        onClose,
                                        title,
                                        placeholder,
                                        value,
                                        setValue,
                                        onSave,
                                        error = null,
                                        loading = false,
                                        keyboardType = "default",
                                    }: {
    visible: boolean;
    onClose: () => void;
    title: string;
    placeholder: string;
    value: string;
    setValue: (v: string) => void;
    onSave: () => void;
    error?: string | null;
    loading?: boolean;
    keyboardType?: string;
}) {
    const { language } = useLanguage();
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.modalBox}>
                    <Text style={styles.title}>{title}</Text>

                    <TextInput
                        style={styles.input}
                        placeholder={placeholder}
                        placeholderTextColor="#A5B4D0"
                        value={value}
                        onChangeText={setValue}
                        textAlign="right"
                        keyboardType={keyboardType || "default"}
                        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
                    />

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <View style={styles.buttonsRow}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                            <Text style={styles.cancelText}>{language === "ar" ? "إلغاء" : language === "ku" ? "Betal bike" : "Cancel"}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator size="small" color={BLUE} />
                            ) : (
                                <Text style={styles.saveText}>{language === "ar" ? "حفظ" : language === "ku" ? "Parastin" : "Save"}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.55)",
        justifyContent: "center",
        alignItems: "center",
    },

    modalBox: {
        width: "85%",
        backgroundColor: BLUE,
        borderRadius: 16,
        padding: 20,
        elevation: 6,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
    },

    title: {
        color: "#fff",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
        textAlign: "center",
        marginBottom: 15,
    },

    input: {
        backgroundColor: "#1D3B70",
        color: "#fff",
        borderRadius: 10,
        padding: 12,
        fontFamily: "Tajawal-Regular",
        marginBottom: 12,
    },

    errorText: {
        color: "#ff6b6b",
        fontSize: 13,
        fontFamily: "Tajawal-Regular",
        textAlign: "center",
        marginBottom: 10,
    },

    buttonsRow: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
    },

    saveBtn: {
        backgroundColor: YELLOW,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        minWidth: 80,
        alignItems: "center",
    },

    saveText: {
        color: BLUE,
        fontFamily: "Tajawal-Bold",
        fontSize: 16,
    },

    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },

    cancelText: {
        color: "#ffffff",
        fontFamily: "Tajawal-Regular",
        fontSize: 16,
    },
});
