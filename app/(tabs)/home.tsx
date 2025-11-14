import React, { useRef, useState } from "react";
import {
    I18nManager,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Animated,
    Pressable,
    Image,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const BLUE = "#0D2B66";

export default function HomeScreen() {
    /** MARKER-DATEN */
    const allMarkers = [
        { id: 1, type: "pothole", coord: { latitude: 40.418, longitude: -3.703 } },
        { id: 2, type: "accident", coord: { latitude: 40.417, longitude: -3.705 } },
        { id: 3, type: "speed", coord: { latitude: 40.414, longitude: -3.708 } },
        { id: 4, type: "pothole", coord: { latitude: 40.411, longitude: -3.699 } },
    ];

    /** ⬇⬇ MULTI-FILTER statt nur ein Filter */
    const [activeFilters, setActiveFilters] = useState<string[]>([]);

    const toggleFilter = (type: string) => {
        setActiveFilters((prev) =>
            prev.includes(type)
                ? prev.filter((f) => f !== type) // ausschalten
                : [...prev, type] // hinzufügen
        );
    };

    const visibleMarkers =
        activeFilters.length === 0
            ? allMarkers
            : allMarkers.filter((m) => activeFilters.includes(m.type));
    /** ⬆⬆ MULTI-FILTER LOGIK */

    /** RADIAL-MENÜ beim +-Button */
    const [menuOpen, setMenuOpen] = useState(false);
    const scaleAnim = useRef(new Animated.Value(0)).current;

    const toggleMenu = () => {
        if (!menuOpen) {
            setMenuOpen(true);
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
        } else {
            Animated.spring(scaleAnim, { toValue: 0, useNativeDriver: true }).start(
                () => setMenuOpen(false)
            );
        }
    };

    // Position des FAB (für Icons)
    const [fabPos, setFabPos] = useState({ x: 0, y: 0 });
    const onFabLayout = (e: any) => {
        const { x, y } = e.nativeEvent.layout;
        setFabPos({ x, y });
    };

    const menuItems = [
        { id: "pothole", icon: require("../../assets/icons/pothole.png"), offset: { top: 170, left: -180 } },
        { id: "accident", icon: require("../../assets/icons/accident.png"), offset: { top: 100, left: -220 } },
        { id: "speed", icon: require("../../assets/icons/speed.png"), offset: { top: 240, left: -230 } },

    ];

    return (
        <View style={styles.root}>
            {/* HEADER */}
            <View style={styles.appbar}>
                <Text style={styles.title}>الرئيسية</Text>
            </View>

            {/* SUCHE */}
            <View style={styles.searchRow}>
                <TextInput
                    placeholder="ابحث عن موقع أو شارع"
                    placeholderTextColor="#D3DDF1"
                    style={styles.searchInput}
                    textAlign="right"
                />
                <Text style={styles.searchIcon}>🔍</Text>
            </View>

            {/* FILTER-LEISTE (ALLE 3 KLICKBAR, MULTI-SELECT) */}
            <View style={styles.categoriesRow}>
                {/* كاشف السرعة */}
                <TouchableOpacity
                    style={[
                        styles.categoryItem,
                        activeFilters.includes("speed") && styles.categoryItemActive,
                    ]}
                    onPress={() => toggleFilter("speed")}
                >
                    <Text
                        style={[
                            styles.categoryText,
                            activeFilters.includes("speed") && styles.categoryTextActive,
                        ]}
                    >
                        كاشف السرعة
                    </Text>
                    <View
                        style={[
                            styles.dot,
                            { backgroundColor: "green" },
                            activeFilters.includes("speed") && styles.dotActive,
                        ]}
                    />
                </TouchableOpacity>

                {/* حادث */}
                <TouchableOpacity
                    style={[
                        styles.categoryItem,
                        activeFilters.includes("accident") && styles.categoryItemActive,
                    ]}
                    onPress={() => toggleFilter("accident")}
                >
                    <Text
                        style={[
                            styles.categoryText,
                            activeFilters.includes("accident") && styles.categoryTextActive,
                        ]}
                    >
                        حادث
                    </Text>
                    <View
                        style={[
                            styles.dot,
                            { backgroundColor: "red" },
                            activeFilters.includes("accident") && styles.dotActive,
                        ]}
                    />
                </TouchableOpacity>

                {/* حفرة */}
                <TouchableOpacity
                    style={[
                        styles.categoryItem,
                        activeFilters.includes("pothole") && styles.categoryItemActive,
                    ]}
                    onPress={() => toggleFilter("pothole")}
                >
                    <Text
                        style={[
                            styles.categoryText,
                            activeFilters.includes("pothole") && styles.categoryTextActive,
                        ]}
                    >
                        حفرة
                    </Text>
                    <View
                        style={[
                            styles.dot,
                            { backgroundColor: "gold" },
                            activeFilters.includes("pothole") && styles.dotActive,
                        ]}
                    />
                </TouchableOpacity>
            </View>

            {/* KARTE */}
            <View style={styles.mapContainer}>
                <MapView
                    style={StyleSheet.absoluteFill}
                    initialRegion={{
                        latitude: 33.5138,
                        longitude: 36.2765,
                        latitudeDelta: 0.2,
                        longitudeDelta: 0.2,
                    }}
                >
                    {visibleMarkers.map((m) => (
                        <Marker key={m.id} coordinate={m.coord}>
                            <View style={styles.marker}>
                                <Text style={{ fontSize: 18 }}>⚠️</Text>
                            </View>
                        </Marker>
                    ))}
                </MapView>

                {/* FAB */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={toggleMenu}
                    onLayout={onFabLayout}
                >
                    <Text style={styles.fabPlus}>+</Text>
                </TouchableOpacity>
            </View>

            {/* RADIAL-MENÜ UM DEN FAB */}
            {menuOpen &&
                menuItems.map((item) => (
                    <Animated.View
                        key={item.id}
                        style={[
                            styles.circleItem,
                            {
                                transform: [{ scale: scaleAnim }],
                                top: fabPos.y + item.offset.top,
                                left: fabPos.x + item.offset.left,
                            },
                        ]}
                    >
                        <Pressable
                            onPress={() => alert("Ausgewählt: " + item.id)}
                            style={styles.circlePress}
                        >
                            <Image source={item.icon} style={{ width: 42, height: 42 }} />
                        </Pressable>
                    </Animated.View>
                ))}

            {/* INFO-BAR UNTEN */}
            <View style={styles.infoBar}>
                <Text style={styles.infoText}>عدد البلاغات النشطة: 42 📘</Text>
            </View>
        </View>
    );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: BLUE, direction: "rtl" },

    appbar: {
        height: Platform.OS === "ios" ? 80 : 80,
        paddingTop: Platform.OS === "ios" ? 30 : 30,
        backgroundColor: BLUE,
        alignItems: "center",
        justifyContent: "center",
    },
    title: { color: "#fff", fontSize: 24, fontFamily: "Tajawal-Bold" },

    searchRow: {
        flexDirection: "row-reverse",
        alignItems: "center",
        marginHorizontal: 15,
        marginTop: 10,
        backgroundColor: "#2C4A87",
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 40,
    },
    searchInput: { flex: 1, color: "#fff", fontSize: 16 },
    searchIcon: { color: "#FFD166", fontSize: 18, marginHorizontal: 6 },

    mapContainer: {
        flex: 1,
        marginTop: 8,
        marginHorizontal: 8,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: "#123a7a",
    },
    marker: { backgroundColor: "#fff", padding: 2, borderRadius: 8 },

    fab: {
        position: "absolute",
        bottom: 120,
        left: 15,
        width: 56,
        height: 56,
        borderRadius: 30,
        backgroundColor: "#F4B400",
        alignItems: "center",
        justifyContent: "center",
        elevation: 6,
    },
    fabPlus: { color: BLUE, fontSize: 28, marginTop: -2 },

    infoBar: {
        height: 70,
        backgroundColor: "#1A3B7A",
        alignItems: "center",
        justifyContent: "center",
    },
    infoText: { color: "#fff", fontSize: 13, fontFamily: "Tajawal-Medium" },

    /* FILTER-LEISTE */
    categoriesRow: {
        width: "100%",
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 9,
        paddingHorizontal: 45,
    },

    categoryItem: {
        flexDirection: "row-reverse",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
    },

    categoryItemActive: {
        backgroundColor: "rgba(255,255,255,0.12)",
    },

    categoryText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontFamily: "Tajawal-Bold",
        textAlign: "right",
    },
    categoryTextActive: {
        color: "#FFD166",
    },

    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    dotActive: {
        borderWidth: 2,
        borderColor: "#FFFFFF",
    },

    /* RADIAL-MENÜ ICONS */
    circleItem: {
        position: "absolute",
        zIndex: 10,
        width: 55,
        height: 55,
    },

    circlePress: {
        width: "100%",
        height: "100%",
        borderRadius: 30,
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
        elevation: 8,
    },
});
