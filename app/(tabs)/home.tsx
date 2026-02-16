// app/(tabs)/home.tsx
import OnboardingTutorial, { shouldShowOnboarding } from "@/components/OnboardingTutorial";
import ReportDialog from "@/components/ReportDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useDataSync } from "@/contexts/DataSyncContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Category, lookupAPI, Report, reportingAPI, ReportStatus, RouteReport, Severity } from "@/services/api";
import locationMonitoringService from "@/services/location-monitoring";
import { getPendingReports, removePendingReport, subscribeToNetworkChanges } from "@/services/offline-reports";
import { cacheNearbyReports, getCachedNearbyReports, checkConnectivity } from "@/services/offline-service";
import { useOffline } from "@/contexts/OfflineContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
    Animated,
    Image,
    Keyboard,
    PanResponder,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from "react-native";
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import MapView, { Marker, Polyline, Region } from "react-native-maps";




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
    const { isOnline: networkOnline } = useOffline();
    
    /** ONBOARDING TUTORIAL */
    const [showOnboarding, setShowOnboarding] = useState(false);
    
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

    // ─── ROUTE WARNING STATE ────────────────────────────────────────────
    const [routeMode, setRouteMode] = useState(false);
    const [routeCoords, setRouteCoords] = useState<{latitude: number; longitude: number}[]>([]);
    const [routeHazards, setRouteHazards] = useState<RouteReport[]>([]);
    const [routeSummary, setRouteSummary] = useState<Record<number, number>>({});
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeDestination, setRouteDestination] = useState<string>('');
    // ────────────────────────────────────────────────────────────────────


