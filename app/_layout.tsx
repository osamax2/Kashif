import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { I18nManager, Platform } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

// Force LTR globally
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

export const unstable_settings = {
    anchor: '(tabs)',
};

export default function RootLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="(tabs)"
                options={{ headerShown: false }}
            />
            {/* falls du login / register / forgot hast, am besten auch: */}
            {/* <Stack.Screen name="login" options={{ headerShown: false }} /> */}
        </Stack>
    );
    const colorScheme = useColorScheme();

    const [fontsLoaded] = useFonts({
        'Tajawal-Regular': require('../assets/fonts/Tajawal/Tajawal-Regular.ttf'),
        'Tajawal-Medium': require('../assets/fonts/Tajawal/Tajawal-Medium.ttf'),
        'Tajawal-Bold': require('../assets/fonts/Tajawal/Tajawal-Bold.ttf'),
    });

    if (!fontsLoaded) {
        return null; // wait for fonts
    }

    return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
            <StatusBar style="auto" />
        </ThemeProvider>
    );
}
