import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
    anchor: '(tabs)',
};

export default function RootLayout() {
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