const [audioVisible, setAudioVisible] = useState(false);
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
        checkOnboarding();
    }, []);
    
    // Check if onboarding should be shown
    const checkOnboarding = async () => {
        const shouldShow = await shouldShowOnboarding();
        if (shouldShow) {
            setShowOnboarding(true);
        }
    };
    
    // Handle onboarding completion
    const handleOnboardingComplete = () => {
        setShowOnboarding(false);
    };
    
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
    
    // Load backend data (with offline fallback)
    const loadData = async (location?: { latitude: number; longitude: number }) => {
        try {
            setLoading(true);
            
            // Check if online
            const online = await checkConnectivity();
            
            if (!online) {
                // Offline fallback: load cached data
                console.log('📴 Offline — loading cached reports');
                const cached = await getCachedNearbyReports();
                if (cached.length > 0) {
                    setReports(cached as any);
                    console.log(`📦 Loaded ${cached.length} cached reports`);
                }
                setLoading(false);
                return;
            }
            
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
            
            // Cache reports for offline use
            if (reportsData.length > 0) {
                cacheNearbyReports(reportsData.map((r: any) => ({
                    id: r.id,
                    title: r.title,
                    description: r.description,
                    category_id: r.category_id,
                    status_id: r.status_id,
                    severity: r.severity,
                    latitude: r.latitude,
                    longitude: r.longitude,
                    address: r.address,
                    photo_urls: r.photo_urls,
                    created_at: r.created_at,
                    confirmation_count: r.confirmation_count,
                    confirmation_status: r.confirmation_status,
                })));
            }
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
    
    // ─── MARKER CLUSTERING ─────────────────────────────────────────────
    const [currentRegion, setCurrentRegion] = useState<Region>(mapRegion);
    
    type ClusterItem = {
        type: 'cluster';
        id: string;
        latitude: number;
        longitude: number;
        count: number;
        reports: Report[];
        primaryCategoryId: number;
    };
    type SingleItem = {
        type: 'single';
        report: Report;
    };
    type MapItem = ClusterItem | SingleItem;
    
    const clusteredMarkers: MapItem[] = useMemo(() => {
        if (!visibleMarkers.length) return [];
        
        const delta = currentRegion.latitudeDelta;
        // Cluster radius ~ 8% of the visible area
        const clusterRadius = delta * 0.08;
        
        // If zoomed in close enough, show individual markers
        if (delta < 0.015) {
            return visibleMarkers.map(r => ({ type: 'single' as const, report: r }));
        }
        
        const used = new Set<number>();
        const items: MapItem[] = [];
        
        for (let i = 0; i < visibleMarkers.length; i++) {
            if (used.has(i)) continue;
            
            const r = visibleMarkers[i];
            const lat = Number.parseFloat(r.latitude.toString());
            const lng = Number.parseFloat(r.longitude.toString());
            if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
            
            const nearby: Report[] = [r];
            used.add(i);
            
            for (let j = i + 1; j < visibleMarkers.length; j++) {
                if (used.has(j)) continue;
                const other = visibleMarkers[j];
                const oLat = Number.parseFloat(other.latitude.toString());
                const oLng = Number.parseFloat(other.longitude.toString());
                if (Number.isNaN(oLat) || Number.isNaN(oLng)) continue;
                
                const dLat = Math.abs(lat - oLat);
                const dLng = Math.abs(lng - oLng);
                
                if (dLat < clusterRadius && dLng < clusterRadius) {
                    nearby.push(other);
                    used.add(j);
                }
            }
            
            if (nearby.length === 1) {
                items.push({ type: 'single', report: r });
            } else {
                // Calculate centroid & most common category
                let sumLat = 0, sumLng = 0;
                const catCounts: Record<number, number> = {};
                for (const nr of nearby) {
                    sumLat += Number.parseFloat(nr.latitude.toString());
                    sumLng += Number.parseFloat(nr.longitude.toString());
                    catCounts[nr.category_id] = (catCounts[nr.category_id] || 0) + 1;
                }
                const primaryCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
                items.push({
                    type: 'cluster',
                    id: `cluster-${i}`,
                    latitude: sumLat / nearby.length,
                    longitude: sumLng / nearby.length,
                    count: nearby.length,
                    reports: nearby,
                    primaryCategoryId: Number.parseInt(primaryCat[0], 10),
                });
            }
        }
        return items;
    }, [visibleMarkers, currentRegion.latitudeDelta]);
    
    // Zoom into cluster on tap
    const onClusterPress = useCallback((cluster: ClusterItem) => {
        if (!mapRef.current) return;
        // Find bounding box
        let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
        for (const r of cluster.reports) {
            const lat = Number.parseFloat(r.latitude.toString());
            const lng = Number.parseFloat(r.longitude.toString());
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
        }
        const padLat = (maxLat - minLat) * 0.3 || 0.005;
        const padLng = (maxLng - minLng) * 0.3 || 0.005;
        mapRef.current.animateToRegion({
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2,
            latitudeDelta: (maxLat - minLat) + padLat,
            longitudeDelta: (maxLng - minLng) + padLng,
        }, 500);
    }, []);
    // ─── END MARKER CLUSTERING ─────────────────────────────────────────
    
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

    // ─── ROUTE WARNING FUNCTIONS ────────────────────────────────────────
    const GOOGLE_API_KEY = 'REMOVED_API_KEY';

    const fetchRouteToDestination = async (destLat: number, destLng: number) => {
        if (!userLocation) return;
        setRouteLoading(true);
        try {
            // 1. Get directions from Google
            const origin = `${userLocation.latitude},${userLocation.longitude}`;
            const dest = `${destLat},${destLng}`;
            const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&key=${GOOGLE_API_KEY}&mode=driving`;
            
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.status !== 'OK' || !data.routes?.length) {
                console.warn('No route found');
                setRouteLoading(false);
                return;
            }
            
            // 2. Decode polyline
            const points = decodePolyline(data.routes[0].overview_polyline.points);
            setRouteCoords(points);
            
            // 3. Sample waypoints for the backend query (every ~500m, max 100 points)
            const sampled = sampleWaypoints(points, 100);
            
            // 4. Fetch hazards along route
            const routeData = await reportingAPI.getReportsAlongRoute(sampled, 200);
            setRouteHazards(routeData.reports);
            setRouteSummary(routeData.summary);
            
            // 5. Fit map to show entire route
            if (mapRef.current && points.length > 1) {
                mapRef.current.fitToCoordinates(points, {
                    edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
                    animated: true,
                });
            }
            
            // 6. Speak summary
            if (routeData.total_hazards > 0 && soundEnabled) {
                const msg = language === 'ar'
                    ? `تحذير: ${routeData.total_hazards} خطر على طريقك`
                    : `Warning: ${routeData.total_hazards} hazard${routeData.total_hazards > 1 ? 's' : ''} on your route`;
                Speech.speak(msg, { language: language === 'ar' ? 'ar-SA' : 'en-US' });
            }
        } catch (err) {
            console.error('Route error:', err);
        } finally {
            setRouteLoading(false);
        }
    };

    const clearRoute = () => {
        setRouteMode(false);
        setRouteCoords([]);
        setRouteHazards([]);
        setRouteSummary({});
        setRouteDestination('');
    };

    // Decode Google encoded polyline
    const decodePolyline = (encoded: string): {latitude: number; longitude: number}[] => {
        const points: {latitude: number; longitude: number}[] = [];
        let index = 0, lat = 0, lng = 0;

        while (index < encoded.length) {
            let shift = 0, result = 0, byte: number;
            do {
                byte = encoded.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            lat += (result & 1) ? ~(result >> 1) : (result >> 1);

            shift = 0; result = 0;
            do {
                byte = encoded.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            lng += (result & 1) ? ~(result >> 1) : (result >> 1);

            points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
        }
        return points;
    };

    // Sample waypoints evenly from a polyline
    const sampleWaypoints = (points: {latitude: number; longitude: number}[], maxPoints: number) => {
        if (points.length <= maxPoints) return points;
        const step = Math.ceil(points.length / maxPoints);
        const sampled: {latitude: number; longitude: number}[] = [];
        for (let i = 0; i < points.length; i += step) {
            sampled.push(points[i]);
        }
        // Always include last point
        if (sampled[sampled.length - 1] !== points[points.length - 1]) {
            sampled.push(points[points.length - 1]);
        }
        return sampled;
    };
    // ─── END ROUTE WARNING FUNCTIONS ────────────────────────────────────

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


    return (
        <View style={styles.root}>
            {/* ONBOARDING TUTORIAL */}
            {showOnboarding && (
                <OnboardingTutorial onComplete={handleOnboardingComplete} />
            )}
            
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

            {/* FILTER-LEISTE (ALLE KATEGORIEN, HORIZONTAL SCROLLBAR, MULTI-SELECT) */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesRow}
                style={styles.categoriesScroll}
            >
                {/* "All" button to reset filters */}
                <TouchableOpacity
                    style={[
                        styles.categoryItem,
                        activeFilters.length === 0 && styles.categoryItemActive,
                    ]}
                    onPress={() => {
                        dismissSearchAndKeyboard();
                        setActiveFilters([]);
                    }}
                >
                    <Text
                        style={[
                            styles.categoryText,
                            activeFilters.length === 0 && styles.categoryTextActive,
                        ]}
                    >
                        {language === 'ar' ? 'الكل' : 'All'}
                    </Text>
                </TouchableOpacity>

                {categories.map((category) => {
                    const isActive = activeFilters.includes(category.id);
                    const color = getCategoryColor(category.id);
                    
                    // Display name based on current language
                    const displayName = language === 'ar'
                        ? (category.name_ar || category.name)
                        : (category.name_en || category.name);
                    
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
                            <View
                                style={[
                                    styles.dot,
                                    { backgroundColor: color },
                                    isActive && styles.dotActive,
                                ]}
                            />
                            <Text
                                style={[
                                    styles.categoryText,
                                    isActive && styles.categoryTextActive,
                                ]}
                                numberOfLines={1}
                            >
                                {displayName}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

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
                    onRegionChangeComplete={(region: Region) => setCurrentRegion(region)}
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
                    
                    {/* Report Markers (Clustered) */}
                    {clusteredMarkers.map((item) => {
                        try {
                            if (item.type === 'cluster') {
                                const clusterColor = getCategoryColor(item.primaryCategoryId);
                                // Size scales with count (min 36, max 60)
                                const size = Math.min(60, 36 + Math.log2(item.count) * 6);
                                return (
                                    <Marker
                                        key={item.id}
                                        coordinate={{ latitude: item.latitude, longitude: item.longitude }}
                                        onPress={() => onClusterPress(item)}
                                        tracksViewChanges={false}
                                    >
                                        <View style={[styles.clusterMarker, { 
                                            backgroundColor: clusterColor, 
                                            width: size, 
                                            height: size, 
                                            borderRadius: size / 2 
                                        }]}>
                                            <Text style={styles.clusterText}>{item.count}</Text>
                                        </View>
                                    </Marker>
                                );
                            }

                            // Single marker
                            const report = item.report;
                            const lat = parseFloat(report.latitude.toString());
                            const lng = parseFloat(report.longitude.toString());
                            
                            if (isNaN(lat) || isNaN(lng)) {
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
                                    tracksViewChanges={false}
                                >
                                    <View style={[styles.marker, { backgroundColor: categoryColor }]}>
                                        <Text style={{ fontSize: 14, color: '#FFFFFF' }}>{getCategoryIcon(report.category_id)}</Text>
                                    </View>
                                </Marker>
                            );
                        } catch (error) {
                            console.error(`❌ Error rendering marker:`, error);
                            return null;
                        }
                    })}
                    
                    {/* Route Polyline */}
                    {routeCoords.length > 1 && (
                        <Polyline
                            coordinates={routeCoords}
                            strokeColor="#4A90D9"
                            strokeWidth={5}
                            lineDashPattern={[0]}
                        />
                    )}
                    
                    {/* Route Hazard Markers */}
                    {routeHazards.map((hazard) => (
                        <Marker
                            key={`hazard-${hazard.id}`}
                            coordinate={{ latitude: hazard.latitude, longitude: hazard.longitude }}
                            title={hazard.title || (language === 'ar' ? 'خطر' : 'Hazard')}
                            description={`${Math.round(hazard.distance_from_route_meters)}m ${language === 'ar' ? 'من الطريق' : 'from route'}`}
                            tracksViewChanges={false}
                        >
                            <View style={styles.routeHazardMarker}>
                                <Text style={{ fontSize: 18 }}>{getCategoryIcon(hazard.category_id)}</Text>
                            </View>
                        </Marker>
                    ))}
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

            {/* ROUTE WARNING BUTTON */}
            <TouchableOpacity
                style={[
                    styles.routeButton,
                    language === 'ar' ? { left: 22 } : { right: 22, left: undefined },
                    routeMode && styles.routeButtonActive,
                ]}
                onPress={() => {
                    if (routeMode) {
                        clearRoute();
                    } else {
                        setRouteMode(true);
                    }
                }}
            >
                <Ionicons name={routeMode ? "close" : "navigate"} size={22} color={routeMode ? "#fff" : "#0D2B66"} />
            </TouchableOpacity>

            {/* ROUTE DESTINATION INPUT */}
            {routeMode && routeCoords.length === 0 && (
                <View style={[styles.routeInputContainer, language === 'ar' ? { direction: 'rtl' } : {}]}>
                    <GooglePlacesAutocomplete
                        placeholder={language === 'ar' ? 'أدخل الوجهة...' : 'Enter destination...'}
                        onPress={(data, details = null) => {
                            if (details?.geometry?.location) {
                                setRouteDestination(data.description);
                                fetchRouteToDestination(
                                    details.geometry.location.lat,
                                    details.geometry.location.lng
                                );
                            }
                        }}
                        query={{
                            key: 'REMOVED_API_KEY',
                            language: language === 'ar' ? 'ar' : 'en',
                        }}
                        fetchDetails={true}
                        styles={{
                            container: { flex: 0 },
                            textInputContainer: {
                                backgroundColor: '#fff',
                                borderRadius: 12,
                                paddingHorizontal: 8,
                                height: 44,
                            },
                            textInput: {
                                backgroundColor: 'transparent',
                                color: '#0D2B66',
                                fontSize: 15,
                                textAlign: language === 'ar' ? 'right' : 'left',
                                height: 44,
                            },
                            listView: {
                                backgroundColor: '#fff',
                                borderRadius: 10,
                                marginTop: 4,
                            },
                            row: { backgroundColor: '#fff', paddingVertical: 12 },
                            description: { color: '#333', fontSize: 14 },
                        }}
                        enablePoweredByContainer={false}
                        textInputProps={{
                            placeholderTextColor: '#999',
                        }}
                    />
                    {routeLoading && (
                        <View style={styles.routeLoadingOverlay}>
                            <Text style={{ color: '#0D2B66', fontSize: 14 }}>
                                {language === 'ar' ? 'جاري تحميل المسار...' : 'Loading route...'}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* ROUTE HAZARD SUMMARY PANEL */}
            {routeMode && routeHazards.length > 0 && (
                <View style={[styles.routeSummaryPanel, language === 'ar' ? { direction: 'rtl' } : {}]}>
                    <View style={styles.routeSummaryHeader}>
                        <Ionicons name="warning" size={20} color="#F59E0B" />
                        <Text style={styles.routeSummaryTitle}>
                            {language === 'ar'
                                ? `${routeHazards.length} تحذير على الطريق`
                                : `${routeHazards.length} warning${routeHazards.length > 1 ? 's' : ''} on route`
                            }
                        </Text>
                        <TouchableOpacity onPress={clearRoute} style={{ marginLeft: 'auto' }}>
                            <Ionicons name="close-circle" size={22} color="#666" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                        {Object.entries(routeSummary).map(([catId, count]) => {
                            const catColor = getCategoryColor(Number(catId));
                            const catIcon = getCategoryIcon(Number(catId));
                            const catName = categories.find(c => c.id === Number(catId));
                            const displayName = language === 'ar' 
                                ? (catName?.name_ar || catName?.name || '') 
                                : (catName?.name_en || catName?.name || '');
                            return (
                                <View key={catId} style={[styles.routeSummaryCat, { backgroundColor: catColor + '20', borderColor: catColor }]}>
                                    <Text style={{ fontSize: 16 }}>{catIcon}</Text>
                                    <Text style={[styles.routeSummaryCatText, { color: catColor }]}>
                                        {count} {displayName}
                                    </Text>
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            )}


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
                        
                        // === DUPLICATE DETECTION ===
                        // Check for nearby similar reports before creating
                        try {
                            const dupCheck = await reportingAPI.checkDuplicates(
                                locationToUse.latitude,
                                locationToUse.longitude,
                                categoryId
                            );
                            
                            if (dupCheck.has_duplicates && dupCheck.nearby_reports.length > 0) {
                                const nearest = dupCheck.nearby_reports[0];
                                const distText = nearest.distance_meters < 1 
                                    ? (language === 'ar' ? 'أقل من 1 متر' : 'less than 1m')
                                    : `${Math.round(nearest.distance_meters)}m`;
                                
                                // Show confirmation dialog and wait for user decision
                                const userChoice = await new Promise<'confirm' | 'create' | 'cancel'>((resolve) => {
                                    Alert.alert(
                                        language === 'ar' ? '⚠️ بلاغ مشابه قريب' : '⚠️ Similar Report Nearby',
                                        language === 'ar' 
                                            ? `يوجد بلاغ مشابه على بعد ${distText}.\n\nهل تريد تأكيد البلاغ الموجود بدلاً من إنشاء بلاغ جديد؟`
                                            : `A similar report exists ${distText} away.\n\nWould you like to confirm the existing report instead of creating a new one?`,
                                        [
                                            { text: language === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel', onPress: () => resolve('cancel') },
                                            { text: language === 'ar' ? 'إنشاء جديد' : 'Create New', onPress: () => resolve('create') },
                                            { text: language === 'ar' ? '✓ تأكيد الموجود' : '✓ Confirm Existing', onPress: () => resolve('confirm') },
                                        ]
                                    );
                                });
                                
                                if (userChoice === 'cancel') {
                                    return; // User cancelled
                                }
                                
                                if (userChoice === 'confirm') {
                                    // Confirm existing report instead
                                    try {
                                        const confirmResult = await reportingAPI.confirmReport(
                                            nearest.id,
                                            { latitude: locationToUse.latitude, longitude: locationToUse.longitude }
                                        );
                                        
                                        Alert.alert(
                                            language === 'ar' ? '✅ تم التأكيد' : '✅ Confirmed',
                                            language === 'ar' 
                                                ? `تم تأكيد البلاغ #${nearest.id}. حصلت على ${confirmResult.points_awarded} نقاط!`
                                                : `Report #${nearest.id} confirmed! You earned ${confirmResult.points_awarded} points!`
                                        );
                                        
                                        await loadData(locationToUse);
                                        reportCreated();
                                        await refreshUser();
                                    } catch (confirmError: any) {
                                        const detail = confirmError?.response?.data?.detail || '';
                                        Alert.alert(
                                            language === 'ar' ? 'خطأ' : 'Error',
                                            detail || (language === 'ar' ? 'فشل تأكيد البلاغ' : 'Failed to confirm report')
                                        );
                                    }
                                    return;
                                }
                                // userChoice === 'create' — continue with creation
                                console.log('👤 User chose to create new report despite duplicate');
                            }
                        } catch (dupError) {
                            console.warn('⚠️ Duplicate check failed, proceeding with creation:', dupError);
                            // Continue with report creation even if duplicate check fails
                        }
                        
                        // Upload photo if provided - AI will analyze it
                        let photoUrl: string | undefined = undefined;
                        let aiDescription: string | undefined = undefined;
                        let aiAnnotatedUrl: string | undefined = undefined;
                        let aiDetections: string | undefined = undefined;
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
                                    
                                    // Get annotated image URL if available
                                    if (uploadResult.ai_analysis.annotated_url) {
                                        aiAnnotatedUrl = uploadResult.ai_analysis.annotated_url;
                                        console.log('🎨 AI annotated image:', aiAnnotatedUrl);
                                    }
                                    
                                    // Store detections as JSON string
                                    if (uploadResult.ai_analysis.detections && uploadResult.ai_analysis.detections.length > 0) {
                                        aiDetections = JSON.stringify(uploadResult.ai_analysis.detections);
                                        console.log('📦 AI detections stored:', uploadResult.ai_analysis.detections.length);
                                    }
                                    
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
                            ai_annotated_url: aiAnnotatedUrl,
                            ai_detections: aiDetections,
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
        top: 160,
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
    clusterMarker: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        elevation: 6,
    },
    clusterText: {
        color: '#FFFFFF',
        fontWeight: '800',
        fontSize: 14,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
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
    categoriesScroll: {
        width: "100%",
        marginTop: 9,
        maxHeight: 44,
    },
    categoriesRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        gap: 6,
    },

    categoryItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.15)",
    },

    categoryItemActive: {
        backgroundColor: "rgba(255,210,100,0.15)",
        borderColor: "#FFD166",
    },

    categoryText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontFamily: "Tajawal-Bold",
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
    routeButton: {
        position: "absolute",
        bottom: 630,
        width: 48,
        height: 48,
        backgroundColor: "#fff",
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        elevation: 6,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    routeButtonActive: {
        backgroundColor: "#EF4444",
    },
    routeInputContainer: {
        position: "absolute",
        top: 140,
        left: 16,
        right: 16,
        zIndex: 900,
    },
    routeLoadingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255,255,255,0.8)",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    routeSummaryPanel: {
        position: "absolute",
        bottom: 100,
        left: 12,
        right: 12,
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 14,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: -2 },
        shadowRadius: 8,
        elevation: 8,
        zIndex: 800,
    },
    routeSummaryHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    routeSummaryTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0D2B66",
    },
    routeSummaryCat: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
    },
    routeSummaryCatText: {
        fontSize: 13,
        fontWeight: "600",
    },
    routeHazardMarker: {
        backgroundColor: "#FFFFFF",
        padding: 4,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#EF4444",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 3,
        elevation: 4,
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
