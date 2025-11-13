// app/(tabs)/home.tsx
import React, { useState } from "react";
import { I18nManager, View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from "react-native";
import MapView, { Marker } from "react-native-maps";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function HomeScreen() {
    const [activeFilter, setActiveFilter] = useState<string | null>(null);

    const allMarkers = [
        { id: 1, type: "pothole", coord: { latitude: 40.418, longitude: -3.703 } },
        { id: 2, type: "accident", coord: { latitude: 40.417, longitude: -3.705 } },
        { id: 3, type: "speed", coord: { latitude: 40.414, longitude: -3.708 } },
        { id: 4, type: "pothole", coord: { latitude: 40.411, longitude: -3.699 } },
    ];

    const visibleMarkers = activeFilter ? allMarkers.filter(m => m.type === activeFilter) : allMarkers;

    return (
        <View style={styles.root}>
            {/* Appbar */}
            <View style={styles.appbar}>
                <Text style={styles.title}>الرئيسية</Text>
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
                <TextInput
                    placeholder="ابحث عن موقع أو شارع"
                    placeholderTextColor="#D3DDF1"
                    style={styles.searchInput}
                    textAlign="right"
                />
                <Text style={styles.searchIcon}>🔍</Text>
            </View>

            {/* Filters */}
            <View style={styles.categoriesRow}>

                <View style={styles.categoryItem}>
                    <Text style={styles.categoryText}>كاشف السرعة</Text>
                    <View style={[styles.dot, { backgroundColor: "green" }]} />
                </View>

                <View style={styles.categoryItem}>
                    <Text style={styles.categoryText}>حادث</Text>
                    <View style={[styles.dot, { backgroundColor: "red" }]} />
                </View>

                <View style={styles.categoryItem}>
                    <Text style={styles.categoryText}>حفرة</Text>
                    <View style={[styles.dot, { backgroundColor: "gold" }]} />
                </View>

            </View>



            {/* Map */}
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

                    {visibleMarkers.map(m => (
                        <Marker key={m.id} coordinate={m.coord}>
                            <View style={styles.marker}>
                                <Text style={{ fontSize: 18 }}>⚠️</Text>
                            </View>
                        </Marker>
                    ))}
                </MapView>

                {/* FAB */}
                <TouchableOpacity style={styles.fab}>
                    <Text style={styles.fabPlus}>+</Text>
                </TouchableOpacity>
            </View>

            {/* Bottom info bar */}
            <View style={styles.infoBar}>
                <Text style={styles.infoText}>عدد البلاغات النشطة: 42 📘</Text>
            </View>
        </View>
    );
}

function FilterButton({ label, color, active, onPress }: { label: string; color: string; active: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity onPress={onPress} style={[styles.filterBtn, active && { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.filterLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

const BLUE = "#0D2B66";

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

    filters: {
        marginTop: 6,
        flexDirection: "row-reverse",
        justifyContent: "space-around",
        paddingHorizontal: 8,
    },
    filterBtn: { flexDirection: "row-reverse", alignItems: "center", padding: 6, borderRadius: 8 },
    //dot: { width: 10, height: 10, borderRadius: 5, marginLeft: 6 },
    filterLabel: { color: "#fff", fontSize: 14 },

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
        bottom: 18,
        left: 18,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#F4B400",
        alignItems: "center",
        justifyContent: "center",
        elevation: 6,
    },
    fabPlus: { color: BLUE, fontSize: 28, marginTop: -2},

    infoBar: { height: 34, backgroundColor: "#1A3B7A", alignItems: "center", justifyContent: "center" ,},
    infoText: { color: "#fff", fontSize: 13, fontFamily: "Tajawal-Medium" },

    categoriesRow: {
        width: "100%",
        flexDirection: "row-reverse",   // RTL → Reihenfolge von rechts nach links
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
        paddingHorizontal: 20,
    },

    categoryItem: {
        flexDirection: "row-reverse",   // ⭐ WICHTIG: Text zuerst, Punkt danach
        alignItems: "center",
        gap: 4,
    },

    categoryText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontFamily: "Tajawal-Bold",
        textAlign: "right",
    },

    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },


});
