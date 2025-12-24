import { useLanguage } from "@/contexts/LanguageContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type HeaderProps = {
    title: string;
    leftIcon?: string;
    rightIcon?: string;
    onLeftPress?: () => void;
    onRightPress?: () => void;
    leftIconColor?: string;
    rightIconColor?: string;
    leftIconSize?: number;
    rightIconSize?: number;
};

export default function Header({
    title,
    leftIcon,
    rightIcon,
    onLeftPress,
    onRightPress,
    leftIconColor = "#F4B400",
    rightIconColor = "#F4B400",
    leftIconSize = 32,
    rightIconSize = 34,
}: HeaderProps) {
    const { isRTL } = useLanguage();
    
    return (
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity onPress={onLeftPress} style={styles.iconBtn} accessibilityRole="button">
                {leftIcon ? <Ionicons name={leftIcon as any} size={leftIconSize} color={leftIconColor} /> : null}
            </TouchableOpacity>

            <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>

            <TouchableOpacity onPress={onRightPress} style={styles.iconBtn} accessibilityRole="button">
                {rightIcon ? <Ionicons name={rightIcon as any} size={rightIconSize} color={rightIconColor} /> : null}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        width: "100%",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    headerTitle: {
        color: "#fff",
        fontSize: 26,
        fontFamily: "Tajawal-Bold",
        flex: 1,
        textAlign: "center",
    },
    iconBtn: {
        padding: 6,
        width: 52,
        height: 52,
        justifyContent: "center",
        alignItems: "center",
    },
});
