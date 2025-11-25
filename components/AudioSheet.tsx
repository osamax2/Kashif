import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";
import React from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function AudioSheet({
    visible,
    volume,
    onVolumeChange,
    soundEnabled,
    warningsEnabled,
    onToggleSound,
    onToggleWarnings,
    onClose,
}) {
    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            <Pressable style={styles.bg} onPress={onClose} />

            <View style={styles.sheet}>
                {/* Handle */}
                <View style={styles.handle} />

                {/* Title */}
                <Text style={styles.title}>إعدادات الصوت</Text>

                {/* VOLUME SLIDER */}
                <Text style={styles.label}>مستوى صوت التطبيق</Text>

                <View style={styles.slider}>
                    <View style={[styles.sliderFill, { width: `${volume * 100}%` }]} />
                    <View
                        style={[
                            styles.knob,
                            { left: `${volume * 100}%` },
                        ]}
                        onTouchMove={(e) => {
                            const pct = e.nativeEvent.locationX / 300;
                            const v = Math.max(0, Math.min(1, pct));
                            onVolumeChange(v);
                        }}
                    />
                </View>

                {/* MODES */}
                <View style={styles.modeRow}>

                    {/* SYSTEM MODE */}
                    <BlurView intensity={40} tint="dark" style={[
                        styles.modeBox,
                        !warningsEnabled && !soundEnabled && styles.activeBox
                    ]}>
                        <TouchableOpacity
                            style={styles.modeBtn}
                            onPress={() => {
                                onToggleWarnings(false);
                                onToggleSound(false);
                            }}
                        >
                            <Ionicons
                                name="sparkles"
                                size={32}
                                color="#fff"
                            />
                            <Text style={styles.modeText}>النظام</Text>
                        </TouchableOpacity>
                    </BlurView>

                    {/* ALERT + NAVI */}
                    <BlurView intensity={40} tint="dark" style={[
                        styles.modeBox,
                        warningsEnabled && styles.activeBox,
                    ]}>
                        <TouchableOpacity
                            style={styles.modeBtn}
                            onPress={() => onToggleWarnings(true)}
                        >
                            <Ionicons
                                name="warning"
                                size={32}
                                color="#fff"
                            />
                            <Text style={styles.modeText}>تحذيرات + الملاحة</Text>
                        </TouchableOpacity>
                    </BlurView>

                    {/* SOUND ONLY */}
                    <BlurView intensity={40} tint="dark" style={[
                        styles.modeBox,
                        soundEnabled && styles.activeBox,
                    ]}>
                        <TouchableOpacity
                            style={styles.modeBtn}
                            onPress={onToggleSound}
                        >
                            <Ionicons
                                name={soundEnabled ? "volume-high" : "volume-mute"}
                                size={32}
                                color="#fff"
                            />
                            <Text style={styles.modeText}>
                                {soundEnabled ? "الصوت مُفعل" : "الصوت مُغلق"}
                            </Text>
                        </TouchableOpacity>
                    </BlurView>

                </View>

                {/* CLOSE */}
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                    <Text style={styles.closeText}>إغلاق</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: "flex-end",
        zIndex: 999,
    },
    bg: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
        backgroundColor: "rgba(28,28,30,0.92)",
        padding: 22,
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
    },
    handle: {
        width: 42,
        height: 5,
        backgroundColor: "#666",
        borderRadius: 3,
        alignSelf: "center",
        marginBottom: 16,
    },
    title: {
        color: "#fff",
        fontSize: 22,
        textAlign: "center",
        marginBottom: 20,
        fontFamily: "Tajawal-Bold",
    },
    label: {
        color: "#eee",
        fontSize: 16,
        marginBottom: 8,
        fontFamily: "Tajawal-Regular",
    },
    slider: {
        width: "100%",
        height: 32,
        backgroundColor: "#555",
        borderRadius: 20,
        overflow: "hidden",
        justifyContent: "center",
        marginBottom: 25,
    },
    sliderFill: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: "#34C759",
    },
    knob: {
        position: "absolute",
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: "#34C759",
    },
    modeRow: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        marginBottom: 30,
    },
    modeBox: {
        width: "30%",
        borderRadius: 20,
        paddingVertical: 18,
        alignItems: "center",
    },
    activeBox: {
        backgroundColor: "#0A84FF",
    },
    modeBtn: {
        alignItems: "center",
    },
    modeText: {
        color: "#FFF",
        marginTop: 6,
        textAlign: "center",
        fontFamily: "Tajawal-Medium",
    },
    closeBtn: {
        backgroundColor: "#F4B400",
        paddingVertical: 14,
        borderRadius: 12,
    },
    closeText: {
        color: "#0D2B66",
        fontSize: 18,
        textAlign: "center",
        fontFamily: "Tajawal-Bold",
    },
});
