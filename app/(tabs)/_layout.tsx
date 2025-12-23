// app/(tabs)/_layout.tsx
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const { t, isRTL } = useLanguage();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#F4B400",
                tabBarInactiveTintColor: "#AAB3C0",
                tabBarStyle: {
                    backgroundColor: "#0D2B66",
                    borderTopWidth: 0,
                    height: 80,
                    paddingBottom: 15,
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
