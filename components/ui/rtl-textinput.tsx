import React from 'react';
import { I18nManager, Platform, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

type RtlTextInputProps = TextInputProps & {
    placeholder?: string;
    placeholderTextColor?: string;
};

export default function RtlTextInput(props: RtlTextInputProps) {
    const { placeholder, placeholderTextColor = '#AAB3C0', style, value, onChangeText, textAlign, ...rest } = props;
    
    // Determine if RTL based on textAlign prop or I18nManager
    const isRTL = textAlign === 'right' || I18nManager.isRTL;

    // On Android some RN versions don't respect placeholder alignment for RTL.
    // Workaround: render an absolutely positioned placeholder Text when value is empty.
    if (Platform.OS === 'android') {
        return (
            <View style={styles.container}>
                <TextInput
                    {...rest}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={''}
                    placeholderTextColor={placeholderTextColor}
                    textAlign={textAlign}
                    style={[
                        style, 
                        styles.inputPlain,
                        { writingDirection: isRTL ? 'rtl' : 'ltr' }
                    ]}
                />
                {!value && placeholder ? (
                    <Text 
                        style={[
                            styles.placeholder, 
                            { 
                                color: placeholderTextColor, 
                                fontFamily: (style as any)?.fontFamily || 'Tajawal-Regular',
                                textAlign: isRTL ? 'right' : 'left',
                                right: isRTL ? 12 : undefined,
                                left: isRTL ? undefined : 12,
                                writingDirection: isRTL ? 'rtl' : 'ltr',
                            }
                        ]} 
                        numberOfLines={1} 
                        ellipsizeMode="tail"
                    >
                        {placeholder}
                    </Text>
                ) : null}
            </View>
        );
    }

    // iOS and others: let TextInput handle placeholder normally
    return (
        <TextInput 
            {...rest} 
            value={value} 
            onChangeText={onChangeText} 
            placeholder={placeholder} 
            placeholderTextColor={placeholderTextColor} 
            textAlign={textAlign}
            style={[
                style,
                { writingDirection: isRTL ? 'rtl' : 'ltr' }
            ]} 
        />
    );
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
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        includeFontPadding: false,
        fontSize: 14,
        fontFamily: 'Tajawal-Regular',
        pointerEvents: 'none',
        paddingVertical: 8,
    },
});
