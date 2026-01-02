// components/LanguageDropdown.tsx
import React, { useState, useRef } from "react";
import * as RN from "react-native";
import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    StyleSheet,
} from "react-native";

// Safe I18nManager access
const I18nManager = RN.I18nManager || { isRTL: false };

const YELLOW = "#F4B400";
const WHITE = "#FFFFFF";

export default function LanguageDropdown({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const heightAnim = useRef(new Animated.Value(0)).current;

    const toggleDropdown = () => {
        setOpen(!open);

        Animated.timing(heightAnim, {
            toValue: open ? 0 : 120, // Höhe der Dropdown-Box
            duration: 250,
            useNativeDriver: false,
        }).start();
    };

    const languages = ["العربية", "English", "Deutsch", "Türkçe"];

    return (
        <View style={styles.container}>
            {/* MAIN SELECTOR */}
            <TouchableOpacity onPress={toggleDropdown} style={styles.header}>
                <Text style={styles.label}>اللغة</Text>

                <View style={styles.valueRow}>
                    <Text style={styles.value}>{value}</Text>
                    <Text style={styles.arrow}>{open ? "▲" : "▼"}</Text>
                </View>
            </TouchableOpacity>

            {/* DROPDOWN BOX */}
            <Animated.View style={[styles.dropdownBox, { height: heightAnim }]}>
                {languages.map((lang, i) => (
                    <TouchableOpacity
                        key={i}
                        style={styles.item}
                        onPress={() => {
                            onChange(lang);
                            toggleDropdown();
                        }}
                    >
                        <Text
                            style={[
                                styles.itemText,
                                value === lang && { color: YELLOW, fontFamily: "Tajawal-Bold" },
                            ]}
                        >
                            {lang}
                        </Text>
                    </TouchableOpacity>
                ))}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        marginBottom: 10,
    },

    header: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
    },

    label: {
        color: WHITE,
        fontSize: 16,
        fontFamily: "Tajawal-Bold",
    },

    valueRow: {
        flexDirection: "row-reverse",
        alignItems: "center",
        gap: 6,
    },

    value: {
        color: YELLOW,
        fontFamily: "Tajawal-Bold",
        fontSize: 15,
    },

    arrow: {
        color: YELLOW,
        fontSize: 14,
        marginTop: 2,
    },

    dropdownBox: {
        overflow: "hidden",
        backgroundColor: "#102D60",
        borderRadius: 10,
        marginTop: 5,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
    },

    item: {
        paddingVertical: 12,
        paddingHorizontal: 10,
    },

    itemText: {
        color: WHITE,
        fontSize: 15,
        fontFamily: "Tajawal-Regular",
        textAlign: "right",
    },
});
