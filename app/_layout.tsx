import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { DataSyncProvider } from '@/contexts/DataSyncContext';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { checkAndPromptForUpdate, clearUpdateCache } from '@/services/updateChecker';

export const unstable_settings = {
    initialRouteName: "index",
};

function RootLayoutNav() {
    const colorScheme = useColorScheme();
    const { loading } = useAuth();
    const { language } = useLanguage();

    // Check for app updates on startup
    React.useEffect(() => {
        const checkUpdate = async () => {
            try {
                // Clear cache on each app start to ensure update dialog shows
                await clearUpdateCache();
                // Force check for updates
                await checkAndPromptForUpdate(language as 'ar' | 'en' | 'de', true);
            } catch (error) {
                console.log('Update check failed:', error);
            }
        };
        
        // Delay update check to not block app startup
        const timer = setTimeout(checkUpdate, 3000);
        return () => clearTimeout(timer);
    }, []); // Only run once on mount, not on language change

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#033076' }}>
                <ActivityIndicator size="large" color="#F4B400" />
            </View>
        );
    }

    return (
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
    );
}

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        "Tajawal-Regular": require("../assets/fonts/Tajawal/Tajawal-Regular.ttf"),
        "Tajawal-Medium": require("../assets/fonts/Tajawal/Tajawal-Medium.ttf"),
        "Tajawal-Bold": require("../assets/fonts/Tajawal/Tajawal-Bold.ttf"),
    });
    
    const [appReady, setAppReady] = React.useState(false);

    React.useEffect(() => {
        // Force app to be ready after 3 seconds even if something fails
        const timer = setTimeout(() => {
            setAppReady(true);
        }, 3000);

        if (fontsLoaded) {
            setAppReady(true);
            clearTimeout(timer);
        }

        return () => clearTimeout(timer);
    }, [fontsLoaded]);

    if (!appReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#033076' }}>
                <ActivityIndicator size="large" color="#F4B400" />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <LanguageProvider>
                <AuthProvider>
                    <DataSyncProvider>
                        <NotificationProvider>
                            <RootLayoutNav />
                        </NotificationProvider>
                    </DataSyncProvider>
                </AuthProvider>
            </LanguageProvider>
        </GestureHandlerRootView>
    );
}
