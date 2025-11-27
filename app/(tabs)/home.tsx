// app/(tabs)/home.tsx
import ReportDialog from "@/components/ReportDialog";
import { useAuth } from "@/contexts/AuthContext";
import { Category, lookupAPI, Report, reportingAPI, ReportStatus, Severity } from "@/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
// Lightweight local Slider fallback to avoid dependency on @react-native-community/slider
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import React, { useEffect, useRef, useState } from "react";

import {
    Animated,
    I18nManager,
    Image,
    Keyboard,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import MapView, { Marker } from "react-native-maps";

function Slider({ value = 0, minimumValue = 0, maximumValue = 1, onValueChange }: any) {
    const [width, setWidth] = useState(0);

    const handleTouch = (evt: any) => {
        if (!width) return;
        let x = evt.nativeEvent.locationX;
        if (x < 0) x = 0;
        if (x > width) x = width;

        const newVal = minimumValue + (x / width) * (maximumValue - minimumValue);
        onValueChange && onValueChange(newVal);
    };

    const pct = (value - minimumValue) / (maximumValue - minimumValue);

    return (
        <View
            onLayout={e => setWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onResponderMove={handleTouch}
            onResponderGrant={handleTouch}
            style={{
                height: 22,
                borderRadius: 25,
                backgroundColor: "rgba(255,255,255,0.15)",
                justifyContent: "center",
                paddingHorizontal: 2,
            }}
        >
            {/* Füllung */}
            <View
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${pct * 100}%`,
                    backgroundColor: "#F4B400",
                    borderRadius: 20,
                }}
            />

            {/* Thumb */}
            <View
                style={{
                    position: "absolute",
                    left: pct * width - 14,
                    width: 28,
                    height: 28,
                    borderRadius: 19,
                    backgroundColor: "#F4B400",
                    shadowColor: "#F4B400",
                    shadowOpacity: 0.5,
                    shadowOffset: { width: 0, height: 2 },
                    shadowRadius: 6,
                }}
            />
        </View>
    );
}


I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const BLUE = "#0D2B66";

export default function HomeScreen() {
    const { user } = useAuth();
    
    /** BACKEND DATA */
    const [reports, setReports] = useState<Report[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [severities, setSeverities] = useState<Severity[]>([]);
    const [statuses, setStatuses] = useState<ReportStatus[]>([]);
    const [loading, setLoading] = useState(true);
    
    /** USER LOCATION */
    const [userLocation, setUserLocation] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    
    const [mapRegion, setMapRegion] = useState({
        latitude: 33.5138,
        longitude: 36.2765,
        latitudeDelta: 0.2,
        longitudeDelta: 0.2,
    });
    
    /** SEARCH */
    const [searchMarker, setSearchMarker] = useState<{
        latitude: number;
        longitude: number;
        title: string;
    } | null>(null);
    const mapRef = useRef<MapView>(null);
    async function playTestSound() {
        // Use speech as a safe fallback when no audio file is available.
        try {
            await Speech.speak("هذا اختبار ", { language: "ar-SA", rate: 0.9 });
        } catch (e) {
            console.warn("playTestSound (speech) failed", e);
        }
    }

const [audioVisible, setAudioVisible] = useState(false);
const [volume, setVolume] = useState(0.6);

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
    // Sound / warning / navigation toggles
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [warningsEnabled, setWarningsEnabled] = useState(true);
    const [navigationEnabled, setNavigationEnabled] = useState(true);
    const [appVolume, setAppVolume] = useState(1.0);

    // Individual warning toggles (moved out from Slider)
    const [warnPothole, setWarnPothole] = useState(true);
    const [warnAccident, setWarnAccident] = useState(true);
    const [warnSpeed, setWarnSpeed] = useState(true);

    // Load data on mount
    useEffect(() => {
        loadData();
        requestLocation();
        loadSettings();
    }, []);
    
    // Load backend data
    const loadData = async () => {
        try {
            setLoading(true);
            const [reportsData, categoriesData, severitiesData, statusesData] = await Promise.all([
                reportingAPI.getReports({ limit: 10000, skip: 0 }).catch((err) => {
                    console.error('Failed to load reports:', err);
                    return [];
                }),
                lookupAPI.getCategories().catch((err) => {
                    console.error('Failed to load categories:', err);
                    return [];
                }),
                lookupAPI.getSeverities().catch((err) => {
                    console.error('Failed to load severities:', err);
                    return [];
                }),
                lookupAPI.getStatuses().catch((err) => {
                    console.error('Failed to load statuses:', err);
                    return [];
                }),
            ]);
            
            console.log(`✅ Loaded ${reportsData.length} reports from backend`);
            console.log(`✅ Loaded ${categoriesData.length} categories`);
            
            setReports(reportsData);
            setCategories(categoriesData);
            setSeverities(severitiesData);
            setStatuses(statusesData);
        } catch (error) {
            console.error('❌ Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };
    
    // Request user location
    const requestLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Location permission denied');
                return;
            }
            
            const location = await Location.getCurrentPositionAsync({});
            const userCoords = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };
            
            setUserLocation(userCoords);
            setMapRegion({
                ...userCoords,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            });
        } catch (error) {
            console.error('Error getting location:', error);
        }
    };

    // Load saved settings
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
    const [activeFilters, setActiveFilters] = useState<number[]>([]);
    

    const toggleFilter = (categoryId: number) => {
        setActiveFilters((prev) =>
            prev.includes(categoryId)
                ? prev.filter((f) => f !== categoryId)
                : [...prev, categoryId]
        );
    };

    const visibleMarkers =
        activeFilters.length === 0
            ? reports
            : reports.filter((r) => activeFilters.includes(r.category_id));
    
    // Debug logging
    useEffect(() => {
        console.log(`📍 Total reports: ${reports.length}`);
        console.log(`📍 Visible markers: ${visibleMarkers.length}`);
        console.log(`🔍 Active filters: ${activeFilters.length}`);
    }, [reports.length, visibleMarkers.length, activeFilters.length]);
    
    // Helper functions
    const getCategoryByName = (name: string): Category | undefined => {
        return categories.find(c => c.name === name);
    };
    
    const getCategoryIcon = (categoryId: number): string => {
        const category = categories.find(c => c.id === categoryId);
        if (!category) return "📍";
        
        if (category.name.includes("حفرة")) return "⚠️";
        if (category.name.includes("حادث")) return "🚨";
        if (category.name.includes("كاشف") || category.name.includes("سرعة")) return "📷";
        return "📍";
    };
    
    // Navigate to selected place
    const navigateToPlace = (latitude: number, longitude: number, title: string) => {
        const newRegion = {
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
        
        setSearchMarker({ latitude, longitude, title });
        setMapRegion(newRegion);
        
        // Animate map to location
        if (mapRef.current) {
            mapRef.current.animateToRegion(newRegion, 1000);
        }
        
        Keyboard.dismiss();
    };

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
            offset: { top: 180, left: -190 },
        },
        {
            id: "accident",
            icon: require("../../assets/icons/accident.png"),
            offset: { top: 120, left: -220 },
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
            <View style={styles.searchContainer}>
                <GooglePlacesAutocomplete
                    placeholder="ابحث عن موقع أو شارع"
                    minLength={2}
                    debounce={400}
                    listViewDisplayed='auto'
                    fetchDetails={true}
                    onPress={(data, details = null) => {
                        console.log('🔍 Search selected:', data.description);
                        if (details && details.geometry && details.geometry.location) {
                            const { lat, lng } = details.geometry.location;
                            console.log('📍 Coordinates:', lat, lng);
                            navigateToPlace(lat, lng, data.description);
                        } else {
                            console.warn('⚠️ No geometry details available');
                        }
                    }}
                    onFail={(error) => {
                        console.error('❌ Places API Error:', error);
                        console.error('Error details:', JSON.stringify(error, null, 2));
                    }}
                    query={{
                        key: 'REMOVED_API_KEY',
                        language: 'ar',
                        components: 'country:sy',
                        types: 'geocode',
                    }}
                    GooglePlacesSearchQuery={{
                        rankby: 'distance',
                    }}
                    filterReverseGeocodingByTypes={[
                        'locality',
                        'administrative_area_level_3',
                    ]}
                    enablePoweredByContainer={false}
                    keepResultsAfterBlur={true}
                    styles={{
                        container: {
                            flex: 0,
                            zIndex: 1000,
                            elevation: 1000,
                        },
                        textInputContainer: {
                            backgroundColor: '#2C4A87',
                            borderRadius: 10,
                            paddingHorizontal: 10,
                            height: 40,
                            flexDirection: 'row-reverse',
                        },
                        textInput: {
                            backgroundColor: 'transparent',
                            color: '#fff',
                            fontSize: 16,
                            textAlign: 'right',
                            height: 40,
                            paddingRight: 35,
                            fontFamily: 'Tajawal-Regular',
                        },
                        listView: {
                            backgroundColor: '#2C4A87',
                            borderRadius: 10,
                            marginTop: 5,
                            maxHeight: 200,
                            position: 'absolute',
                            top: 45,
                            left: 0,
                            right: 0,
                        },
                        row: {
                            backgroundColor: '#2C4A87',
                            padding: 13,
                            height: 44,
                            flexDirection: 'row-reverse',
                        },
                        separator: {
                            height: 0.5,
                            backgroundColor: 'rgba(255,255,255,0.2)',
                        },
                        description: {
                            color: '#fff',
                            fontSize: 14,
                            textAlign: 'right',
                            fontFamily: 'Tajawal-Regular',
                        },
                        predefinedPlacesDescription: {
                            color: '#FFD166',
                        },
                        poweredContainer: {
                            display: 'none',
                        },
                    }}
                    textInputProps={{
                        placeholderTextColor: '#D3DDF1',
                        returnKeyType: 'search',
                    }}
                    renderRightButton={() => (
                        <View style={styles.searchIconContainer}>
                            <Text style={styles.searchIcon}>🔍</Text>
                        </View>
                    )}
                />
            </View>

            {/* FILTER-LEISTE (ALLE 3 KLICKBAR, MULTI-SELECT) */}
            <View style={styles.categoriesRow}>
                {categories.slice(0, 3).map((category) => {
                    const isActive = activeFilters.includes(category.id);
                    const color = category.name.includes("كاشف") || category.name.includes("سرعة") 
                        ? "red" 
                        : category.name.includes("حادث")
                        ? "#a7c8f9ff"
                        : "gold";
                    
                    return (
                        <TouchableOpacity
                            key={category.id}
                            style={[
                                styles.categoryItem,
                                isActive && styles.categoryItemActive,
                            ]}
                            onPress={() => toggleFilter(category.id)}
                        >
                            <Text
                                style={[
                                    styles.categoryText,
                                    isActive && styles.categoryTextActive,
                                ]}
                            >
                                {category.name}
                            </Text>
                            <View
                                style={[
                                    styles.dot,
                                    { backgroundColor: color },
                                    isActive && styles.dotActive,
                                ]}
                            />
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* KARTE */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFill}
                    region={mapRegion}
                    onRegionChangeComplete={setMapRegion}
                    showsUserLocation={true}
                    showsMyLocationButton={true}
                >
                    {/* Search Result Marker */}
                    {searchMarker && (
                        <Marker
                            coordinate={{
                                latitude: searchMarker.latitude,
                                longitude: searchMarker.longitude,
                            }}
                            title={searchMarker.title}
                            pinColor="green"
                        >
                            <View style={styles.searchMarker}>
                                <Text style={{ fontSize: 24 }}>📍</Text>
                            </View>
                        </Marker>
                    )}
                    
                    {/* User Location Marker */}
                    {userLocation && (
                        <Marker
                            coordinate={userLocation}
                            title="موقعك"
                            pinColor="blue"
                        />
                    )}
                    
                    {/* Report Markers */}
                    {visibleMarkers.map((report) => {
                        try {
                            const lat = parseFloat(report.latitude.toString());
                            const lng = parseFloat(report.longitude.toString());
                            
                            // Validiere Koordinaten
                            if (isNaN(lat) || isNaN(lng)) {
                                console.warn(`⚠️ Invalid coordinates for report ${report.id}`);
                                return null;
                            }
                            
                            return (
                                <Marker 
                                    key={`report-${report.id}`}
                                    coordinate={{
                                        latitude: lat,
                                        longitude: lng,
                                    }}
                                    title={report.title || categories.find(c => c.id === report.category_id)?.name || 'بلاغ'}
                                    description={report.description}
                                >
                                    <View style={styles.marker}>
                                        <Text style={{ fontSize: 18 }}>{getCategoryIcon(report.category_id)}</Text>
                                    </View>
                                </Marker>
                            );
                        } catch (error) {
                            console.error(`❌ Error rendering marker for report ${report.id}:`, error);
                            return null;
                        }
                    })}
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
                <Text style={styles.infoText}>
                    عدد البلاغات النشطة: {visibleMarkers.length} / {reports.length} 📘
                </Text>
            </View>

            {/* MELDUNGS-DIALOG */}
            <ReportDialog
                visible={reportType !== null}
                type={reportType}
                onClose={() => setReportType(null)}
                onSubmit={async (data) => {
                    try {
                        if (!userLocation) {
                            alert('يرجى تفعيل تحديد الموقع');
                            return;
                        }
                        
                        // Map report type to category
                        let categoryId = 1;
                        if (reportType === 'pothole') {
                            categoryId = getCategoryByName('حفرة')?.id || 1;
                        } else if (reportType === 'accident') {
                            categoryId = getCategoryByName('حادث')?.id || 2;
                        } else if (reportType === 'speed') {
                            categoryId = getCategoryByName('كاشف سرعة')?.id || 3;
                        }
                        
                        // Map severity to severity_id
                        const severityMap: { [key: string]: number } = {
                            low: 1,
                            medium: 2,
                            high: 3,
                        };
                        const severityId = severityMap[data.severity] || 1;
                        
                        console.log('📤 Creating report:', { categoryId, severityId, location: userLocation });
                        
                        // Create report
                        const newReport = await reportingAPI.createReport({
                            title: data.type === 'pothole' 
                                ? 'حفرة في الطريق' 
                                : data.type === 'accident'
                                ? 'حادث مروري'
                                : 'كاشف سرعة',
                            description: data.notes || 'بلاغ جديد',
                            category_id: categoryId,
                            latitude: userLocation.latitude,
                            longitude: userLocation.longitude,
                            address_text: data.address,
                            severity_id: severityId,
                            photo_urls: data.photoUri || undefined,
                        });
                        
                        console.log('✅ Report created:', newReport.id);
                        
                        // Refresh reports BEFORE closing dialog
                        await loadData();
                        
                        console.log('✅ Data reloaded, total reports:', reports.length);
                        
                        // Dialog will auto-close after showing success message
                        // The onClose() is called from ReportDialog.tsx after 1.5s
                    } catch (error) {
                        console.error('❌ Error creating report:', error);
                        alert('❌ حدث خطأ أثناء إرسال البلاغ');
                    }
                }}
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
          style={{ width: "100%", height: 35 }}
          minimumValue={0}
          maximumValue={1}
          value={volume}
          onValueChange={(v: number) => {
            setVolume(v);
            setAppVolume(v);
          }}
          minimumTrackTintColor="#FFD166"
          maximumTrackTintColor="rgba(255,255,255,0.25)"
          thumbTintColor="#FFD166"
        />

        <TouchableOpacity style={styles.testBtn} onPress={playTestSound}>
          <Text style={styles.testBtnText}>اختبار الصوت</Text>
        </TouchableOpacity>
      </View>

      {/* AUDIO MODES */}
<View style={styles.modeRow}>

    {/* حفرة */}
    <TouchableOpacity
        style={[
            styles.modeBox,
            warnPothole && styles.modeBoxActive,
        ]}
        onPress={() => setWarnPothole(!warnPothole)}
    >
         <View style={[styles.modeIconCircle]}>
            <Ionicons name="alert-circle" size={26} color="yellow" />
        </View>
        <Text style={styles.modeText}>حفرة</Text>
    </TouchableOpacity>

    {/* حادث */}
    <TouchableOpacity
        style={[
            styles.modeBox,
            warnAccident && styles.modeBoxActive,
        ]}
        onPress={() => setWarnAccident(!warnAccident)}
    >
        <View style={[styles.modeIconCircle]}>
            <Ionicons name="warning" size={26} color="#a7c8f9ff" />
        </View>
        <Text style={styles.modeText}>حادث</Text>
    </TouchableOpacity>

    {/* كاشف السرعة */}
    <TouchableOpacity
        style={[
            styles.modeBox,
            warnSpeed && styles.modeBoxActive,
        ]}
        onPress={() => setWarnSpeed(!warnSpeed)}
    >
        <View style={[styles.modeIconCircle]}>
            <Ionicons name="speedometer" size={26} color="red" />
        </View>
        <Text style={styles.modeText}>كاشف السرعة</Text>
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
    root: { flex: 1, backgroundColor: BLUE, direction: "rtl" ,paddingTop: 12,},

    appbar: {
        height: Platform.OS === "ios" ? 80 : 80,
        paddingTop: Platform.OS === "ios" ? 30 : 30,
        backgroundColor: BLUE,
        alignItems: "center",
        justifyContent: "center",
    },
    title: { color: "#fff", fontSize: 24, fontFamily: "Tajawal-Bold" },

    searchContainer: {
        marginHorizontal: 15,
        marginTop: 10,
        zIndex: 1000,
        elevation: 1000,
    },
    searchIconContainer: {
        position: 'absolute',
        right: 10,
        top: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchIcon: { color: "#FFD166", fontSize: 18 },
    searchMarker: {
        backgroundColor: "#4CD964",
        padding: 4,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
    },

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
        bottom: 90,
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
    bottom: 570,       // über dem unteren Menü
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
    height: 5,
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
  backgroundColor: "rgba(224, 224, 157, 0.16)",
  borderWidth: 1,
  borderColor: "#F4B400",
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
    width: "100%",
    marginTop: 10,
    marginBottom: 20,
},

modeBox: {
    width: "30%",
    backgroundColor: "#0F356B",
    borderRadius: 25,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
    bottom:18,
    height: 125,   
},

modeBoxActive: {
  borderColor: "#FFD166",
    shadowColor: "#FFD166",
    shadowOpacity: 0.45,
    backgroundColor: "#17498F",
},

modeText: {
     color: "#FFF",
    fontSize: 14,             // ⭐ gleiche Schriftgröße für alle
    marginTop: 9,
    fontFamily: "Tajawal-Medium",
    textAlign: "center",
},

closeAudioBtn: {
    backgroundColor: "#F4B400",
    paddingVertical: 14,
    borderRadius: 12,
    bottom: 25,
},


closeAudioText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 18,
    fontFamily: "Tajawal-Bold",
},
/* ===== VARIANTE 1 DESIGN ===== */

modeBoxV1: {
    width: "30%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
},

modeBoxV1Active: {
    backgroundColor: "rgba(255,209,102,0.25)",
    borderColor: "#F4B400",
    shadowColor: "#F4B400",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
},



modeIconCircle: {
   width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: -13,
},

});
