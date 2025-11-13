// components/IOSActionSheet.tsx
import React from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TouchableWithoutFeedback,
    Animated,
} from "react-native";

const BLUE = "#0D2B66";
const YELLOW = "#F4B400";

export default function IOSActionSheet({
                                           visible,
                                           onClose,
                                           options,
                                           onSelect,
                                       }) {
    return (
        <Modal transparent visible={visible} animationType="fade">
            {/* DARK BACKDROP */}
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.backdrop} />
            </TouchableWithoutFeedback>

            {/* ACTION SHEET */}
            <View style={styles.sheetContainer}>
                <View style={styles.sheetBox}>
                    {options.map((opt, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.optionBtn}
                            onPress={() => {
                                onSelect(opt);
                                onClose();
                            }}
                        >
                            <Text style={styles.optionText}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* CANCEL BUTTON */}
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                    <Text style={styles.cancelText}>إلغاء</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
    },

    sheetContainer: {
        position: "absolute",
        bottom: 0,
        width: "100%",
        padding: 12,
    },

    sheetBox: {
        backgroundColor: "#F2F2F2",
        borderRadius: 12,
        overflow: "hidden",
    },

    optionBtn: {
        paddingVertical: 14,
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#DDD",
    },

    optionText: {
        fontSize: 18,
        fontFamily: "Tajawal-Regular",
        color: BLUE,
    },

    cancelBtn: {
        marginTop: 10,
        backgroundColor: "white",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },

    cancelText: {
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
        color: BLUE,
    },
});
