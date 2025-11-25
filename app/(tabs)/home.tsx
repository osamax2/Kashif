// app/(tabs)/home.tsx
import ReportDialog from "@/components/ReportDialog";
import Ionicons from "@expo/vector-icons/Ionicons";
// Lightweight local Slider fallback to avoid dependency on @react-native-community/slider
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import * as Speech from "expo-speech";
import React, { useEffect, useRef, useState } from "react";

import {
    Animated,
    I18nManager,
    Image,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

function Slider(props: any) {
    const { style, minimumValue = 0, maximumValue = 1, value = 0, onValueChange } = props;
    const [width, setWidth] = useState(0);
    const containerRef = useRef<any>(null);
    // Slider is purely presentational; keep state for slider size only.


    const handleResponder = (evt: any) => {
        if (!width) return;
        const x = evt.nativeEvent.locationX;
        let pct = x / width;
        if (pct < 0) pct = 0;
        if (pct > 1) pct = 1;
        const newVal = minimumValue + pct * (maximumValue - minimumValue);
        onValueChange && onValueChange(newVal);
    };

    const filledPct = Math.max(0, Math.min(1, (value - minimumValue) / (maximumValue - minimumValue)));

    return (
        <View
            ref={containerRef}
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onResponderGrant={handleResponder}
            onResponderMove={handleResponder}
            style={[{ height: 36, borderRadius: 8, backgroundColor: props.maximumTrackTintColor || '#555', justifyContent: 'center' }, style]}
        >
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${filledPct * 100}%`, backgroundColor: props.minimumTrackTintColor || '#30D158', borderRadius: 8 }} />
            <View style={{ position: 'absolute', left: `${Math.max(0, filledPct * 100 - 2)}%`, top: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: props.thumbTintColor || '#30D158', elevation: 6 }} />
        </View>
    );
}

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
    async function playTestSound() {
        // Use speech as a safe fallback when no audio file is available.
        try {
            await Speech.speak("هذا اختبار للصوت", { language: "ar-SA", rate: 0.9 });
        } catch (e) {
            console.warn("playTestSound (speech) failed", e);
        }
    }

const [audioVisible, setAudioVisible] = useState(false);
const [volume, setVolume] = useState(0.6);
const [sound, setSound] = useState<any>(null);
const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
};
const activateWarningMode = () => {
    setWarningsEnabled(true);
    setNavigationEnabled(true);
    if (!soundEnabled) setSoundEnabled(true);
};


// Audio Modi
const [mode, setMode] = useState("alerts"); // "system" | "alerts" | "sound"
    // Sound / warning / navigation toggles (moved here from Slider)
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [warningsEnabled, setWarningsEnabled] = useState(true);
    const [navigationEnabled, setNavigationEnabled] = useState(true);
    const [appVolume, setAppVolume] = useState(1.0);

    // Load saved settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const s = await AsyncStorage.getItem("audioSettings");
                if (s) {
                    const settings = JSON.parse(s);
                    setSoundEnabled(!!settings.soundEnabled);
                    setWarningsEnabled(!!settings.warningsEnabled);
                    setNavigationEnabled(!!settings.navigationEnabled);
                    setAppVolume(typeof settings.appVolume === 'number' ? settings.appVolume : 1.0);
                    if (typeof settings.appVolume === 'number') setVolume(settings.appVolume);
                }
            } catch (e) {
                console.warn('Failed to load audio settings', e);
            }
        };

        loadSettings();
    }, []);

    // Persist settings when changed
    useEffect(() => {
        const saveSettings = async () => {
            try {
                const settings = { soundEnabled, warningsEnabled, navigationEnabled, appVolume };
                await AsyncStorage.setItem("audioSettings", JSON.stringify(settings));
            } catch (e) {
                console.warn('Failed to save audio settings', e);
            }
        };

        saveSettings();
    }, [soundEnabled, warningsEnabled, navigationEnabled, appVolume]);


    /** Dialog-Typ (welcher Meldungs-Typ wird erstellt?) */
    const [reportType, setReportType] = useState<
        "pothole" | "accident" | "speed" | null
    >(null);

    /** MULTI-FILTER */
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
        {
            id: "pothole",
            icon: require("../../assets/icons/pothole.png"),
            offset: { top: 170, left: -180 },
        },
        {
            id: "accident",
            icon: require("../../assets/icons/accident.png"),
            offset: { top: 100, left: -220 },
        },
        {
            id: "speed",
            icon: require("../../assets/icons/speed.png"),
            offset: { top: 240, left: -220 },
        },
    ] as const;

    async function speakWarning(type: string) {
    if (!soundEnabled) return;

    let message = "";
    switch (type) {
        case "pothole":
            message = "تحذير! توجد حفرة أمامك";
            break;
        case "accident":
            message = "تحذير! حادث على الطريق";
            break;
        case "speed":
            message = "احذر! كاميرا سرعة أمامك";
            break;
        default:
            message = "تحذير!";
    }

    await Speech.speak(message, {
        language: "ar-SA",
        rate: 0.9,
        pitch: 1.0,
    });
}
async function playBeep(value: number) {
    setAppVolume(value);
    // Play a short spoken beep using expo-speech (no audio-asset required)
    try {
        await Speech.speak("بيب", { language: "ar-SA", rate: 1.0, pitch: 1.0 });
    } catch (err) {
        console.warn("playBeep (speech) failed", err);
    }
}

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
            {/* SOUND BUTTON UNTER DEM + BUTTON */}
            <TouchableOpacity
            style={styles.soundButton}
            onPress={() => setAudioVisible(true)}
                >
            <Ionicons name="volume-high" style={styles.soundIcon} />
                </TouchableOpacity>


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
                            onPress={() => {
                                setReportType(item.id); // Dialog öffnen
                                setMenuOpen(false);
                            }}
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

            {/* MELDUNGS-DIALOG */}
            <ReportDialog
                visible={reportType !== null}
                type={reportType}
                onClose={() => setReportType(null)}
            />
            {/* AUDIO BOTTOM SHEET */}
{audioVisible && (
  <View style={styles.audioOverlay}>
    {/* dunkler Hintergrund */}
    <Pressable
      style={styles.audioOverlayBg}
      onPress={() => setAudioVisible(false)}
    />

    {/* GLASS-SHEET */}
    <BlurView intensity={55} tint="dark" style={styles.audioSheet}>
      <View style={styles.audioSheetHandle} />

      <Text style={styles.audioTitle}>إعدادات الصوت</Text>

      {/* Lautstärke + Test */}
      <View style={styles.volumeSection}>
        <Text style={styles.audioLabel}>مستوى صوت التطبيق</Text>

        <Slider
          style={{ width: "100%", height: 40 }}
          minimumValue={0}
          maximumValue={1}
          value={volume}
          onValueChange={(v: number) => {
            setVolume(v);
            setAppVolume(v);
          }}
          minimumTrackTintColor="#30D158"
          maximumTrackTintColor="rgba(255,255,255,0.25)"
          thumbTintColor="#30D158"
        />

        <TouchableOpacity style={styles.testBtn} onPress={playTestSound}>
          <Text style={styles.testBtnText}>اختبار الصوت</Text>
        </TouchableOpacity>
      </View>

      {/* MODI / KACHELN */}
      <View style={styles.modeRow}>
        {/* System */}
        <TouchableOpacity
          style={[
            styles.modeBox,
            mode === "system" && styles.modeBoxActive,
          ]}
          onPress={() => setMode("system")}
        >
          <View style={styles.modeIconCircle}>
            <Ionicons
              name="sparkles"
              size={24}
              color={mode === "system" ? "#FFFFFF" : "#B0C4FF"}
            />
          </View>
          <Text style={styles.modeText}>النظام</Text>
        </TouchableOpacity>

        {/* Warnungen + Navi */}
        <TouchableOpacity
          style={[
            styles.modeBox,
            warningsEnabled && navigationEnabled && styles.modeBoxActive,
          ]}
          onPress={activateWarningMode}
        >
          <View style={styles.modeIconCircle}>
            <Ionicons
              name="warning"
              size={24}
              color={
                warningsEnabled && navigationEnabled ? "#FFFFFF" : "#FFD480"
              }
            />
          </View>
          <Text style={styles.modeText}>تحذيرات + الملاحة</Text>
        </TouchableOpacity>

        {/* Ton an/aus */}
        <TouchableOpacity
          style={[
            styles.modeBox,
            soundEnabled && styles.modeBoxActive,
          ]}
          onPress={toggleSound}
        >
          <View style={styles.modeIconCircle}>
            <Ionicons
              name={soundEnabled ? "volume-high" : "volume-mute"}
              size={24}
              color={soundEnabled ? "#FFFFFF" : "#FF9E9E"}
            />
          </View>
          <Text style={styles.modeText}>
            {soundEnabled ? "الصوت مُفعل" : "الصوت مُغلق"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Close */}
      <TouchableOpacity
        style={styles.closeAudioBtn}
        onPress={() => setAudioVisible(false)}
      >
        <Text style={styles.closeAudioText}>إغلاق</Text>
      </TouchableOpacity>
    </BlurView>
  </View>
)}

    </View>
)}


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
    fabPlus: { color: BLUE, fontSize: 36, marginTop: -2 },

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
        paddingHorizontal: 37,
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
    soundButton: {
    position: "absolute",
    bottom: 125,       // über dem unteren Menü
    left: 22,         // gleiche Position wie der + Button
    width: 54,
    height: 54,
    backgroundColor: "#F4B400",
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,

},
soundIcon: {
    fontSize: 26,
    color: "#0D2B66",               // dunkelblau
},

bottomOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    justifyContent: "flex-end",
    zIndex: 999,
},

overlayBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
},

bottomSheet: {
    backgroundColor: "#1E1E1E",
    padding: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: 60,
},

sheetHandle: {
    width: 50,
    height: 5,
    backgroundColor: "#777",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
},

sheetTitle: {
    color: "#FFF",
    fontSize: 22,
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Tajawal-Bold",
},

sliderRow: {
    marginBottom: 25,
},

sliderLabel: {
    color: "#EEE",
    fontSize: 16,
    marginBottom: 8,
    fontFamily: "Tajawal-Regular",
},

fakeSlider: {
    width: "100%",
    height: 8,
    borderRadius: -6,
    backgroundColor: "#555",
},

fakeSliderFill: {
    width: "60%",
    height: "100%",
    backgroundColor: "#28d653",
    borderRadius: -6,
},

optionsRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginTop: 10,
},

optionBox: {
    width: "30%",
    backgroundColor: "#333",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
},

optionText: {
    color: "#FFF",
    marginTop: 8,
    fontFamily: "Tajawal-Regular",
    fontSize: 14,
},

closeButton: {
    backgroundColor: "#F4B400",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
},

closeText: {
    textAlign: "center",
    color: "#fff",
    fontFamily: "Tajawal-Bold",
    fontSize: 18,
},

audioOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "flex-end",
    zIndex: 999,
},

audioOverlayBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
},

audioSheet: {
    backgroundColor: "#1C1C1E",
    padding: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: 40,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
},

audioSheetHandle: {
    width: 45,
    height: 5,
    backgroundColor: "#666",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 18,
},

audioTitle: {
    color: "#FFF",
    fontSize: 22,
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Tajawal-Bold",
},
volumeSection: {
  marginBottom: 22,
},

audioLabel: {
    color: "#EEE",
    fontSize: 16,
    marginBottom: 8,
    fontFamily: "Tajawal-Regular",
},

testBtn: {
  marginTop: 10,
  alignSelf: "flex-start",
  paddingHorizontal: 18,
  paddingVertical: 8,
  borderRadius: 999,
  backgroundColor: "rgba(48,209,88,0.16)",
  borderWidth: 1,
  borderColor: "#30D158",
},

testBtnText: {
    color: "#FFF",
    fontSize: 16,
    textAlign: "center",
    fontFamily: "Tajawal-Bold",
},

modeRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 26,
},

modeBox: {
    width: "30%",
    backgroundColor: "#2C2C2E",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
},

modeBoxActive: {
  backgroundColor: "rgba(10,132,255,0.35)",
  borderColor: "#0A84FF",
  shadowColor: "#000",
  shadowOpacity: 0.3,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 10,
  elevation: 8,
},

modeText: {
    color: "#FFF",
    marginTop: 6,
    fontFamily: "Tajawal-Medium",
},

closeAudioBtn: {
    backgroundColor: "#F4B400",
    paddingVertical: 14,
    borderRadius: 12,
},
modeIconCircle: {
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0,0,0,0.35)",
  marginBottom: 6,
},

closeAudioText: {
    color: "#0D2B66",
    textAlign: "center",
    fontSize: 18,
    fontFamily: "Tajawal-Bold",
},

});
