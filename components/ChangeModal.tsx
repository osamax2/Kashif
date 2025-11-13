// components/ChangeModal.tsx
import React from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    StyleSheet,
} from "react-native";

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
                                    }) {
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
                    />

                    <View style={styles.buttonsRow}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelText}>إلغاء</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
                            <Text style={styles.saveText}>حفظ</Text>
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
        marginBottom: 20,
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
