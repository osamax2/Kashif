// app/(tabs)/_layout.tsx
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const { t, isRTL } = useLanguage();
    const insets = useSafeAreaInsets();

    // On Android with 3-button navigation, insets.bottom is 0 but the nav bar still overlaps.
    // Add extra padding so the tab bar is fully visible above the system navigation.
    const bottomPadding = Platform.OS === 'android'
        ? Math.max(insets.bottom, 16) + 10
        : 15;
    const tabBarHeight = 65 + bottomPadding;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#F4B400",
                tabBarInactiveTintColor: "#AAB3C0",
                tabBarStyle: {
                    backgroundColor: "#0D2B66",
                    borderTopWidth: 0,
                    height: tabBarHeight,
                    paddingBottom: bottomPadding,
                    paddingTop: 10,
                    position: "absolute",
                    elevation: 0,
                    backdropFilter: "blur(12px)",
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontFamily: "Tajawal-Regular",
                    textAlign: isRTL ? "right" : "left",
                    writingDirection: isRTL ? "rtl" : "ltr",
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: t('home.title'),
                    tabBarIcon: ({ color }) => (
                        <IconSymbol name="house.fill" size={26} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="reports"
                options={{
                    title: t('reports.title'),
                    tabBarIcon: ({ color }) => (
                        <IconSymbol name="chart.bar.fill" size={24} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="profile"
                options={{
                    title: t('profile.title'),
                    tabBarIcon: ({ color }) => (
                        <IconSymbol
                            name="person.crop.circle"
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="coupons"
                options={{
                    title: t('coupons.screenTitle'),
                    tabBarIcon: ({ color }) => (
                        <IconSymbol name="tag.fill" size={24} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="settings"
                options={{
                    title: t('settings.title'),
                    tabBarIcon: ({ color }) => (
                        <IconSymbol
                            name="gearshape.fill"
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
