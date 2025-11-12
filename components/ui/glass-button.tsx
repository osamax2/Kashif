import React from 'react';
import { StyleSheet, Text, TextStyle, TouchableOpacity, TouchableOpacityProps, ViewStyle } from 'react-native';

type GlassButtonProps = TouchableOpacityProps & {
    title?: string;
    containerStyle?: ViewStyle | ViewStyle[];
    textStyle?: TextStyle | TextStyle[];
};

export default function GlassButton({ title, children, containerStyle, textStyle, disabled, style, ...rest }: GlassButtonProps) {
    return (
        <TouchableOpacity
            {...rest}
            activeOpacity={0.85}
            disabled={disabled}
            style={[styles.button, disabled && styles.disabled, containerStyle, style]}
        >
            {title ? <Text style={[styles.text, textStyle]}>{title}</Text> : children}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        width: '100%',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 6,
        elevation: 3,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    disabled: {
        opacity: 0.6,
    },
});
