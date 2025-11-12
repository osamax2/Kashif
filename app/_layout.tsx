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
    useEffect(() => {
        // For iOS/Android: ensure LTR layout direction
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
            if (I18nManager.isRTL) {
                I18nManager.forceRTL(false);
                // Note: The app needs a full restart for direction changes to take effect
            }
        }
    }, []);
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
