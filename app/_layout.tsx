import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { I18nManager } from 'react-native';
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useColorScheme } from '@/hooks/use-color-scheme';

// Force LTR globally (important!)
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

export const unstable_settings = {
    initialRouteName: "index",
};

export default function RootLayout() {
    const colorScheme = useColorScheme();

    const [fontsLoaded] = useFonts({
        "Tajawal-Regular": require("../assets/fonts/Tajawal/Tajawal-Regular.ttf"),
        "Tajawal-Medium": require("../assets/fonts/Tajawal/Tajawal-Medium.ttf"),
        "Tajawal-Bold": require("../assets/fonts/Tajawal/Tajawal-Bold.ttf"),
    });

    if (!fontsLoaded) return null;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
                <Stack screenOptions={{ headerShown: false }}>
                    {/* Start screen */}
                    <Stack.Screen name="index" />

                    {/* Tab navigation */}
                    <Stack.Screen name="(tabs)" />

                    {/* Optional screens */}
                    <Stack.Screen name="modal" options={{ presentation: "modal" }} />
                </Stack>

                <StatusBar style="auto" />
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}
