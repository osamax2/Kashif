import React, { useEffect } from "react";
import { Modal, View, Text, StyleSheet, Animated } from "react-native";

export default function SuccessModal({ visible, message, onClose }) {
    const scaleAnim = new Animated.Value(0.5);
    const opacityAnim = new Animated.Value(0);

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            setTimeout(onClose, 1500); // auto close
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade">
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.box,
                        {
                            opacity: opacityAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <Text style={styles.icon}>✔️</Text>
                    <Text style={styles.message}>{message}</Text>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
    },
    box: {
        width: 260,
        padding: 25,
        backgroundColor: "white",
        borderRadius: 18,
        alignItems: "center",
        elevation: 6,
    },
    icon: {
        fontSize: 48,
        marginBottom: 10,
    },
    message: {
        fontSize: 18,
        color: "#333",
        fontFamily: "Tajawal-Bold",
        textAlign: "center",
    },
});
