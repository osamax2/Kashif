import React from "react";
import { Platform, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

type RtlTextInputProps = TextInputProps & {
  isRTL: boolean;
  placeholder?: string;
  placeholderTextColor?: string;
};

export default function RtlTextInput({
  isRTL,
  placeholder,
  placeholderTextColor = "#AAB3C0",
  style,
  value,
  onChangeText,
  ...rest
}: RtlTextInputProps) {
  const writingDirection = isRTL ? "rtl" : "ltr";
  const textAlign: "left" | "right" = isRTL ? "right" : "left";

  if (Platform.OS === "android") {
    const hasValue = typeof value === "string" ? value.length > 0 : !!value;

    return (
      <View style={styles.container}>
        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          placeholder=""
          placeholderTextColor={placeholderTextColor}
          style={[styles.inputPlain, style, { writingDirection, textAlign }]}
        />
        {!hasValue && !!placeholder ? (
          <Text
            style={[
              styles.placeholder,
              {
                color: placeholderTextColor,
                writingDirection,
                textAlign,
                right: isRTL ? 12 : undefined,
                left: isRTL ? undefined : 12,
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
            pointerEvents="none"
          >
            {placeholder}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <TextInput
      {...rest}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      style={[style, { writingDirection, textAlign }]}
    />
  );
}

const styles = StyleSheet.create({
  container: { position: "relative", width: "100%" },
  inputPlain: { width: "100%", backgroundColor: "transparent" },
  placeholder: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    fontSize: 14,
    fontFamily: "Tajawal-Regular",
    paddingVertical: 8,
    includeFontPadding: false,
  },
});
