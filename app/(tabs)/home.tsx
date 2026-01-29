// app/(tabs)/home.tsx
import ReportDialog from "@/components/ReportDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useDataSync } from "@/contexts/DataSyncContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Category, lookupAPI, Report, reportingAPI, ReportStatus, Severity } from "@/services/api";
import locationMonitoringService from "@/services/location-monitoring";
import { getPendingReports, removePendingReport, subscribeToNetworkChanges } from "@/services/offline-reports";
import Ionicons from "@expo/vector-icons/Ionicons";
// Lightweight local Slider fallback to avoid dependency on @react-native-community/slider
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";

import {
    Animated,
    Image,
    Keyboard,
    PanResponder,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from "react-native";
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import MapView, { Marker } from "react-native-maps";

function Slider({ value = 0, minimumValue = 0, maximumValue = 1, onValueChange }: any) {
    const [width, setWidth] = useState(0);

    const handleTouch = (evt: any) => {
        if (!width) return;
        // Calculate from right side - right is 0, left is max
        let x = width - evt.nativeEvent.locationX;
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
                backgroundColor: "rgba(128, 128, 128, 0.3)",
                justifyContent: "center",
                paddingHorizontal: 2,
            }}
        >
            {/* Füllung - fills from left based on value */}
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

            {/* Thumb - positioned from left */}
            <View
                style={{
                    position: "absolute",
                    left: pct * width - 14,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
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


// RTL is handled by LanguageContext

const BLUE = "#0D2B66";
const DEFAULT_REPORT_LIMIT = 200;
const REPORT_RADIUS_KM = 25;

const PLACES_AUTOCOMPLETE_STYLES = {
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
} as const;

export default function HomeScreen() {
    const { user, refreshUser } = useAuth();
    const { t, language } = useLanguage();
    const { reportCreated } = useDataSync();
    
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
    
    /** LONG PRESS MARKER - when user long presses on map */
    const [longPressMarker, setLongPressMarker] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    
    /** REPORT LOCATION - either from search, long press, or GPS */
    const [reportLocation, setReportLocation] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    
    const mapRef = useRef<MapView>(null);
    const googlePlacesRef = useRef<any>(null);
    const lastSelectedCoords = useRef<{
        latitude: number;
        longitude: number;
        title: string;
    } | null>(null);
    const [searchText, setSearchText] = useState('');
    const [forceHideSuggestions, setForceHideSuggestions] = useState(false);

    
    async function playTestSound() {
        // Use speech as a safe fallback when no audio file is available.
        try {
            await Speech.speak(t('home.testSoundText'), { 
                language: language === 'ar' ? "ar-SA" : "en-US", 
                rate: 0.9,
                volume: appVolume
            });
        } catch (e) {
            console.warn("playTestSound (speech) failed", e);
        }
    }

const [audioVisible, setAudioVisible] = useState(false);
const [volume, setVolume] = useState(0.6);
const audioSheetY = useRef(new Animated.Value(0)).current;

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
    
    // Location monitoring state
    const [isMonitoringActive, setIsMonitoringActive] = useState(false);
    
    // PanResponder for swipe-to-dismiss audio sheet
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 5;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    audioSheetY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100) {
                    // Swipe down threshold reached - close sheet
                    Animated.timing(audioSheetY, {
                        toValue: 500,
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => {
                        setAudioVisible(false);
                        audioSheetY.setValue(0);
                    });
                } else {
                    // Snap back
                    Animated.spring(audioSheetY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    // Load data on mount and when refreshKey changes
    useEffect(() => {
        requestLocation();
        loadSettings();
    }, []);
    
    // Sync pending offline reports when network is available
    useEffect(() => {
        const syncPendingReports = async () => {
            try {
                const pendingReports = await getPendingReports();
                if (pendingReports.length === 0) return;
                
                console.log(`Syncing ${pendingReports.length} pending reports...`);
                
                for (const report of pendingReports) {
                    try {
                        // Map type to category_id
                        const categoryMap: Record<string, number> = {
                            speed: 1,
                            pothole: 2,
                            accident: 3,
                        };
                        
                        // Map severity
                        const severityMap: Record<string, Severity> = {
                            low: 'low',
                            medium: 'medium',
                            high: 'high',
                        };
                        
                        await reportingAPI.createReport({
                            title: report.type === 'speed' ? 'Speed Camera' : 
                                   report.type === 'pothole' ? 'Pothole' : 'Accident',
                            description: report.notes || `${report.type} report`,
                            category_id: categoryMap[report.type || 'pothole'] || 2,
                            severity: severityMap[report.severity] || 'medium',
                            latitude: report.latitude || 0,
                            longitude: report.longitude || 0,
                            address: report.address,
                        });
                        
                        await removePendingReport(report.id);
                        console.log(`Synced pending report: ${report.id}`);
                    } catch (err) {
                        console.error(`Failed to sync report ${report.id}:`, err);
                    }
                }
            } catch (error) {
                console.error('Error syncing pending reports:', error);
            }
        };
        
        // Sync on mount
        syncPendingReports();
        
        // Subscribe to network changes
        const unsubscribe = subscribeToNetworkChanges(
            () => {
                console.log('Network available, syncing pending reports...');
                syncPendingReports();
            },
            () => {
                console.log('Network unavailable');
            }
        );
        
        return unsubscribe;
    }, []);
    
    // Reload data when refresh is triggered from other screens
    const { refreshKey } = useDataSync();
    useEffect(() => {
        if (refreshKey > 0) {
            loadData(userLocation ?? undefined);
        }
    }, [refreshKey, userLocation]);
    
    // Load backend data
    const loadData = async (location?: { latitude: number; longitude: number }) => {
        try {
            setLoading(true);
            const reportParams: {
                skip: number;
                limit?: number;
                latitude?: number;
                longitude?: number;
                radius_km?: number;
            } = { skip: 0, limit: DEFAULT_REPORT_LIMIT };

            if (location?.latitude != null && location?.longitude != null) {
                reportParams.latitude = location.latitude;
                reportParams.longitude = location.longitude;
                reportParams.radius_km = REPORT_RADIUS_KM;
            }

            const [reportsData, categoriesData, severitiesData, statusesData] = await Promise.all([
                reportingAPI.getReports(reportParams).catch((err) => {
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
            
            if (location) {
                console.log(
                    `✅ Loaded ${reportsData.length} nearby reports within ${REPORT_RADIUS_KM}km`,
                );
            } else {
                console.log(`✅ Loaded ${reportsData.length} reports (default scope)`);
            }
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
                await loadData();
                return;
            }
            
            const location = await Location.getCurrentPositionAsync({});
            const userCoords = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };
            
            setUserLocation(userCoords);
            setReportLocation(userCoords); // Use GPS as default report location
            
            const newRegion = {
                ...userCoords,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            };
            setMapRegion(newRegion);
            
            // Animate map to user location
            setTimeout(() => {
                if (mapRef.current) {
                    mapRef.current.animateToRegion(newRegion, 1000);
                    console.log('📍 Map animated to user location');
                }
            }, 500);

            await loadData(userCoords);
        } catch (error) {
            console.error('Error getting location:', error);
            await loadData();
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
                
                // Load alert type settings
                setWarnPothole(settings.warnPothole !== false);
                setWarnAccident(settings.warnAccident !== false);
                setWarnSpeed(settings.warnSpeed !== false);
            }
            
            // Check if monitoring is active
            setIsMonitoringActive(locationMonitoringService.isActive());
        } catch (e) {
            console.warn('Failed to load audio settings', e);
        }
    };

    // Persist settings when changed
    useEffect(() => {
        const saveSettings = async () => {
            try {
                const settings = { 
                    soundEnabled, 
                    warningsEnabled, 
                    navigationEnabled, 
                    appVolume,
                    warnPothole,
                    warnAccident,
                    warnSpeed,
                };
                await AsyncStorage.setItem("audioSettings", JSON.stringify(settings));
                
                // Update location monitoring service with new settings
                locationMonitoringService.updateSettings({
                    soundEnabled,
                    warnPothole,
                    warnAccident,
                    warnSpeed,
                    appVolume,
                    language,
                });
            } catch (e) {
                console.warn('Failed to save audio settings', e);
            }
        };

        saveSettings();
    }, [soundEnabled, warningsEnabled, navigationEnabled, appVolume, warnPothole, warnAccident, warnSpeed, language]);


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
        
        const name = category.name_ar || category.name_en || category.name || "";
        
        if (name.includes("حفرة") || name.toLowerCase().includes("pothole")) return "⚠️";
        if (name.includes("حادث") || name.toLowerCase().includes("accident")) return "🚨";
        if (name.includes("كاشف") || name.includes("سرعة") || name.toLowerCase().includes("speed")) return "📷";
        return "📍";
    };
    
    // Get category color for markers
    const getCategoryColor = (categoryId: number): string => {
        const category = categories.find(c => c.id === categoryId);
        if (category?.color) return category.color;
        
        // Fallback colors based on category name
        const name = category?.name_ar || category?.name_en || category?.name || "";
        if (name.includes("كاشف") || name.includes("سرعة") || name.toLowerCase().includes("speed")) return "#22C55E"; // Green
        if (name.includes("حادث") || name.toLowerCase().includes("accident")) return "#EF4444"; // Red
        if (name.includes("حفرة") || name.toLowerCase().includes("pothole")) return "#F59E0B"; // Amber
        return "#3B82F6"; // Default blue
    };
    
    // Navigate to selected place
    const navigateToPlace = (latitude: number, longitude: number, title: string) => {
        console.log('\ud83e\uddedNavigating to place:', { latitude, longitude, title });
        
        const newRegion = {
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
        
        setSearchMarker({ latitude, longitude, title });
        setReportLocation({ latitude, longitude }); // Use search location for reports
        setMapRegion(newRegion); // Update map region state
        
        console.log('\u2705 Search marker set:', { latitude, longitude, title });
        console.log('\u2705 Report location updated to search location');
        console.log('\u2705 Map region updated');
        
        // Animate map to location
        if (mapRef.current) {
            console.log('🗺️ Animating to:', newRegion);
            try {
                mapRef.current.animateToRegion(newRegion, 1000);
                console.log('✅ Map animated successfully');
                
                // Remove the search marker after animation completes
                setTimeout(() => {
                    setSearchMarker(null);
                    console.log('🗑️ Search marker removed');
                }, 2000); // 2 seconds after animation
                
            } catch (error) {
                console.error('❌ Animation error:', error);
            }
        } else {
            console.warn('⚠️ mapRef is not ready yet');
        }
        
        Keyboard.dismiss();
    };

    // Handle long press on map - place a marker for custom report location
    const handleMapLongPress = async (event: any) => {
        const { coordinate } = event.nativeEvent;
        console.log('📍 Long press detected at:', coordinate);
        
        // Set the long press marker
        setLongPressMarker({
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
        });
        
        // Update report location to use this position
        setReportLocation({
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
        });
        
        // Vibrate to give feedback
        try {
            const Haptics = require('expo-haptics');
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {
            // Haptics not available, ignore
        }
        
        console.log('✅ Long press marker set, report location updated');
    };
    
    // Clear long press marker when menu is closed or report is submitted
    const clearLongPressMarker = () => {
        setLongPressMarker(null);
        // Reset report location to GPS
        if (userLocation) {
            setReportLocation(userLocation);
        }
    };

    // Fallback search using Google Geocoding API when no suggestions available
    const searchWithGeocoding = async (query: string) => {
        if (!query || query.trim().length < 2) {
            console.log('⚠️ Search query too short');
            return;
        }
        
        console.log('🔍 Searching with Geocoding API:', query);
        
        try {
            const apiKey = 'REMOVED_API_KEY';
            // Add Syria bias to the search
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&language=${language}&components=country:SY`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            console.log('📍 Geocoding response status:', data.status);
            
            if (data.status === 'OK' && data.results && data.results.length > 0) {
                const result = data.results[0];
                const { lat, lng } = result.geometry.location;
                const formattedAddress = result.formatted_address;
                
                console.log('✅ Geocoding found:', { lat, lng, formattedAddress });
                
                lastSelectedCoords.current = {
                    latitude: lat,
                    longitude: lng,
                    title: formattedAddress,
                };
                
                // Update search text with formatted address
                setSearchText(formattedAddress);
                if (googlePlacesRef.current?.setAddressText) {
                    googlePlacesRef.current.setAddressText(formattedAddress);
                }
                
                navigateToPlace(lat, lng, formattedAddress);
            } else {
                console.log('⚠️ No geocoding results for:', query);
                // If no results in Syria, try without country restriction
                const urlGlobal = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&language=${language}`;
                const responseGlobal = await fetch(urlGlobal);
                const dataGlobal = await responseGlobal.json();
                
                if (dataGlobal.status === 'OK' && dataGlobal.results && dataGlobal.results.length > 0) {
                    const result = dataGlobal.results[0];
                    const { lat, lng } = result.geometry.location;
                    const formattedAddress = result.formatted_address;
                    
                    console.log('✅ Global geocoding found:', { lat, lng, formattedAddress });
                    
                    lastSelectedCoords.current = {
                        latitude: lat,
                        longitude: lng,
                        title: formattedAddress,
                    };
                    
                    setSearchText(formattedAddress);
                    if (googlePlacesRef.current?.setAddressText) {
                        googlePlacesRef.current.setAddressText(formattedAddress);
                    }
                    
                    navigateToPlace(lat, lng, formattedAddress);
                } else {
                    console.log('❌ No geocoding results found globally');
                }
            }
        } catch (error) {
            console.error('❌ Geocoding error:', error);
        }
    };

    // Dismiss keyboard and hide suggestions when tapping outside search
    const dismissSearchAndKeyboard = () => {
        Keyboard.dismiss();
        setForceHideSuggestions(true);
        googlePlacesRef.current?.blur?.();
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
    
    // Toggle monitoring when any alert type changes
    useEffect(() => {
        const updateMonitoring = async () => {
            const anyAlertEnabled = warnPothole || warnAccident || warnSpeed;
            
            if (anyAlertEnabled && !isMonitoringActive) {
                // Start monitoring
                const success = await locationMonitoringService.startMonitoring();
                if (success) {
                    setIsMonitoringActive(true);
                    console.log('✅ Location monitoring started');
                }
            } else if (!anyAlertEnabled && isMonitoringActive) {
                // Stop monitoring if all alerts disabled
                await locationMonitoringService.stopMonitoring();
                setIsMonitoringActive(false);
                console.log('🛑 Location monitoring stopped');
            }
        };
        
        updateMonitoring();
    }, [warnPothole, warnAccident, warnSpeed]);

    // Position des FAB (für Icons)
    const [fabPos, setFabPos] = useState({ x: 0, y: 0 });
    const onFabLayout = (e: any) => {
        const { x, y } = e.nativeEvent.layout;
        setFabPos({ x, y });
    };

    // Menu items for the radial menu
    // For Arabic (left FAB), menu opens to the right
    // For English (right FAB), menu opens to the left
    const menuItems = [
        {
            id: "pothole",
            icon: require("../../assets/icons/pothole.png"),
            offset: { top: 180, left: -190, right: 120 },
        },
        {
            id: "accident",
            icon: require("../../assets/icons/accident.png"),
            offset: { top: 120, left: -220, right: 150 },
        },
        {
            id: "speed",
            icon: require("../../assets/icons/speed.png"),
            offset: { top: 240, left: -220, right: 150 },
        },
    ] as const;

    async function speakWarning(type: string) {
    if (!soundEnabled) return;

    let message = "";
    let shouldSpeak = false;
    
    switch (type) {
        case "pothole":
            if (warnPothole) {
                message = t('home.warnPothole');
                shouldSpeak = true;
            }
            break;
        case "accident":
            if (warnAccident) {
                message = t('home.warnAccident');
                shouldSpeak = true;
            }
            break;
        case "speed":
            if (warnSpeed) {
                message = t('home.warnSpeed');
                shouldSpeak = true;
            }
            break;
        default:
            message = language === 'ar' ? 'تحذير!' : 'Warning!';
            shouldSpeak = true;
    }

    if (shouldSpeak) {
        await Speech.speak(message, {
            language: language === 'ar' ? "ar-SA" : "en-US",
            rate: 0.9,
            pitch: 1.0,
            volume: appVolume,
        });
    }
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
            <TouchableWithoutFeedback onPress={dismissSearchAndKeyboard}>
                <View style={styles.appbar}>
                    <Text style={styles.title}>{t('home.title')}</Text>
                </View>
            </TouchableWithoutFeedback>

            {/* SUCHE */}
            <View style={styles.searchContainer}>
                <GooglePlacesAutocomplete
                    ref={googlePlacesRef}
                    placeholder={language === 'ar' ? 'ابحث عن موقع أو شارع' : 'Search for location or street'}
                    minLength={2}
                    debounce={400}
                    fetchDetails={true}
                    onPress={(data, details = null) => {
                        console.log('🔍 ===== SEARCH PRESS EVENT =====');
                        console.log('🔍 Description:', data.description);
                        console.log('🔍 Place ID:', data.place_id);

                        const description = data.description ?? '';

                        setSearchText(description);
                        setForceHideSuggestions(true);

                        if (googlePlacesRef.current?.setAddressText) {
                            googlePlacesRef.current.setAddressText(description);
                        }

                        googlePlacesRef.current?.blur?.();
                        Keyboard.dismiss();

                        if (details?.geometry?.location) {
                            const { lat, lng } = details.geometry.location;
                            lastSelectedCoords.current = {
                                latitude: lat,
                                longitude: lng,
                                title: description,
                            };
                            console.log('🧭 Coordinates received:', { lat, lng });
                            navigateToPlace(lat, lng, description);
                        } else {
                            lastSelectedCoords.current = null;
                            console.warn('⚠️ No geometry details returned for selected place');
                        }
                    }}
                    onFail={(error) => {
                        console.error('❌ Places API Error:', error);
                    }}
                    query={{
                        key: 'REMOVED_API_KEY',
                        language: language,
                        components: 'country:sy',
                    }}
                    enablePoweredByContainer={false}
                    keepResultsAfterBlur={false}
                    listViewDisplayed={forceHideSuggestions ? false : undefined}
                    styles={PLACES_AUTOCOMPLETE_STYLES}
                    textInputProps={{
                        placeholderTextColor: '#D3DDF1',
                        returnKeyType: 'search',
                        value: searchText,
                        onChangeText: (text: string) => {
                            setSearchText(text);
                            setForceHideSuggestions(false);
                        },
                        onFocus: () => {
                            setForceHideSuggestions(false);
                        },
                        onSubmitEditing: () => {
                            console.log('⏎ ENTER/SEARCH pressed');
                            setForceHideSuggestions(true);
                            Keyboard.dismiss();
                            
                            const coords = lastSelectedCoords.current;
                            if (coords) {
                                console.log('🗺️ Navigating to saved coordinates:', coords);
                                navigateToPlace(
                                    coords.latitude,
                                    coords.longitude,
                                    coords.title
                                );
                            } else if (searchText && searchText.trim().length >= 2) {
                                // No coordinates from autocomplete - use Geocoding API fallback
                                console.log('🔄 No autocomplete selection, using Geocoding API for:', searchText);
                                searchWithGeocoding(searchText);
                            } else {
                                console.log('⚠️ No coordinates and search text too short');
                            }
                        },
                    }}
                    renderRightButton={() => (
                        <TouchableOpacity 
                            style={styles.searchIconContainer}
                            onPress={() => {
                                // Trigger search when icon is pressed
                                setForceHideSuggestions(true);
                                Keyboard.dismiss();
                                
                                const coords = lastSelectedCoords.current;
                                if (coords) {
                                    navigateToPlace(coords.latitude, coords.longitude, coords.title);
                                } else if (searchText && searchText.trim().length >= 2) {
                                    searchWithGeocoding(searchText);
                                }
                            }}
                        >
                            <Text style={styles.searchIcon}>🔍</Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* FILTER-LEISTE (ALLE 3 KLICKBAR, MULTI-SELECT) */}
            <View style={styles.categoriesRow}>
                {categories.slice(0, 3).map((category) => {
                    const isActive = activeFilters.includes(category.id);
                    // Use color from database with getCategoryColor helper
                    const color = getCategoryColor(category.id);
                    
                    // Display Arabic name if available, otherwise English
                    const displayName = category.name_ar || category.name_en || category.name;
                    
                    return (
                        <TouchableOpacity
                            key={category.id}
                            style={[
                                styles.categoryItem,
                                isActive && styles.categoryItemActive,
                            ]}
                            onPress={() => {
                                dismissSearchAndKeyboard();
                                toggleFilter(category.id);
                            }}
                        >
                            <Text
                                style={[
                                    styles.categoryText,
                                    isActive && styles.categoryTextActive,
                                ]}
                            >
                                {displayName}
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
                    initialRegion={mapRegion}
                    showsUserLocation={true}
                    showsMyLocationButton={true}
                    onPress={dismissSearchAndKeyboard}
                    onPanDrag={dismissSearchAndKeyboard}
                    onLongPress={handleMapLongPress}
                >
                    {/* Long Press Marker - Custom location for report */}
                    {longPressMarker && (
                        <Marker
                            coordinate={{
                                latitude: longPressMarker.latitude,
                                longitude: longPressMarker.longitude,
                            }}
                            title={language === 'ar' ? 'موقع البلاغ' : 'Report Location'}
                            pinColor="orange"
                            draggable
                            onDragEnd={(e) => {
                                const { latitude, longitude } = e.nativeEvent.coordinate;
                                setLongPressMarker({ latitude, longitude });
                                setReportLocation({ latitude, longitude });
                            }}
                        >
                            <View style={styles.longPressMarker}>
                                <Text style={{ fontSize: 28 }}>📌</Text>
                            </View>
                        </Marker>
                    )}
                    
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
                            
                            const categoryColor = getCategoryColor(report.category_id);
                            
                            return (
                                <Marker 
                                    key={`report-${report.id}`}
                                    coordinate={{
                                        latitude: lat,
                                        longitude: lng,
                                    }}
                                    title={report.title || categories.find(c => c.id === report.category_id)?.name || (language === 'ar' ? 'بلاغ' : 'Report')}
                                    description={report.description}
                                >
                                    <View style={[styles.marker, { backgroundColor: categoryColor }]}>
                                        <Text style={{ fontSize: 14, color: '#FFFFFF' }}>{getCategoryIcon(report.category_id)}</Text>
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
                    style={[
                        styles.fab,
                        // For Arabic (RTL), button on left. For English (LTR), button on right
                        language === 'ar' ? { left: 15 } : { right: 15, left: undefined }
                    ]}
                    onPress={toggleMenu}
                    onLayout={onFabLayout}
                >
                    <Text style={styles.fabPlus}>+</Text>
                </TouchableOpacity>
            </View>
            {/* SOUND BUTTON UNTER DEM + BUTTON */}
            <TouchableOpacity
                style={[
                    styles.soundButton,
                    // For Arabic (RTL), button on left. For English (LTR), button on right
                    language === 'ar' ? { left: 22 } : { right: 22, left: undefined }
                ]}
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
                                // For Arabic, use left positioning. For English, use right positioning
                                ...(language === 'ar' 
                                    ? { left: fabPos.x + item.offset.left }
                                    : { right: item.offset.right }
                                ),
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
                    {language === 'ar' ? `عدد البلاغات النشطة: ${visibleMarkers.length} / ${reports.length} 📘` : `Active Reports: ${visibleMarkers.length} / ${reports.length} 📘`}
                </Text>
            </View>
            
            {/* Long Press Hint - shows when marker is placed */}
            {longPressMarker && (
                <View style={styles.longPressHint}>
                    <Text style={styles.longPressHintText}>
                        {language === 'ar' 
                            ? '📌 تم تحديد الموقع - اضغط + لإضافة بلاغ' 
                            : '📌 Location set - tap + to add report'}
                    </Text>
                    <Pressable 
                        onPress={clearLongPressMarker}
                        style={styles.longPressHintClose}
                    >
                        <Text style={styles.longPressHintCloseText}>✕</Text>
                    </Pressable>
                </View>
            )}

            {/* MELDUNGS-DIALOG */}
            <ReportDialog
                visible={reportType !== null}
                type={reportType}
                address={
                    longPressMarker 
                        ? (language === 'ar' ? 'موقع مختار على الخريطة' : 'Selected map location')
                        : searchMarker?.title || (language === 'ar' ? 'الموقع التلقائي' : 'Auto Location')
                }
                onClose={() => {
                    setReportType(null);
                    // Don't clear long press marker on close - user might want to try again
                }}
                onSubmit={async (data) => {
                    try {
                        // Priority: Google Places > Long Press Marker > Search Marker > GPS
                        let locationToUse;
                        let locationSource = 'GPS';
                        
                        if (data.latitude && data.longitude) {
                            // User selected a place from Google Places in the dialog
                            locationToUse = {
                                latitude: data.latitude,
                                longitude: data.longitude,
                            };
                            locationSource = 'Google Places';
                            console.log('📍 Using Google Places coordinates from dialog:', locationToUse);
                        } else if (longPressMarker) {
                            // User long-pressed on map to select location
                            locationToUse = {
                                latitude: longPressMarker.latitude,
                                longitude: longPressMarker.longitude,
                            };
                            locationSource = 'Long Press';
                            console.log('📍 Using long press marker coordinates:', locationToUse);
                        } else {
                            // Fallback to reportLocation (search) or GPS
                            locationToUse = reportLocation || userLocation;
                            locationSource = reportLocation ? 'Search' : 'GPS';
                            console.log('📍 Using GPS/search coordinates:', locationToUse);
                        }
                        
                        if (!locationToUse) {
                            alert(language === 'ar' ? 'يرجى تفعيل تحديد الموقع أو البحث عن موقع' : 'Please enable location or search for a location');
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
                        let severityId = severityMap[data.severity] || 1;
                        
                        console.log(`📤 Creating report at ${locationSource}:`, { categoryId, severityId, location: locationToUse });
                        
                        // Upload photo if provided - AI will analyze it
                        let photoUrl: string | undefined = undefined;
                        let aiDescription: string | undefined = undefined;
                        if (data.photoUri) {
                            try {
                                console.log('📷 Uploading photo with AI analysis...');
                                const uploadResult = await reportingAPI.uploadImage(data.photoUri);
                                photoUrl = uploadResult.url;
                                console.log('✅ Photo uploaded:', photoUrl);
                                
                                // Use AI analysis if available
                                if (uploadResult.ai_analysis && uploadResult.ai_analysis.num_potholes > 0) {
                                    console.log('🤖 AI detected', uploadResult.ai_analysis.num_potholes, 'pothole(s)');
                                    
                                    // Use AI description based on language
                                    aiDescription = (language === 'ar' 
                                        ? uploadResult.ai_analysis.ai_description_ar 
                                        : uploadResult.ai_analysis.ai_description) || undefined;
                                    
                                    // Update severity based on AI if it detects higher severity
                                    if (uploadResult.ai_analysis.max_severity === 'HIGH') {
                                        severityId = 3;
                                    } else if (uploadResult.ai_analysis.max_severity === 'MEDIUM' && severityId < 2) {
                                        severityId = 2;
                                    }
                                }
                            } catch (uploadError) {
                                console.warn('⚠️ Photo upload failed, continuing without photo:', uploadError);
                                // Continue without photo if upload fails
                            }
                        }
                        
                        // Create report - use AI description if available
                        const finalDescription = aiDescription 
                            ? (data.notes ? `${data.notes}\n\n${aiDescription}` : aiDescription)
                            : (data.notes || (language === 'ar' ? 'بلاغ جديد' : 'New Report'));
                        
                        const newReport = await reportingAPI.createReport({
                            title: data.type === 'pothole' 
                                ? (language === 'ar' ? 'حفرة في الطريق' : 'Pothole on Road')
                                : data.type === 'accident'
                                ? (language === 'ar' ? 'حادث مروري' : 'Traffic Accident')
                                : (language === 'ar' ? 'كاشف سرعة' : 'Speed Camera'),
                            description: finalDescription,
                            category_id: categoryId,
                            latitude: locationToUse.latitude,
                            longitude: locationToUse.longitude,
                            address_text: data.address,
                            severity_id: severityId,
                            photo_urls: photoUrl,
                        });
                        
                        console.log('✅ Report created:', newReport.id);
                        
                        // Clear long press marker after successful submission
                        if (longPressMarker) {
                            setLongPressMarker(null);
                            console.log('🗑️ Long press marker cleared');
                        }
                        
                        // Refresh reports BEFORE closing dialog
                        await loadData(locationToUse);
                        
                        console.log('✅ Data reloaded, total reports:', reports.length);
                        
                        // Trigger app-wide refresh for profile and reports screens
                        reportCreated();
                        
                        // Also refresh user data to update points
                        await refreshUser();
                        
                        // Dialog will auto-close after showing success message
                        // The onClose() is called from ReportDialog.tsx after 1.5s
                    } catch (error) {
                        console.error('❌ Error creating report:', error);
                        alert(language === 'ar' ? '❌ حدث خطأ أثناء إرسال البلاغ' : '❌ Error submitting report');
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
    <Animated.View 
      style={[
        styles.audioSheetContainer,
        { transform: [{ translateY: audioSheetY }] }
      ]}
    >
      <BlurView intensity={55} tint="light" style={styles.audioSheet}>
        <View {...panResponder.panHandlers} style={styles.audioSheetHandleArea}>
          <View style={styles.audioSheetHandle} />
        </View>

      <Text style={styles.audioTitle}>{t('home.soundSettings')}</Text>

      {/* Lautstärke + Test */}
      <View style={styles.volumeSection}>
        <Text style={styles.audioLabel}>{t('home.volume')}</Text>

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
          <Text style={styles.testBtnText}>{t('home.testSound')}</Text>
        </TouchableOpacity>
      </View>

      {/* AUDIO MODES */}
<View style={styles.modeRow}>

    {/* حفرة - Yellow */}
    <TouchableOpacity
        style={[
            styles.modeBox,
            warnPothole && styles.modeBoxActive,
        ]}
        onPress={async () => {
            const newValue = !warnPothole;
            setWarnPothole(newValue);
            if (newValue && soundEnabled) {
                await speakWarning('pothole');
            }
        }}
    >
         <View style={[styles.modeIconCircle]}>
            <Ionicons name="alert-circle" size={26} color="#FFD700" />
        </View>
        <Text style={styles.modeText}>{t('home.pothole')}</Text>
    </TouchableOpacity>

    {/* حادث - Red */}
    <TouchableOpacity
        style={[
            styles.modeBox,
            warnAccident && styles.modeBoxActive,
        ]}
        onPress={async () => {
            const newValue = !warnAccident;
            setWarnAccident(newValue);
            if (newValue && soundEnabled) {
                await speakWarning('accident');
            }
        }}
    >
        <View style={[styles.modeIconCircle]}>
            <Ionicons name="warning" size={26} color="#FF0000" />
        </View>
        <Text style={styles.modeText}>{t('home.accident')}</Text>
    </TouchableOpacity>

    {/* كاشف السرعة - Green */}
    <TouchableOpacity
        style={[
            styles.modeBox,
            warnSpeed && styles.modeBoxActive,
        ]}
        onPress={async () => {
            const newValue = !warnSpeed;
            setWarnSpeed(newValue);
            if (newValue && soundEnabled) {
                await speakWarning('speed');
            }
        }}
    >
        <View style={[styles.modeIconCircle]}>
            <Ionicons name="speedometer" size={26} color="#00FF00" />
        </View>
        <Text style={styles.modeText}>{t('home.speedCamera')}</Text>
    </TouchableOpacity>

</View>



      {/* Close */}
      <TouchableOpacity
        style={styles.closeAudioBtn}
        onPress={() => setAudioVisible(false)}
      >
        <Text style={styles.closeAudioText}>{t('common.close')}</Text>
      </TouchableOpacity>
      </BlurView>
    </Animated.View>
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
    longPressMarker: {
        backgroundColor: "#FF9500",
        padding: 4,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: "#000",
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 6,
    },
    longPressHint: {
        position: 'absolute',
        bottom: 160,
        left: 16,
        right: 16,
        backgroundColor: 'rgba(255, 149, 0, 0.95)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 6,
    },
    longPressHintText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'Tajawal-Medium',
        flex: 1,
    },
    longPressHintClose: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    longPressHintCloseText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },

    mapContainer: {
        flex: 1,
        marginTop: 8,
        marginHorizontal: 8,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: "#123a7a",
    },
    marker: { 
        backgroundColor: "#fff", 
        padding: 6, 
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 4,
    },

    fab: {
        position: "absolute",
        bottom: 90,
        // left/right is set dynamically based on language
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
        // left/right is set dynamically based on language
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
    backgroundColor: "rgba(0, 0, 0, 0.4)",
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
    backgroundColor: "#ffffffff",
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
    backgroundColor: "rgba(0, 0, 0, 0.45)",
},

audioSheetContainer: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: "hidden",
},

audioSheet: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 90 : 85,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
},

audioSheetHandleArea: {
    paddingVertical: 10,
    marginHorizontal: -20,
    marginTop: -20,
    marginBottom: 10,
    alignItems: "center",
},

audioSheetHandle: {
    width: 45,
    height: 5,
    backgroundColor: "#000000",
    borderRadius: 3,
},

audioTitle: {
    color: "#000000",
    fontSize: 22,
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Tajawal-Bold",
},
volumeSection: {
  marginBottom: 22,
},

audioLabel: {
    color: "#000000",
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
    color: "#000000",
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
    height: 125,   
},

modeBoxActive: {
  borderColor: "#FFD166",
    shadowColor: "#FFD166",
    shadowOpacity: 0.45,
    backgroundColor: "#17498F",
},

modeText: {
    color: "#ffffffff",
    fontSize: 14,
    marginTop: 9,
    paddingTop: 4,
    fontFamily: "Tajawal-Medium",
    textAlign: "center",
},

closeAudioBtn: {
    backgroundColor: "#F4B400",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
},

closeAudioText: {
    color: "#000000",
    textAlign: "center",
    fontSize: 18,
    fontFamily: "Tajawal-Bold",
},
/* ===== VARIANTE 1 DESIGN ===== */

modeBoxV1: {
    width: "30%",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
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
