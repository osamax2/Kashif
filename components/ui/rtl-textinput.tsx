import React from 'react';
import { Platform, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

type RtlTextInputProps = TextInputProps & {
    placeholder?: string;
    placeholderTextColor?: string;
};

export default function RtlTextInput(props: RtlTextInputProps) {
    const { placeholder, placeholderTextColor = '#AAB3C0', style, value, onChangeText, ...rest } = props;

    // On Android some RN versions don't respect placeholder alignment for RTL.
    // Workaround: render an absolutely positioned placeholder Text when value is empty.
    if (Platform.OS === 'android') {
        return (
            <View style={[styles.container]}>
                <TextInput
                    {...rest}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={''}
                    placeholderTextColor={placeholderTextColor}
                    style={[style, styles.inputPlain]}
                />
                {!value && placeholder ? (
                    <Text style={[styles.placeholder, { color: placeholderTextColor, fontFamily: (style as any)?.fontFamily || undefined }]} numberOfLines={1} ellipsizeMode="tail">
                        {placeholder}
                    </Text>
                ) : null}
            </View>
        );
    }

    // iOS and others: let TextInput handle placeholder normally
    return <TextInput {...rest} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={placeholderTextColor} style={style} />;
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        width: '100%',
    },
    inputPlain: {
        width: '100%',
        backgroundColor: 'transparent',
    },
    placeholder: {
        position: 'absolute',
        right: 12,
        top: '50%',
        transform: [{ translateY: -10 }],
        includeFontPadding: false,
        writingDirection: 'rtl',
        textAlign: 'right',
        fontSize: 14,
        fontFamily: 'Tajawal-Regular',
    },
});
