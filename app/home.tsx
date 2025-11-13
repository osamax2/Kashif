// app/home.tsx
import React, {useMemo} from "react";
import "react-native-maps"
import {
    I18nManager,
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Image,
    ImageBackground,
    Platform,
} from "react-native";
import { useRouter } from "expo-router";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function HomeScreen() {
    const router = useRouter();

    // Lazy-Import für react-native-maps (falls nicht installiert, nutzen wir Fallback-Bild)
    const MapView = useMemo(() => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            return require("react-native-maps").default;
        } catch {
            return null;
        }
    }, []);
    const Marker = useMemo(() => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            return require("react-native-maps").Marker;
        } catch {
            return null;
        }
    }, []);

    return (
        <View style={styles.root}>
            {/* Top App Bar */}
            <View style={styles.appbar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backIcon}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.appbarTitle}>الرئيسية</Text>
                <View style={{ width: 32 }} />
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
                <TextInput
                    placeholder="ابحث عن موقع أو شارع"
                    placeholderTextColor="#D3DDF1"
                    style={styles.searchInput}
                    textAlign="right"
                />
                <Text style={styles.searchIcon}>🔎</Text>
            </View>

            {/* Filter Chips */}
            <View style={styles.filters}>
                <FilterChip color="#F05252" label="حفرة" />
                <FilterChip color="#F59E0B" label="حادث" />
                <FilterChip color="#34D399" label="كاشف السرعة" />
            </View>

            {/* Map area */}
            <View style={styles.mapCard}>
                {MapView && Marker ? (
                    <MapView
                        style={StyleSheet.absoluteFill}
                        initialRegion={{
                            latitude: 40.4168,
                            longitude: -3.7038,
                            latitudeDelta: 0.06,
                            longitudeDelta: 0.06,
                        }}
                    >
                        {/* Beispiel-Icons – du kannst hier deine eigenen Marker verwenden */}
                        <Marker coordinate={{ latitude: 40.418, longitude: -3.703 }}>
                            <WarnMarker type="pothole" />
                        </Marker>
                        <Marker coordinate={{ latitude: 40.415, longitude: -3.708 }}>
                            <WarnMarker type="speed" />
                        </Marker>
                        <Marker coordinate={{ latitude: 40.412, longitude: -3.699 }}>
                            <WarnMarker type="accident" />
                        </Marker>
                    </MapView>
                ) : (
                    // Fallback: statisches „Karten“-Bild (optional ersetzbar)
                    <ImageBackground
                        source={require("@/assets/images/react-logo.png")} // ersetze durch eigenes Map-Bild, wenn du magst
                        resizeMode="cover"
                        style={StyleSheet.absoluteFill}
                    />
                )}

                {/* FAB */}
                <TouchableOpacity style={styles.fab} onPress={() => {/* open create report */}}>
                    <Text style={styles.fabPlus}>＋</Text>
                </TouchableOpacity>
            </View>

            {/* Bottom info bar */}
            <View style={styles.infoBar}>
                <Text style={styles.infoText}>
                    <Text style={{ fontWeight: "bold" }}>عدد البلاغات النشطة: </Text>
                    42
                    <Text>  </Text>
                    <Text>📒</Text>
                </Text>
            </View>
        </View>
    );
}

function FilterChip({ color, label }: { color: string; label: string }) {
    return (
        <View style={styles.chip}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.chipText}>{label}</Text>
        </View>
    );
}

function WarnMarker({ type }: { type: "pothole" | "accident" | "speed" }) {
    // Platzhalter-Icons – gern durch PNG/SVG ersetzen
    const emoji =
        type === "pothole" ? "⚠️" : type === "accident" ? "🚧" : "🛑";
    return (
        <View style={styles.markerPill}>
            <Text style={styles.markerText}>{emoji}</Text>
        </View>
    );
}

const BLUE = "#0D2B66";

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BLUE,
        direction: "rtl",
    },

    /* Appbar */
    appbar: {
        height: Platform.OS === "ios" ? 92 : 72,
        paddingTop: Platform.OS === "ios" ? 44 : 20,
        paddingHorizontal: 12,
        backgroundColor: BLUE,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.15)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    backBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    backIcon: { color: "#FFD166", fontSize: 22, lineHeight: 22 },
    appbarTitle: {
        color: "#FFFFFF",
        fontSize: 20,
        fontFamily: "Tajawal-Bold",
        textAlign: "center",
        flex: 1,
    },

    /* Search */
    searchRow: {
        flexDirection: "row-reverse",
        alignItems: "center",
        marginHorizontal: 12,
        marginTop: 10,
        backgroundColor: "#2C4A87",
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 40,
    },
    searchIcon: {
        color: "#FFD166",
        fontSize: 18,
        marginHorizontal: 6,
    },
    searchInput: {
        flex: 1,
        color: "#fff",
        fontSize: 14,
        paddingVertical: 6,
        textAlign: "right",
    },

    /* Filters */
    filters: {
        marginTop: 8,
        paddingHorizontal: 12,
        flexDirection: "row-reverse",
        alignItems: "center",
        gap: 16,
    },
    chip: {
        flexDirection: "row-reverse",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginLeft: 6,
    },
    chipText: {
        color: "#FFFFFF",
        fontFamily: "Tajawal-Medium",
        fontSize: 14,
    },

    /* Map card */
    mapCard: {
        flex: 1,
        marginTop: 8,
        marginHorizontal: 12,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: "#123a7a",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.18)",
    },

    /* FAB */
    fab: {
        position: "absolute",
        bottom: 18,
        left: 18, // in RTL liegt die Karte rechts, FAB unten rechts im Mockup wirkt links wegen RTL → hier optisch unten rechts? brauchst du rechts: nimm 'right: 18'
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#F4B400",
        alignItems: "center",
        justifyContent: "center",
        elevation: 6,
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    fabPlus: { color: BLUE, fontSize: 28, lineHeight: 28, marginTop: -2 },

    /* Marker */
    markerPill: {
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.1)",
    },
    markerText: { fontSize: 14 },

    /* Bottom info bar */
    infoBar: {
        height: 34,
        backgroundColor: "#1A3B7A",
        alignItems: "center",
        justifyContent: "center",
    },
    infoText: {
        color: "#FFFFFF",
        fontSize: 13,
        textAlign: "center",
        fontFamily: "Tajawal-Medium",
    },
});