// app/(tabs)/home.tsx
import DonationModal from "@/components/DonationModal";
import OnboardingTutorial, { shouldShowOnboarding } from "@/components/OnboardingTutorial";
import ReportDialog from "@/components/ReportDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useDataSync } from "@/contexts/DataSyncContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOffline } from "@/contexts/OfflineContext";
import { Category, lookupAPI, Report, reportingAPI, ReportStatus, RouteReport, Severity } from "@/services/api";
import { getBaseUrl } from "@/services/api-config";
import locationMonitoringService from "@/services/location-monitoring";
import { getPendingReports, removePendingReport, subscribeToNetworkChanges } from "@/services/offline-reports";
import { cacheNearbyReports, checkConnectivity, getCachedNearbyReports } from "@/services/offline-service";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
    Alert,
    Animated,
    Image,
    Keyboard,
    Linking,
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
import MapView, { Circle, Heatmap, Marker, Polyline, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";




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
    const insets = useSafeAreaInsets();

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

    // ─── SAFE ROUTE PLANNING STATE ─────────────────────────────────────
    interface RouteOption {
        coords: {latitude: number; longitude: number}[];
        distanceMeters: number;
        duration: string;
        hazards: RouteReport[];
        summary: Record<number, number>;
        totalHazards: number;
        potholeCount: number;
        safetyScore: number;
        label: { ar: string; ku: string; en: string };
        icon: string;
        color: string;
    }
    const [alternativeRoutes, setAlternativeRoutes] = useState<RouteOption[]>([]);
    const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
    // ────────────────────────────────────────────────────────────────────

    // ─── HEATMAP STATE ─────────────────────────────────────────────────
    const [heatmapEnabled, setHeatmapEnabled] = useState(false);
    // ────────────────────────────────────────────────────────────────────

    // ─── DONATION STATE ────────────────────────────────────────────────
    const [selectedReportForDonation, setSelectedReportForDonation] = useState<Report | null>(null);
    const [donationModalVisible, setDonationModalVisible] = useState(false);
    const [markerDetailVisible, setMarkerDetailVisible] = useState(false);
    const markerDetailSheetY = useRef(new Animated.Value(0)).current;

    // PanResponder for swipe-to-dismiss marker detail sheet
    const markerDetailPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 5;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    markerDetailSheetY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 80) {
                    // Swipe down threshold reached - close sheet
                    Animated.timing(markerDetailSheetY, {
                        toValue: 400,
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => {
                        setMarkerDetailVisible(false);
                        markerDetailSheetY.setValue(0);
                    });
                } else {
                    // Snap back
                    Animated.spring(markerDetailSheetY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;
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

    // ─── DRIVING MODE STATE ────────────────────────────────────────────
    const [drivingMode, setDrivingMode] = useState(false);
    const [drivingModeReporting, setDrivingModeReporting] = useState(false);
    const drivingModeCooldown = useRef(false);
    const drivingLocationSub = useRef<Location.LocationSubscription | null>(null);
    // ────────────────────────────────────────────────────────────────────

    // ─── DRIVING MODE LOCATION WATCHER ─────────────────────────────────
    useEffect(() => {
        let sub: Location.LocationSubscription | null = null;
        if (drivingMode) {
            (async () => {
                sub = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        distanceInterval: 10, // update every 10 meters
                        timeInterval: 3000,    // or every 3 seconds
                    },
                    (loc) => {
                        const coords = {
                            latitude: loc.coords.latitude,
                            longitude: loc.coords.longitude,
                        };
                        setUserLocation(coords);
                    }
                );
                drivingLocationSub.current = sub;
            })();
        }
        return () => {
            if (sub) sub.remove();
            if (drivingLocationSub.current) {
                drivingLocationSub.current.remove();
                drivingLocationSub.current = null;
            }
        };
    }, [drivingMode]);
    // ────────────────────────────────────────────────────────────────────

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
                            pothole: 1,
                            accident: 2,
                            environment: 3,
                        };

                        // Map severity
                        const severityMap: Record<string, Severity> = {
                            low: 'low',
                            medium: 'medium',
                            high: 'high',
                        };

                        await reportingAPI.createReport({
                            title: report.type === 'pothole' ? 'Pothole' :
                                report.type === 'accident' ? 'Accident' : 'Environmental Hazard',
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
                console.log('Offline — loading cached reports');
                const cached = await getCachedNearbyReports();
                if (cached.length > 0) {
                    setReports(cached as any);
                    console.log(`Loaded ${cached.length} cached reports`);
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

            // Normalize lat/lng to numbers (backend may return strings)
            const normalizedReports = reportsData.map((r: any) => ({
                ...r,
                latitude: typeof r.latitude === 'string' ? parseFloat(r.latitude) : r.latitude,
                longitude: typeof r.longitude === 'string' ? parseFloat(r.longitude) : r.longitude,
            })).filter((r: any) => !isNaN(r.latitude) && !isNaN(r.longitude));

            setReports(normalizedReports);
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
                    warnEnvironment: warnSpeed,
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
        "pothole" | "accident" | "environment" | null
    >(null);

    /** MULTI-FILTER */
    const [activeFilters, setActiveFilters] = useState<number[]>([]);

    // ─── REGION STATE + DEBOUNCED HANDLER ──────────────────────────────
    const [currentRegion, setCurrentRegion] = useState<Region>(mapRegion);
    const regionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleRegionChange = useCallback((region: Region) => {
        if (regionTimerRef.current) clearTimeout(regionTimerRef.current);
        regionTimerRef.current = setTimeout(() => {
            setCurrentRegion(region);
        }, 150); // 150ms debounce — keeps map smooth
    }, []);

    const toggleFilter = (categoryId: number) => {
        setActiveFilters((prev) =>
            prev.includes(categoryId)
                ? prev.filter((f) => f !== categoryId)
                : [...prev, categoryId]
        );
    };

    // ─── VIEWPORT FILTERING + CATEGORY FILTER ──────────────────────
    const visibleMarkers = useMemo(() => {
        // Step 1: Category filter
        let filtered = activeFilters.length === 0
            ? reports
            : reports.filter((r) => activeFilters.includes(r.category_id));

        // Step 2: Viewport filter — only process markers actually in/near the visible region
        // Add 20% padding so markers don't pop in at the edge
        const padLat = currentRegion.latitudeDelta * 0.2;
        const padLng = currentRegion.longitudeDelta * 0.2;
        const minLat = currentRegion.latitude - currentRegion.latitudeDelta / 2 - padLat;
        const maxLat = currentRegion.latitude + currentRegion.latitudeDelta / 2 + padLat;
        const minLng = currentRegion.longitude - currentRegion.longitudeDelta / 2 - padLng;
        const maxLng = currentRegion.longitude + currentRegion.longitudeDelta / 2 + padLng;

        filtered = filtered.filter((r) => {
            const lat = Number.parseFloat(r.latitude.toString());
            const lng = Number.parseFloat(r.longitude.toString());
            return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
        });

        return filtered;
    }, [reports, activeFilters, currentRegion]);

    // Debug logging (throttled)
    useEffect(() => {
        console.log(`📍 Total: ${reports.length} | Viewport: ${visibleMarkers.length} | Filters: ${activeFilters.length}`);
    }, [reports.length, visibleMarkers.length, activeFilters.length]);

    // ─── MARKER CLUSTERING ─────────────────────────────────────────────

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

    // ─── HEATMAP DATA POINTS ───────────────────────────────────────────
    const heatmapPoints = useMemo(() => {
        if (!heatmapEnabled || !reports.length) return [];
        return reports
            .map((r) => {
                const lat = parseFloat(r.latitude.toString());
                const lng = parseFloat(r.longitude.toString());
                if (isNaN(lat) || isNaN(lng)) return null;
                return { latitude: lat, longitude: lng, weight: 1 };
            })
            .filter(Boolean) as { latitude: number; longitude: number; weight: number }[];
    }, [heatmapEnabled, reports]);

    // iOS Circle-based heatmap: compute density color per point
    const iosHeatmapCircles = useMemo(() => {
        if (Platform.OS !== 'ios' || !heatmapEnabled || !heatmapPoints.length) return [];
        // Count nearby points for each location to determine density
        return heatmapPoints.map((point, index) => {
            let nearby = 0;
            for (const other of heatmapPoints) {
                const dLat = point.latitude - other.latitude;
                const dLng = point.longitude - other.longitude;
                // ~500m radius check
                if (dLat * dLat + dLng * dLng < 0.00002) nearby++;
            }
            // Map density to color: green(1) → yellow(2-3) → orange(4-6) → red(7+)
            let fillColor: string;
            if (nearby >= 7) fillColor = 'rgba(255, 0, 0, 0.25)';
            else if (nearby >= 4) fillColor = 'rgba(255, 140, 0, 0.22)';
            else if (nearby >= 2) fillColor = 'rgba(255, 255, 0, 0.20)';
            else fillColor = 'rgba(0, 255, 0, 0.18)';
            return { ...point, fillColor, key: `heatcircle-${index}` };
        });
    }, [heatmapEnabled, heatmapPoints]);
    // ─── END HEATMAP DATA ──────────────────────────────────────────────

    // Helper functions
    const getCategoryByName = (name: string): Category | undefined => {
        return categories.find(c => c.name === name);
    };

    const isPotholeCategory = (categoryId: number): boolean => {
        const category = categories.find(c => c.id === categoryId);
        if (!category) return false;
        const name = category.name_ar || category.name_en || category.name_ku || category.name || "";
        return name.includes("حفرة") || name.includes("Çalêk") || name.toLowerCase().includes("pothole");
    };

    const getCategoryIcon = (categoryId: number): string => {
        const category = categories.find(c => c.id === categoryId);
        if (!category) return "📍";

        const name = category.name_ar || category.name_en || category.name_ku ||  category.name || "";

        if (name.includes("حفرة") || name.includes("Çalêk") || name.toLowerCase().includes("pothole")) return "⚠️";
        if (name.includes("حادث") || name.includes("Qezay") || name.toLowerCase().includes("accident")) return "🚨";
        if (name.includes("كاشف") || name.includes("Kashif") || name.includes("سرعة") || name.includes("Lez") || name.toLowerCase().includes("speed")) return "📷";
        if (name.includes("بيئة") || name.includes("Jîngeh") || name.toLowerCase().includes("environment")) return "🌿";
        return "📍";
    };

    // Get category color for markers
    const getCategoryColor = (categoryId: number): string => {
        const category = categories.find(c => c.id === categoryId);
        if (category?.color) return category.color;

        // Fallback colors based on category name
        const name = category?.name_ar || category?.name_en || category?.name_ku ||category?.name || "";
        if(name.includes("كاشف") || name.includes("Kashif") || name.includes("سرعة") || name.toLowerCase().includes("speed") || name.toLowerCase().includes("radar") || name.toLowerCase().includes("Radarê ")|| name.toLowerCase().includes("leza")) return "#22C55E"; // Green
        if (name.includes("حادث") || name.toLowerCase().includes("accident") || name.toLowerCase().includes("qezay")) return "#EF4444"; // Red
        if (name.includes("حفرة") || name.toLowerCase().includes("pothole") || name.toLowerCase().includes("Çalêk ")) return "#F59E0B"; // Amber
        if (name.includes("بيئ") || name.includes("Jîngeh") || name.toLowerCase().includes("environment")) return "#10B981"; // Emerald green for environment
        return "#3B82F6"; // Default blue
    };

    // Navigate to selected place and automatically start route
    const navigateToPlace = (latitude: number, longitude: number, title: string) => {
        console.log('🧭 Navigating to place:', { latitude, longitude, title });

        // Clear any existing route first
        if (routeCoords.length > 0) {
            clearRoute();
        }

        const newRegion = {
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };

        setSearchMarker({ latitude, longitude, title });
        setReportLocation({ latitude, longitude }); // Use search location for reports
        setMapRegion(newRegion); // Update map region state

        console.log('✅ Search marker set:', { latitude, longitude, title });
        console.log('✅ Report location updated to search location');

        // Animate map to location
        if (mapRef.current) {
            try {
                mapRef.current.animateToRegion(newRegion, 1000);
                console.log('✅ Map animated successfully');
            } catch (error) {
                console.error('❌ Animation error:', error);
            }
        }

        Keyboard.dismiss();

        // Automatically start route to the selected destination
        setRouteMode(true);
        setRouteDestination(title);
        fetchRouteToDestination(latitude, longitude);
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

    // ─── DRIVING MODE: ONE-TAP POTHOLE REPORT ──────────────────────────
    const handleDrivingModeReport = async () => {
        if (drivingModeReporting || drivingModeCooldown.current) return;
        if (!userLocation) {
            Alert.alert(
                language === 'ar' ? 'خطأ' : language === 'ku' ? 'Şaşî' : 'Error',
                language === 'ar' ? 'يرجى تفعيل تحديد الموقع' : language === 'ku' ? 'Ji kerema xwe cîhê xwe çalak bike' : 'Please enable location'
            );
            return;
        }

        setDrivingModeReporting(true);
        drivingModeCooldown.current = true;

        // Haptic feedback
        try {
            const Haptics = require('expo-haptics');
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (e) {}

        try {
            // Always get fresh GPS position for each report
            let reportLat = userLocation.latitude;
            let reportLng = userLocation.longitude;
            try {
                const freshLoc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                reportLat = freshLoc.coords.latitude;
                reportLng = freshLoc.coords.longitude;
                // Update state so map also reflects new position
                setUserLocation({ latitude: reportLat, longitude: reportLng });
            } catch (locErr) {
                console.warn('⚠️ Could not get fresh GPS, using last known:', locErr);
            }

            const categoryId = getCategoryByName('حفرة')?.id || getCategoryByName('çalak')?.id || 1;

            const newReport = await reportingAPI.createReport({
                title: language === 'ar' ? 'حفرة في الطريق' : language === 'ku' ? 'Çalêk li ser rê' : 'Pothole on Road',
                description: language === 'ar' ? 'بلاغ سريع من وضع القيادة' : language === 'ku' ? 'Rapora bilez ji moda ajotinê' : 'Quick report from driving mode',
                category_id: categoryId,
                latitude: reportLat,
                longitude: reportLng,
                severity_id: 2, // Medium severity by default
            });

            console.log('🚗 Driving mode report created:', newReport.id);

            // Voice confirmation
            if (soundEnabled) {
                const msg = language === 'ar'
                    ? 'تم تسجيل الحفرة بنجاح'
                    : language === 'ku'
                    ? 'Çal bi serkeftî hat tomarkirin'
                    : 'Pothole reported successfully';
                Speech.speak(msg, { language: language === 'ar' ? 'ar-SA' : language === 'ku' ? 'ku-TR' : 'en-US' });
            }

            // Refresh data
            await loadData(userLocation);
            reportCreated();
            await refreshUser();
        } catch (err) {
            console.error('Driving mode report failed:', err);
            Alert.alert(
                language === 'ar' ? 'خطأ' : language === 'ku' ? 'Şaşî' : 'Error',
                language === 'ar' ? 'فشل إرسال البلاغ' : language === 'ku' ? 'Şandina raporê têkçûn' : 'Failed to submit report'
            );
        } finally {
            setDrivingModeReporting(false);
            // 3-second cooldown to prevent double-taps
            setTimeout(() => { drivingModeCooldown.current = false; }, 3000);
        }
    };
    // ────────────────────────────────────────────────────────────────────

    // ─── ROUTE WARNING FUNCTIONS ────────────────────────────────────────
    const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBRM_T7GtQ8JROceC_Gm0qRVjgxNh2Fxr4';

    const fetchRouteToDestination = async (destLat: number, destLng: number) => {
        if (!userLocation) {
            Alert.alert(
                language === 'ar' ? 'خطأ' : language === 'ku' ? 'Şaşî' : 'Error',
                language === 'ar' ? 'يرجى تفعيل تحديد الموقع أولاً' : language === 'ku' ? 'Ji kerema xwe berê cîhê xwe çalak bike' : 'Please enable location first'
            );
            setRouteMode(false);
            return;
        }
        if (!GOOGLE_API_KEY) {
            console.error('Google API key is missing');
            setRouteMode(false);
            return;
        }
        setRouteLoading(true);
        try {
            // ─── OSRM Routing (works worldwide including Syria/Iraq/Middle East) ───
            // OSRM uses OpenStreetMap data = excellent coverage for Syria
            let allRoutePoints: {coords: {latitude: number; longitude: number}[]; distanceMeters: number; duration: string; description: string}[] = [];

            // 1. Try OSRM first (free, real road-following routes, alternatives supported)
            try {
                const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${userLocation.longitude},${userLocation.latitude};${destLng},${destLat}?overview=full&geometries=polyline&alternatives=true&steps=false`;
                console.log('Fetching routes from OSRM...');
                const osrmRes = await fetch(osrmUrl);
                const osrmData = await osrmRes.json();

                if (osrmData.code === 'Ok' && osrmData.routes?.length > 0) {
                    console.log(`OSRM returned ${osrmData.routes.length} route(s)`);
                    allRoutePoints = osrmData.routes.map((route: any) => ({
                        coords: decodePolyline(route.geometry),
                        distanceMeters: route.distance || 0,
                        duration: `${Math.round(route.duration)}s`,
                        description: route.legs?.[0]?.summary || '',
                    }));

                    // If OSRM returned only 1 route, generate synthetic alternatives
                    // by routing via perpendicular offset waypoints (forces different streets)
                    if (allRoutePoints.length < 2) {
                        console.log('Generating synthetic alternatives via offset waypoints...');
                        const startLat = userLocation.latitude;
                        const startLng = userLocation.longitude;
                        const midLat = (startLat + destLat) / 2;
                        const midLng = (startLng + destLng) / 2;
                        const dLat = destLat - startLat;
                        const dLng = destLng - startLng;
                        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
                        if (dist > 0.001) { // Only if meaningful distance (>~100m)
                            const perpLat = -dLng / dist;
                            const perpLng = dLat / dist;
                            // Offset ~800m perpendicular to the route direction
                            const offset = Math.min(0.008, dist * 0.3);
                            const offsets = [
                                { lat: midLat + perpLat * offset, lng: midLng + perpLng * offset },
                                { lat: midLat - perpLat * offset, lng: midLng - perpLng * offset },
                            ];

                            const viaPromises = offsets.map(async (wp) => {
                                try {
                                    const viaUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${wp.lng},${wp.lat};${destLng},${destLat}?overview=full&geometries=polyline&steps=false`;
                                    const viaRes = await fetch(viaUrl);
                                    const viaData = await viaRes.json();
                                    if (viaData.code === 'Ok' && viaData.routes?.[0]) {
                                        const r = viaData.routes[0];
                                        return {
                                            coords: decodePolyline(r.geometry),
                                            distanceMeters: r.distance || 0,
                                            duration: `${Math.round(r.duration)}s`,
                                            description: 'via alternative',
                                        };
                                    }
                                } catch (e) {
                                    console.warn('Via-waypoint route failed:', e);
                                }
                                return null;
                            });

                            const viaResults = await Promise.all(viaPromises);

                            // Add via-routes that are meaningfully different from the primary route
                            const primaryDist = allRoutePoints[0].distanceMeters;
                            for (const vr of viaResults) {
                                if (vr && vr.coords.length > 2) {
                                    // Only add if route differs by at least 10% in distance
                                    const distDiff = Math.abs(vr.distanceMeters - primaryDist) / primaryDist;
                                    if (distDiff > 0.1) {
                                        allRoutePoints.push(vr);
                                    }
                                }
                            }
                            console.log(`After synthetic alternatives: ${allRoutePoints.length} total route(s)`);
                        }
                    }
                }
            } catch (osrmErr) {
                console.warn('OSRM failed:', osrmErr);
            }

            // 2. If OSRM failed or returned nothing, try Google Directions API
            if (allRoutePoints.length === 0) {
                console.log('OSRM returned no routes, trying Google Directions API...');
                try {
                    const dirUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${userLocation.latitude},${userLocation.longitude}&destination=${destLat},${destLng}&alternatives=true&mode=driving&key=${GOOGLE_API_KEY}`;
                    const dirRes = await fetch(dirUrl);
                    const dirData = await dirRes.json();
                    if (dirData.status === 'OK' && dirData.routes?.length > 0) {
                        console.log(`Google Directions API returned ${dirData.routes.length} route(s)`);
                        allRoutePoints = dirData.routes.map((route: any) => {
                            const coords = decodePolyline(route.overview_polyline.points);
                            const leg = route.legs?.[0];
                            return {
                                coords,
                                distanceMeters: leg?.distance?.value || 0,
                                duration: leg?.duration?.value ? `${leg.duration.value}s` : '',
                                description: route.summary || '',
                            };
                        });
                    }
                } catch (dirErr) {
                    console.warn('Google Directions API also failed:', dirErr);
                }
            }

            // 3. If still no routes, try Google Routes API v2
            if (allRoutePoints.length === 0) {
                console.log('Trying Google Routes API v2...');
                try {
                    const routesUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
                    const requestBody = {
                        origin: { location: { latLng: { latitude: userLocation.latitude, longitude: userLocation.longitude } } },
                        destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
                        travelMode: 'DRIVE',
                        computeAlternativeRoutes: true,
                    };
                    const res = await fetch(routesUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Goog-Api-Key': GOOGLE_API_KEY,
                            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description',
                        },
                        body: JSON.stringify(requestBody),
                    });
                    const data = await res.json();
                    if (res.ok && data.routes?.length > 0) {
                        console.log(`Google Routes API v2 returned ${data.routes.length} route(s)`);
                        allRoutePoints = data.routes.map((route: any) => ({
                            coords: decodePolyline(route.polyline.encodedPolyline),
                            distanceMeters: route.distanceMeters || 0,
                            duration: route.duration || '',
                            description: route.description || '',
                        }));
                    }
                } catch (v2Err) {
                    console.warn('Google Routes API v2 also failed:', v2Err);
                }
            }

            // 4. Last resort: show direct line
            if (allRoutePoints.length === 0) {
                console.warn('All routing APIs failed, showing direct line');
                const directLine = [
                    { latitude: userLocation.latitude, longitude: userLocation.longitude },
                    { latitude: destLat, longitude: destLng },
                ];
                setRouteCoords(directLine);
                if (mapRef.current) {
                    mapRef.current.fitToCoordinates(directLine, {
                        edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
                        animated: true,
                    });
                }
                setRouteLoading(false);
                return;
            }

            console.log(`Processing ${allRoutePoints.length} route(s)`);

            // Set first route as default display
            const firstRouteCoords = allRoutePoints[0].coords;
            setRouteCoords(firstRouteCoords);

            // 3. Fit map to show all routes
            const allCoordsCombined = allRoutePoints.flatMap((r: any) => r.coords);
            if (mapRef.current && allCoordsCombined.length > 1) {
                mapRef.current.fitToCoordinates(allCoordsCombined, {
                    edgePadding: { top: 80, right: 40, bottom: 280, left: 40 },
                    animated: true,
                });
            }

            // 4. Fetch hazards for ALL routes in parallel
            const ROUTE_COLORS = ['#4A90D9', '#F59E0B', '#22C55E'];
            const hazardPromises = allRoutePoints.map((rp: any) => {
                const sampled = sampleWaypoints(rp.coords, 100);
                return reportingAPI.getReportsAlongRoute(sampled, 200).catch(() => ({
                    total_hazards: 0,
                    reports: [] as RouteReport[],
                    summary: {} as Record<number, number>,
                }));
            });

            const hazardResults = await Promise.all(hazardPromises);

            // 5. Build RouteOption[] with safety scores
            const routeOptions: RouteOption[] = allRoutePoints.map((rp: any, idx: number) => {
                const hazardData = hazardResults[idx];
                const potholeCount = hazardData.reports.filter((h: RouteReport) => isPotholeCategory(h.category_id)).length;
                // Safety score: 100 = safest, 0 = most dangerous
                // Formula: penalize per hazard (-5), per pothole (-8 extra), bonus for short distance
                const hazardPenalty = hazardData.total_hazards * 5;
                const potholePenalty = potholeCount * 8;
                const safetyScore = Math.max(0, Math.min(100, 100 - hazardPenalty - potholePenalty));

                return {
                    coords: rp.coords,
                    distanceMeters: rp.distanceMeters,
                    duration: rp.duration,
                    hazards: hazardData.reports,
                    summary: hazardData.summary,
                    totalHazards: hazardData.total_hazards,
                    potholeCount,
                    safetyScore,
                    label: { ar: '', ku: '', en: '' }, // Will be assigned below
                    icon: '',
                    color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
                };
            });

            // 6. Label routes based on characteristics
            if (routeOptions.length === 1) {
                routeOptions[0].label = { ar: 'المسار', ku: 'Rê', en: 'Route' };
                routeOptions[0].icon = '🛣️';
            } else {
                // First route = fastest (Google default)
                routeOptions[0].label = { ar: 'أسرع طريق', ku: 'Rêya herî bilez', en: 'Fastest Route' };
                routeOptions[0].icon = '⚡';
                routeOptions[0].color = '#4A90D9';

                // Find safest route (highest safety score, excluding first)
                let safestIdx = 1;
                let fewestPotholesIdx = 1;
                for (let i = 1; i < routeOptions.length; i++) {
                    if (routeOptions[i].safetyScore > routeOptions[safestIdx].safetyScore) safestIdx = i;
                    if (routeOptions[i].potholeCount < routeOptions[fewestPotholesIdx].potholeCount) fewestPotholesIdx = i;
                }

                // If safest and fewest potholes are same route
                if (safestIdx === fewestPotholesIdx) {
                    routeOptions[safestIdx].label = { ar: '⚠️ طريق آمن أكثر', ku: '⚠️ Rêya ewletir', en: '⚠️ Safer Route' };
                    routeOptions[safestIdx].icon = '🛡️';
                    routeOptions[safestIdx].color = '#22C55E';
                    // Label remaining routes
                    for (let i = 1; i < routeOptions.length; i++) {
                        if (i !== safestIdx) {
                            routeOptions[i].label = { ar: 'طريق بديل', ku: 'Rêya alternatîf', en: 'Alternative' };
                            routeOptions[i].icon = '🔄';
                            routeOptions[i].color = '#F59E0B';
                        }
                    }
                } else {
                    routeOptions[safestIdx].label = { ar: '⚠️ طريق آمن أكثر', ku: '⚠️ Rêya ewletir', en: '⚠️ Safer Route' };
                    routeOptions[safestIdx].icon = '🛡️';
                    routeOptions[safestIdx].color = '#22C55E';
                    routeOptions[fewestPotholesIdx].label = { ar: '🚗 أقل حفر', ku: '🚗 Kêmtir çal', en: '🚗 Fewer Potholes' };
                    routeOptions[fewestPotholesIdx].icon = '🚗';
                    routeOptions[fewestPotholesIdx].color = '#F59E0B';
                    // Label any remaining
                    for (let i = 1; i < routeOptions.length; i++) {
                        if (i !== safestIdx && i !== fewestPotholesIdx) {
                            routeOptions[i].label = { ar: 'طريق بديل', ku: 'Rêya alternatîf', en: 'Alternative' };
                            routeOptions[i].icon = '🔄';
                            routeOptions[i].color = '#9CA3AF';
                        }
                    }
                }

                // Check if first route is actually also the safest
                if (routeOptions[0].safetyScore >= routeOptions[safestIdx].safetyScore) {
                    routeOptions[0].label = { ar: '⚡ أسرع وأكثر أماناً', ku: '⚡ Herî bilez û ewle', en: '⚡ Fastest & Safest' };
                    routeOptions[0].icon = '⭐';
                    routeOptions[0].color = '#22C55E';
                }
            }

            setAlternativeRoutes(routeOptions);
            setSelectedRouteIndex(0);

            // Set the first route's hazards as active display
            setRouteHazards(routeOptions[0].hazards);
            setRouteSummary(routeOptions[0].summary);

            console.log(`Safe Route Planning: ${routeOptions.length} routes analyzed`);
            routeOptions.forEach((ro, i) => {
                console.log(`  Route ${i}: ${ro.label.en} | Hazards: ${ro.totalHazards} | Potholes: ${ro.potholeCount} | Safety: ${ro.safetyScore}`);
            });

            // 7. Speak summary for selected route
            const selectedRoute = routeOptions[0];
            if (selectedRoute.totalHazards > 0 && soundEnabled) {
                const altCount = routeOptions.length - 1;
                if (language === 'ku') {
                    try {
                        const { sound: kuRouteSound } = await Audio.Sound.createAsync(
                            require('@/assets/sounds/ku/warning_route.mp3'),
                            { shouldPlay: true, volume: appVolume }
                        );
                        kuRouteSound.setOnPlaybackStatusUpdate((s) => {
                            if (s.isLoaded && s.didJustFinish) kuRouteSound.unloadAsync();
                        });
                    } catch (kuErr) {
                        console.warn('Kurdish route audio failed:', kuErr);
                        const msg = `Hişyarî: ${selectedRoute.totalHazards} xeter li ser rêya te heye`;
                        Speech.speak(msg, { language: 'ku-TR' });
                    }
                } else {
                    const msg = language === 'ar'
                        ? `تحذير: ${selectedRoute.totalHazards} خطر على طريقك${altCount > 0 ? `. يوجد ${altCount} طريق بديل أكثر أماناً` : ''}`
                        : `Warning: ${selectedRoute.totalHazards} hazard${selectedRoute.totalHazards > 1 ? 's' : ''} on your route${altCount > 0 ? `. ${altCount} safer alternative${altCount > 1 ? 's' : ''} available` : ''}`;
                    Speech.speak(msg, { language: language === 'ar' ? 'ar-SA' : 'en-US' });
                }
            }
        } catch (err) {
            console.error('Route error:', err);
            // Fallback: show direct line
            if (userLocation) {
                const directLine = [
                    { latitude: userLocation.latitude, longitude: userLocation.longitude },
                    { latitude: destLat, longitude: destLng },
                ];
                setRouteCoords(directLine);
                if (mapRef.current) {
                    mapRef.current.fitToCoordinates(directLine, {
                        edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
                        animated: true,
                    });
                }
            }
        } finally {
            setRouteLoading(false);
        }
    };

    // Select a different route option
    const selectRoute = (index: number) => {
        if (index < 0 || index >= alternativeRoutes.length) return;
        setSelectedRouteIndex(index);
        const selected = alternativeRoutes[index];
        setRouteCoords(selected.coords);
        setRouteHazards(selected.hazards);
        setRouteSummary(selected.summary);

        // Fit map to the selected route
        if (mapRef.current && selected.coords.length > 1) {
            mapRef.current.fitToCoordinates(selected.coords, {
                edgePadding: { top: 80, right: 40, bottom: 280, left: 40 },
                animated: true,
            });
        }
    };

    const clearRoute = () => {
        setRouteMode(false);
        setRouteCoords([]);
        setRouteHazards([]);
        setRouteSummary({});
        setRouteDestination('');
        setSearchMarker(null);
        setAlternativeRoutes([]);
        setSelectedRouteIndex(0);
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
            const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBRM_T7GtQ8JROceC_Gm0qRVjgxNh2Fxr4';
            // Add Syria bias to the search
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&language=${language}`;

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
            Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
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
            case "environment":
                if (warnSpeed) {
                    message = t('home.warnEnvironment') || (language === 'ar' ? 'تحذير! خطر بيئي قريب' : language === 'ku' ? 'Hişyarî! Metirsiya jîngehî li pêş te ye' : 'Warning! Environmental hazard ahead');
                    shouldSpeak = true;
                }
                break;
            default:
                message = language === 'ar' ? 'تحذير!' : language === 'ku' ? 'Hişyariyê!' : 'Warning!';
                shouldSpeak = true;
        }

        if (shouldSpeak) {
            if (language === 'ku') {
                // Play pre-generated Kurdish audio file
                try {
                    const kuAudioMap: Record<string, any> = {
                        'pothole': require('@/assets/sounds/ku/warn_pothole_short.mp3'),
                        'accident': require('@/assets/sounds/ku/warn_accident_short.mp3'),
                        'environment': require('@/assets/sounds/ku/warn_speed_short.mp3'),
                    };
                    const kuFile = kuAudioMap[type] || require('@/assets/sounds/ku/warning_generic.mp3');
                    const { sound: kuWarnSound } = await Audio.Sound.createAsync(
                        kuFile,
                        { shouldPlay: true, volume: appVolume }
                    );
                    kuWarnSound.setOnPlaybackStatusUpdate((s) => {
                        if (s.isLoaded && s.didJustFinish) kuWarnSound.unloadAsync();
                    });
                } catch (kuErr) {
                    console.warn('Kurdish warning audio failed, falling back to Kurdish TTS:', kuErr);

                    // 🔹 Kurmancî TTS fallback
                    const kuMessage =
                        type === 'pothole'
                            ? 'Hişyarî, çala li pêş te ye!'
                            : type === 'accident'
                                ? 'Hişyarî, qezayek li pêş te heye!'
                                : type === 'environment'
                                    ? 'Hişyarî, metirsiya jîngehî li pêş te ye!'
                                    : 'Hişyarî!';

                    await Speech.speak(kuMessage, {
                        language: 'ku-SY',
                        rate: 0.9,
                        pitch: 1,
                        volume: appVolume,
                    });
                }
            } else {
                const ttsLang = language === 'ar' ? 'ar-SA' : 'en-US';
                await Speech.speak(message, {
                    language: ttsLang,
                    rate: 0.9,
                    pitch: 1,
                    volume: appVolume,
                });
            }
        }
    }


    return (
        <View style={styles.root}>
            {/* ONBOARDING TUTORIAL */}
            {showOnboarding && (
                <OnboardingTutorial onComplete={handleOnboardingComplete} />
            )}

            {/* MAP – fullscreen background */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFill}
                    initialRegion={mapRegion}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                    onPress={dismissSearchAndKeyboard}
                    onPanDrag={dismissSearchAndKeyboard}
                    onLongPress={handleMapLongPress}
                    onRegionChangeComplete={handleRegionChange}
                >
                    {/* Long Press Marker - Custom location for report */}
                    {longPressMarker && (
                        <Marker
                            coordinate={{
                                latitude: longPressMarker.latitude,
                                longitude: longPressMarker.longitude,
                            }}
                            title={language === 'ar' ? 'موقع البلاغ' : language === 'ku' ? 'Cihê raporê' : 'Report Location'}
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
                            title={language === 'ar' ? 'موقعك' : language === 'ku' ? 'Cihê te' : 'Your Location'}
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
                                    onPress={() => {
                                        setSelectedReportForDonation(report);
                                        setMarkerDetailVisible(true);
                                    }}
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

                    {/* Alternative Route Polylines (dimmed, behind selected) */}
                    {alternativeRoutes.map((route, idx) => {
                        if (idx === selectedRouteIndex) return null;
                        if (route.coords.length < 2) return null;
                        return (
                            <Polyline
                                key={`alt-route-${idx}`}
                                coordinates={route.coords}
                                strokeColor={route.color + '60'}
                                strokeWidth={4}
                                lineDashPattern={[10, 6]}
                                tappable={true}
                                onPress={() => selectRoute(idx)}
                            />
                        );
                    })}

                    {/* Selected Route Polyline */}
                    {routeCoords.length > 1 && (
                        <Polyline
                            coordinates={routeCoords}
                            strokeColor={alternativeRoutes[selectedRouteIndex]?.color || "#4A90D9"}
                            strokeWidth={6}
                            lineDashPattern={[0]}
                        />
                    )}

                    {/* Route Hazard Markers */}
                    {routeHazards.map((hazard) => {
                        const hLat = typeof hazard.latitude === 'string' ? parseFloat(hazard.latitude) : hazard.latitude;
                        const hLng = typeof hazard.longitude === 'string' ? parseFloat(hazard.longitude) : hazard.longitude;
                        if (isNaN(hLat) || isNaN(hLng)) return null;
                        return (
                            <Marker
                                key={`hazard-${hazard.id}`}
                                coordinate={{ latitude: hLat, longitude: hLng }}
                                title={hazard.title || (language === 'ar' ? 'خطر' : language === 'ku' ? 'Metirsi' : 'Hazard')}
                                description={`${Math.round(hazard.distance_from_route_meters)}m ${language === 'ar' ? 'من الطريق' : language === 'ku' ? 'ji ser reye' : 'from route'}`}
                                tracksViewChanges={false}
                            >
                                <View style={styles.routeHazardMarker}>
                                    <Text style={{ fontSize: 18 }}>{getCategoryIcon(hazard.category_id)}</Text>
                                </View>
                            </Marker>
                        );
                    })}

                    {/* Heatmap Overlay - native on Android, circle-based on iOS */}
                    {Platform.OS === 'android' && heatmapEnabled && heatmapPoints.length > 0 && (
                        <Heatmap
                            points={heatmapPoints}
                            radius={40}
                            opacity={0.7}
                            gradient={{
                                colors: ["#00FF00", "#FFFF00", "#FF8C00", "#FF0000"],
                                startPoints: [0.1, 0.3, 0.6, 1.0],
                                colorMapSize: 256,
                            }}
                        />
                    )}
                    {Platform.OS === 'ios' && iosHeatmapCircles.map((circle) => (
                        <Circle
                            key={circle.key}
                            center={{ latitude: circle.latitude, longitude: circle.longitude }}
                            radius={150}
                            fillColor={circle.fillColor}
                            strokeColor="transparent"
                        />
                    ))}
                </MapView>

            </View>

            {/* HEADER OVERLAY */}
            <TouchableWithoutFeedback onPress={dismissSearchAndKeyboard}>
                <View style={styles.appbar}>
                    <Text style={styles.title}>{t('home.title')}</Text>
                </View>
            </TouchableWithoutFeedback>

            {/* SEARCH OVERLAY */}
            <View style={styles.searchContainer}>
                <GooglePlacesAutocomplete
                    ref={googlePlacesRef}
                    placeholder={language === 'ar' ? 'ابحث عن موقع أو شارع' : language === 'ku' ? 'Li cîh an kolanekê bigerin' : 'Search for location or street'}
                    minLength={2}
                    debounce={400}
                    fetchDetails={true}
                    onPress={(data, details = null) => {
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
                            navigateToPlace(lat, lng, description);
                        } else {
                            lastSelectedCoords.current = null;
                        }
                    }}
                    onFail={(error) => {
                        console.error('❌ Places API Error:', error);
                    }}
                    query={{
                        key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBRM_T7GtQ8JROceC_Gm0qRVjgxNh2Fxr4',
                        language: language,
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
                            setForceHideSuggestions(true);
                            Keyboard.dismiss();
                            const coords = lastSelectedCoords.current;
                            if (coords) {
                                navigateToPlace(coords.latitude, coords.longitude, coords.title);
                            } else if (searchText && searchText.trim().length >= 2) {
                                searchWithGeocoding(searchText);
                            }
                        },
                    }}
                    renderRightButton={() => (
                        <TouchableOpacity
                            style={styles.searchIconContainer}
                            onPress={() => {
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

            {/* FILTER OVERLAY */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesRow}
                style={styles.categoriesScroll}
            >
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
                        {language === 'ar' ? 'الكل' : language === 'ku' ? 'Hemû' : 'All'}
                    </Text>
                </TouchableOpacity>

                {categories.map((category) => {
                    const isActive = activeFilters.includes(category.id);
                    const color = getCategoryColor(category.id);
                    const displayName =
                        language === 'ar'
                            ? (category.name_ar || category.name)
                            : language === 'ku'
                                ? (category.name_ku || category.name)
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

            {/* FLOATING ACTION BAR – right side, bottom to top: Heatmap → Audio → Plus */}
            <View
                style={[
                    styles.fabBar,
                    { right: 14, bottom: Platform.OS === 'android' ? Math.max(insets.bottom, 16) + 80 : insets.bottom + 85 },
                ]}
            >
                {/* DRIVING MODE BUTTON (bottommost) */}
                <TouchableOpacity
                    style={styles.drivingModeButton}
                    onPress={() => setDrivingMode(true)}
                >
                    <Ionicons name="car-sport" size={22} color="#0D2B66" />
                </TouchableOpacity>

                {/* HEATMAP TOGGLE BUTTON */}
                <TouchableOpacity
                    style={[
                        styles.heatmapButton,
                        heatmapEnabled && styles.heatmapButtonActive,
                    ]}
                    onPress={() => setHeatmapEnabled(!heatmapEnabled)}
                >
                    <Ionicons name={heatmapEnabled ? "flame" : "flame-outline"} size={22} color={heatmapEnabled ? "#fff" : "#0D2B66"} />
                </TouchableOpacity>

                {/* AUDIO BUTTON (middle) */}
                <TouchableOpacity
                    style={styles.soundButton}
                    onPress={() => setAudioVisible(true)}
                >
                    <Ionicons name="volume-high" style={styles.soundIcon} />
                </TouchableOpacity>

                {/* MAIN PLUS FAB (top of fixed stack) */}
                <TouchableOpacity style={styles.fab} onPress={toggleMenu}>
                    <Text style={styles.fabPlus}>{menuOpen ? "×" : "+"}</Text>
                </TouchableOpacity>

                {/* REPORT TYPE BUTTONS (expand upward on menu open) */}
                {menuOpen && (
                    <Animated.View style={[styles.fabActions, { transform: [{ scale: scaleAnim }] }]}>
                        <TouchableOpacity
                            style={styles.fabActionBtn}
                            onPress={() => { setReportType("pothole"); setMenuOpen(false); }}
                        >
                            <Image source={require("../../assets/icons/pothole.png")} style={styles.fabActionIcon} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.fabActionBtn}
                            onPress={() => { setReportType("accident"); setMenuOpen(false); }}
                        >
                            <Image source={require("../../assets/icons/accident.png")} style={styles.fabActionIcon} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.fabActionBtn}
                            onPress={() => { setReportType("environment"); setMenuOpen(false); }}
                        >
                            <View style={[styles.fabActionIcon, { justifyContent: 'center', alignItems: 'center' }]}>
                                <Text style={{ fontSize: 24 }}>🌿</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>

            {/* ROUTE LOADING INDICATOR */}
            {routeLoading && (
                <View style={styles.routeInputContainer}>
                    <View style={styles.routeLoadingOverlay}>
                        <Text style={{ color: '#0D2B66', fontSize: 14 }}>
                            {language === 'ar' ? 'جاري تحميل المسار...' : language === 'ku' ? 'Rê te barkirin...' : 'Loading route...'}
                        </Text>
                    </View>
                </View>
            )}

            {/* ROUTE HAZARD SUMMARY PANEL WITH SAFE ROUTE SELECTOR */}
            {routeMode && routeCoords.length > 0 && (
                <View style={[styles.routeSummaryPanel, language === 'ar' ? { direction: 'rtl' } : {}]}>
                    {/* Header with close button */}
                    <View style={styles.routeSummaryHeader}>
                        <Ionicons name="navigate" size={18} color="#0D2B66" />
                        <Text style={styles.routeSummaryTitle}>
                            {language === 'ar' ? 'تخطيط الطريق الآمن' : language === 'ku' ? 'Plana Rêya Ewle' : 'Safe Route Planning'}
                        </Text>
                        <TouchableOpacity onPress={clearRoute} style={{ marginLeft: 'auto' }}>
                            <Ionicons name="close-circle" size={22} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* Route Options Selector */}
                    {alternativeRoutes.length > 1 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                            {alternativeRoutes.map((route, idx) => {
                                const isSelected = idx === selectedRouteIndex;
                                const routeLabel = language === 'ar' ? route.label.ar : language === 'ku' ? route.label.ku : route.label.en;
                                const durationMin = route.duration ? Math.round(parseInt(route.duration.replace('s', '')) / 60) : 0;
                                const distanceKm = route.distanceMeters ? (route.distanceMeters / 1000).toFixed(1) : '?';
                                return (
                                    <TouchableOpacity
                                        key={`route-opt-${idx}`}
                                        style={[
                                            styles.routeOptionCard,
                                            { borderColor: route.color, borderWidth: isSelected ? 2.5 : 1 },
                                            isSelected && { backgroundColor: route.color + '15' },
                                        ]}
                                        onPress={() => selectRoute(idx)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                            <Text style={{ fontSize: 16 }}>{route.icon}</Text>
                                            <Text style={[styles.routeOptionLabel, { color: route.color }]} numberOfLines={1}>
                                                {routeLabel}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={styles.routeOptionDetail}>
                                                {distanceKm} km  •  {durationMin} {language === 'ar' ? 'د' : 'min'}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                            {route.totalHazards > 0 ? (
                                                <>
                                                    <Ionicons name="warning" size={13} color="#F59E0B" />
                                                    <Text style={{ fontSize: 12, color: '#F59E0B', fontWeight: '600' }}>
                                                        {route.totalHazards} {language === 'ar' ? 'خطر' : language === 'ku' ? 'xeter' : 'hazard' + (route.totalHazards > 1 ? 's' : '')}
                                                    </Text>
                                                </>
                                            ) : (
                                                <>
                                                    <Ionicons name="checkmark-circle" size={13} color="#22C55E" />
                                                    <Text style={{ fontSize: 12, color: '#22C55E', fontWeight: '600' }}>
                                                        {language === 'ar' ? 'آمن' : language === 'ku' ? 'Ewle' : 'Safe'}
                                                    </Text>
                                                </>
                                            )}
                                            {route.potholeCount > 0 && (
                                                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                                                    • 🚗 {route.potholeCount} {language === 'ar' ? 'حفرة' : language === 'ku' ? 'çal' : 'pothole' + (route.potholeCount > 1 ? 's' : '')}
                                                </Text>
                                            )}
                                        </View>
                                        {/* Safety score bar */}
                                        <View style={styles.safetyBarBg}>
                                            <View style={[styles.safetyBarFill, {
                                                width: `${route.safetyScore}%`,
                                                backgroundColor: route.safetyScore >= 70 ? '#22C55E' : route.safetyScore >= 40 ? '#F59E0B' : '#EF4444',
                                            }]} />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}

                    {/* Hazard details for selected route */}
                    <View style={{ marginTop: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name={routeHazards.length > 0 ? "warning" : "checkmark-circle"} size={16} color={routeHazards.length > 0 ? "#F59E0B" : "#22C55E"} />
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#0D2B66' }}>
                                {routeHazards.length > 0
                                    ? (language === 'ar'
                                        ? `${routeHazards.length} تحذير على هذا الطريق`
                                        : language === 'ku' ? `${routeHazards.length} hişyarî li ser vê rêyê` : `${routeHazards.length} warning${routeHazards.length > 1 ? 's' : ''} on this route`)
                                    : (language === 'ar' ? 'طريق آمن ✓' : language === 'ku' ? 'Rêya ewle ✓' : 'Safe route ✓')
                                }
                            </Text>
                        </View>
                    </View>
                    {routeHazards.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                            {Object.entries(routeSummary).map(([catId, count]) => {
                                const catColor = getCategoryColor(Number(catId));
                                const catIcon = getCategoryIcon(Number(catId));
                                const catName = categories.find(c => c.id === Number(catId));
                                const displayName =
                                    language === 'ar'
                                        ? (catName?.name_ar || catName?.name || '')
                                        : language === 'ku'
                                            ? (catName?.name_ku || catName?.name || '')
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
                    )}
                </View>
            )}


            {/* INFO-BAR UNTEN */}
            <View style={styles.infoBar}>
                <Text style={styles.infoText}>
                    {language === 'ar' ? `عدد البلاغات النشطة: ${visibleMarkers.length} / ${reports.length} 📘` : language === 'ku' ? `Hejmara raporên çalak: ${visibleMarkers.length} / ${reports.length}` : `Active Reports: ${visibleMarkers.length} / ${reports.length} 📘`}
                </Text>
            </View>

            {/* Long Press Hint - shows when marker is placed */}
            {longPressMarker && (
                <View style={styles.longPressHint}>
                    <Text style={styles.longPressHintText}>
                        {language === 'ar'
                            ? '📌 تم تحديد الموقع - اضغط + لإضافة بلاغ'
                            : language === 'ku'
                                ? '📌 Cihê hate diyarkirin - li + bide ji bo çêkirina raporê'
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
                        ? (language === 'ar' ? 'موقع مختار على الخريطة' : language === 'ku' ? 'Cihê hilbijarti li ser nexşe' : 'Selected map location')
                        : searchMarker?.title || (language === 'ar' ? 'الموقع التلقائي' : language === 'ku' ? 'Cihê bixweber' : 'Auto Location')
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
                            alert(language === 'ar' ? 'يرجى تفعيل تحديد الموقع أو البحث عن موقع' : language === 'ku' ? 'Ji kerema xwe cîhê xwe çalak  bike an li ciheke bigere' : 'Please enable location or search for a location');
                            return;
                        }

                        // Map report type to category
                        let categoryId = 1;

                        if (reportType === 'pothole') {
                            categoryId =
                                getCategoryByName('حفرة')?.id ||
                                getCategoryByName('çalak')?.id ||
                                1;

                        } else if (reportType === 'accident') {
                            categoryId =
                                getCategoryByName('حادث')?.id ||
                                getCategoryByName('qezay')?.id ||
                                2;

                        } else if (reportType === 'environment') {
                            categoryId =
                                getCategoryByName('خطر بيئي')?.id ||
                                getCategoryByName('بيئ')?.id ||
                                getCategoryByName('jîngehî')?.id ||
                                3;
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
                                    ? (language === 'ar' ? 'أقل من 1 متر' : language === 'ku' ? 'kemtir ji 1m' : 'less than 1m')
                                    : `${Math.round(nearest.distance_meters)}m`;

                                // Show confirmation dialog and wait for user decision
                                const userChoice = await new Promise<'confirm' | 'create' | 'cancel'>((resolve) => {
                                    Alert.alert(
                                        language === 'ar' ? '⚠️ بلاغ مشابه قريب' : language === 'ku' ? 'Raporek wekhev li nêzîk' : '⚠️ Similar Report Nearby',
                                        language === 'ar'
                                            ? `يوجد بلاغ مشابه على بعد ${distText}.\n\nهل تريد تأكيد البلاغ الموجود بدلاً من إنشاء بلاغ جديد؟`
                                            : language === 'ku'
                                                ? `Raporek wekhev ${distText} dûr heye.\n\nTu dixwazî rapora heyî piştrast bikî li şûna çêkirina raporek nû?`
                                                : `A similar report exists ${distText} away.\n\nWould you like to confirm the existing report instead of creating a new one?`,

                                        [
                                            { text: language === 'ar' ? 'إلغاء' : language === 'ku' ? 'Betal bike' : 'Cancel', style: 'cancel', onPress: () => resolve('cancel') },
                                            { text: language === 'ar' ? 'إنشاء جديد' : language === 'ku' ? 'Çêkirina Nû' : 'Create New', onPress: () => resolve('create') },
                                            { text: language === 'ar' ? '✓ تأكيد الموجود' : language === 'ku' ? '✓ Piştrastkirina Hebûnê' : '✓ Confirm Existing', onPress: () => resolve('confirm') },
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
                                            language === 'ar' ? '✅ تم التأكيد' : language === 'ku' ? '✅ Hate piştrastkirin' : '✅ Confirmed',
                                            language === 'ar'
                                                ? `تم تأكيد البلاغ #${nearest.id}. حصلت على ${confirmResult.points_awarded} نقاط!`
                                                : language === 'ku' ? `Rapor #${nearest.id} hate piştrastkirin! Tê ${confirmResult.points_awarded} xal wergirtin!!` : `Report #${nearest.id} confirmed! You earned ${confirmResult.points_awarded} points!`
                                        );

                                        await loadData(locationToUse);
                                        reportCreated();
                                        await refreshUser();
                                    } catch (confirmError: any) {
                                        const detail = confirmError?.response?.data?.detail || '';
                                        Alert.alert(
                                            language === 'ar' ? 'خطأ' : language === 'ku' ? 'Cewti' : 'Error',
                                            detail || (language === 'ar' ? 'فشل تأكيد البلاغ' : language === 'ku' ? 'Piştrastkirin raporê têkçûn ' : 'Failed to confirm report')
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

                        // Upload photo if provided - FAST mode, AI runs in background
                        let photoUrl: string | undefined = undefined;
                        if (data.photoUri) {
                            try {
                                console.log('📷 Uploading photo (fast mode, AI will run in background)...');
                                // Use asyncAI=true for fast upload - AI will run after report creation
                                const uploadResult = await reportingAPI.uploadImage(data.photoUri, true);
                                photoUrl = uploadResult.url;
                                console.log('✅ Photo uploaded:', photoUrl);
                            } catch (uploadError) {
                                console.warn('⚠️ Photo upload failed, continuing without photo:', uploadError);
                                // Continue without photo if upload fails
                            }
                        }

                        // Create report immediately
                        const finalDescription = data.notes || (language === 'ar' ? 'بلاغ جديد' : language === 'ku' ? 'Rapora nû' : 'New Report');

                        const newReport = await reportingAPI.createReport({
                            title: data.type === 'pothole'
                                ? (language === 'ar' ? 'حفرة في الطريق' : language === 'ku' ? 'Çalêk  li ser rê' : 'Pothole on Road')
                                : data.type === 'accident'
                                    ? (language === 'ar' ? 'حادث مروري' : language === 'ku' ? 'Qezaya trafîkê' : 'Traffic Accident')
                                    : (language === 'ar' ? 'خطر بيئي' : language === 'ku' ? 'Metirsiya jîngehî' : 'Environmental Hazard'),
                            description: finalDescription,
                            category_id: categoryId,
                            latitude: locationToUse.latitude,
                            longitude: locationToUse.longitude,
                            address_text: data.address,
                            severity_id: severityId,
                            photo_urls: photoUrl,
                        });

                        console.log('✅ Report created:', newReport.id);

                        // Trigger AI analysis in background (will send push notification when done)
                        if (photoUrl && data.type === 'pothole') {
                            try {
                                console.log('🔄 Triggering AI analysis in background...');
                                reportingAPI.triggerAIAnalysis(newReport.id, language).catch(e => {
                                    console.warn('⚠️ AI analysis trigger failed:', e);
                                });
                                console.log('✅ AI analysis triggered - notification will be sent when complete');
                            } catch (analyzeError) {
                                console.warn('⚠️ Could not trigger AI analysis:', analyzeError);
                            }
                        }

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
                        alert(language === 'ar' ? '❌ حدث خطأ أثناء إرسال البلاغ' : language === 'ku' ? '❌ Di şandina raporê de xeletiyek çêbû' : '❌ Error submitting report');
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
                        <BlurView intensity={55} tint="light" style={[styles.audioSheet, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 16) + 80 : insets.bottom + 90 }]}>
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
                                            await speakWarning('environment');
                                        }
                                    }}
                                >
                                    <View style={[styles.modeIconCircle]}>
                                        <Ionicons name="leaf" size={26} color="#10B981" />
                                    </View>
                                    <Text style={styles.modeText}>{t('home.environmentHazard')}</Text>
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

            {/* MARKER DETAIL BOTTOM SHEET */}
            {markerDetailVisible && selectedReportForDonation && (
                <View style={[styles.markerDetailOverlay, { bottom: 65 + (Platform.OS === 'android' ? Math.max(insets.bottom, 16) + 10 : 15) }]}>
                    <TouchableOpacity
                        style={styles.markerDetailBackdrop}
                        activeOpacity={1}
                        onPress={() => setMarkerDetailVisible(false)}
                    />
                    <Animated.View style={[styles.markerDetailSheet, { transform: [{ translateY: markerDetailSheetY }] }]}>
                        <View {...markerDetailPanResponder.panHandlers} style={styles.markerDetailHandleArea}>
                            <View style={styles.markerDetailHandle} />
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                        {/* Photo */}
                        {(() => {
                            const API_URL = getBaseUrl();
                            let imgUrl: string | null = null;
                            const r = selectedReportForDonation;
                            if (r.ai_annotated_url) {
                                const url = r.ai_annotated_url.trim();
                                if (url.startsWith('http://') || url.startsWith('https://')) imgUrl = url;
                                else if (url.startsWith('/uploads/')) imgUrl = `${API_URL}/api/reports${url}`;
                                else if (url.startsWith('/')) imgUrl = `${API_URL}/api/reports${url}`;
                                else imgUrl = `${API_URL}/api/reports/${url}`;
                            } else if (r.photo_urls) {
                                const firstUrl = r.photo_urls.split(',')[0].trim();
                                if (firstUrl) {
                                    if (firstUrl.startsWith('http://') || firstUrl.startsWith('https://')) imgUrl = firstUrl;
                                    else if (firstUrl.startsWith('/uploads/')) imgUrl = `${API_URL}/api/reports${firstUrl}`;
                                    else if (firstUrl.startsWith('/')) imgUrl = `${API_URL}/api/reports${firstUrl}`;
                                    else imgUrl = `${API_URL}/api/reports/${firstUrl}`;
                                }
                            }
                            return imgUrl ? (
                                <Image
                                    source={{ uri: imgUrl }}
                                    style={{ width: '100%', height: 180, borderRadius: 12, marginBottom: 12 }}
                                    resizeMode="cover"
                                />
                            ) : null;
                        })()}

                        {/* Title */}
                        <Text style={styles.markerDetailTitle}>
                            {selectedReportForDonation.title || (() => {
                                const cat = categories.find(c => c.id === selectedReportForDonation.category_id);
                                if (cat) {
                                    return language === 'ar' 
                                        ? (cat.name_ar || cat.name_en || cat.name || 'بلاغ')
                                        : language === 'ku'
                                        ? (cat.name_ku || cat.name_en || cat.name || 'Rapor')
                                        : (cat.name_en || cat.name || 'Report');
                                }
                                return language === 'ar' ? 'بلاغ' : language === 'ku' ? 'Rapor' : 'Report';
                            })()}
                        </Text>

                        {/* Category & Severity */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ color: '#ccc', fontSize: 13, fontFamily: 'Tajawal-Regular' }}>
                                {getCategoryIcon(selectedReportForDonation.category_id)} {(() => {
                                    const cat = categories.find(c => c.id === selectedReportForDonation.category_id);
                                    if (!cat) return '';
                                    return language === 'ar' ? (cat.name_ar || cat.name) : language === 'ku' ? (cat.name_ku || cat.name) : (cat.name_en || cat.name);
                                })()}
                            </Text>
                            <Text style={{ color: '#ccc', fontSize: 13, fontFamily: 'Tajawal-Regular' }}>
                                #{selectedReportForDonation.id}
                            </Text>
                        </View>

                        {/* Address */}
                        {selectedReportForDonation.address_text && (
                            <Text style={{ color: '#aaa', fontSize: 13, marginBottom: 8, fontFamily: 'Tajawal-Regular' }}>
                                📍 {selectedReportForDonation.address_text}
                            </Text>
                        )}

                        {/* Description */}
                        {selectedReportForDonation.description ? (
                            <Text style={styles.markerDetailDesc}>
                                {selectedReportForDonation.description}
                            </Text>
                        ) : null}

                        {/* Share WhatsApp Button */}
                        <TouchableOpacity
                            style={{ backgroundColor: '#25D366', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 12, flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                            onPress={() => {
                                const r = selectedReportForDonation;
                                const title = r.title || (language === 'ar' ? 'بلاغ' : language === 'ku' ? 'Rapor' : 'Report');
                                const desc = r.description || '';
                                const lat = r.latitude;
                                const lng = r.longitude;
                                const msg = `🚨 *${language === 'ar' ? 'بلاغ كاشف' : language === 'ku' ? 'Raporek Kashif' : 'Kashif Report'}*\n\n📋 *${language === 'ar' ? 'العنوان' : language === 'ku' ? 'Sernav' : 'Title'}:* ${title}\n📝 *${language === 'ar' ? 'الوصف' : language === 'ku' ? 'Danasîn' : 'Description'}:* ${desc}\n🔢 *#${r.id}*\n\n📍 *${language === 'ar' ? 'الموقع' : language === 'ku' ? 'Cih' : 'Location'}:*\nhttps://www.google.com/maps?q=${lat},${lng}`;
                                Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() => {
                                    Alert.alert(language === 'ar' ? 'واتساب غير مثبت' : language === 'ku' ? 'WhatsApp tune ye' : 'WhatsApp not installed');
                                });
                            }}
                        >
                            <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: 15, fontFamily: 'Tajawal-Bold' }}>
                                {language === 'ar' ? 'مشاركة عبر واتساب' : language === 'ku' ? 'Parvekirin bi WhatsApp' : 'Share via WhatsApp'}
                            </Text>
                        </TouchableOpacity>

                        {/* Donate Button */}
                        <TouchableOpacity
                            style={styles.markerDetailDonateBtn}
                            onPress={() => {
                                setMarkerDetailVisible(false);
                                setDonationModalVisible(true);
                            }}
                        >
                            <Ionicons name="heart" size={18} color="#fff" />
                            <Text style={styles.markerDetailDonateTxt}>
                                {language === 'ar' ? 'تبرع' : language === 'ku' ? 'Bexş' : 'Donate'}
                            </Text>
                        </TouchableOpacity>
                        </ScrollView>

                        {/* Close - always visible */}
                        <TouchableOpacity
                            style={styles.markerDetailCloseBtn}
                            onPress={() => setMarkerDetailVisible(false)}
                        >
                            <Text style={styles.markerDetailCloseTxt}>
                                {language === 'ar' ? 'إغلاق' : language === 'ku' ? 'Bigire' : 'Close'}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            )}

            {/* DRIVING MODE OVERLAY */}
            {drivingMode && (
                <View style={styles.drivingModeOverlay}>
                    {/* Map still visible underneath, but controls are simplified */}

                    {/* Exit button - small, top corner */}
                    <TouchableOpacity
                        style={[styles.drivingModeExit, { top: insets.top + 10 }]}
                        onPress={() => setDrivingMode(false)}
                    >
                        <Ionicons name="close" size={24} color="#fff" />
                        <Text style={styles.drivingModeExitText}>
                            {language === 'ar' ? 'خروج' : language === 'ku' ? 'Derketin' : 'Exit'}
                        </Text>
                    </TouchableOpacity>

                    {/* Mode label */}
                    <View style={[styles.drivingModeLabel, { top: insets.top + 10 }]}>
                        <Ionicons name="car-sport" size={20} color="#fff" />
                        <Text style={styles.drivingModeLabelText}>
                            {language === 'ar' ? 'وضع القيادة' : language === 'ku' ? 'Moda Ajotinê' : 'Driving Mode'}
                        </Text>
                    </View>

                    {/* Speed / location info */}
                    {userLocation && (
                        <View style={styles.drivingModeLocationBar}>
                            <Ionicons name="location" size={16} color="#22C55E" />
                            <Text style={styles.drivingModeLocationText}>
                                {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                            </Text>
                        </View>
                    )}

                    {/* THE ONE BIG BUTTON */}
                    <TouchableOpacity
                        style={[
                            styles.drivingModeMainButton,
                            drivingModeReporting && styles.drivingModeMainButtonDisabled,
                        ]}
                        onPress={handleDrivingModeReport}
                        disabled={drivingModeReporting}
                        activeOpacity={0.7}
                    >
                        <View style={styles.drivingModeButtonInner}>
                            {drivingModeReporting ? (
                                <>
                                    <Text style={styles.drivingModeButtonIcon}>✅</Text>
                                    <Text style={styles.drivingModeButtonText}>
                                        {language === 'ar' ? 'تم التسجيل!' : language === 'ku' ? 'Hat tomarkirin!' : 'Reported!'}
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.drivingModeButtonIcon}>⚠️</Text>
                                    <Text style={styles.drivingModeButtonText}>
                                        {language === 'ar' ? 'حفرة في الطريق' : language === 'ku' ? 'Çalêk li ser rê' : 'Pothole!'}
                                    </Text>
                                    <Text style={styles.drivingModeButtonSubtext}>
                                        {language === 'ar' ? 'اضغط للإبلاغ الفوري' : language === 'ku' ? 'Pêl bike ji bo raporkirinê' : 'Tap to report instantly'}
                                    </Text>
                                </>
                            )}
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* DONATION MODAL */}
            <DonationModal
                visible={donationModalVisible}
                onClose={() => setDonationModalVisible(false)}
                report={selectedReportForDonation ? {
                    id: selectedReportForDonation.id,
                    title: selectedReportForDonation.title,
                    repair_cost: (selectedReportForDonation as any).repair_cost,
                    total_donated: (selectedReportForDonation as any).total_donated,
                } : null}
            />

        </View>
    )}


/* ================= STYLES ================= */

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: BLUE, direction: "rtl" },

    appbar: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: Platform.OS === "ios" ? 80 : 80,
        paddingTop: Platform.OS === "ios" ? 30 : 30,
        backgroundColor: "rgba(13, 43, 102, 0.85)",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
    },
    title: { color: "#fff", fontSize: 24, fontFamily: "Tajawal-Bold" },

    searchContainer: {
        position: "absolute",
        top: Platform.OS === "ios" ? 85 : 85,
        left: 15,
        right: 15,
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
        ...StyleSheet.absoluteFillObject,
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

    fabBar: {
        position: "absolute",
        bottom: 100,
        flexDirection: "column-reverse",
        alignItems: "center",
        zIndex: 1000,
        gap: 10,
    },
    fabActions: {
        flexDirection: "column-reverse",
        alignItems: "center",
        gap: 10,
    },
    fabActionBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        elevation: 5,
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    fabActionIcon: {
        width: 26,
        height: 26,
        resizeMode: "contain" as const,
    },
    fab: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#F4B400",
        alignItems: "center",
        justifyContent: "center",
        elevation: 8,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
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
        position: "absolute",
        top: Platform.OS === "ios" ? 130 : 130,
        left: 0,
        right: 0,
        maxHeight: 44,
        zIndex: 99,
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
        borderColor: "rgba(0,0,0,0.12)",
        backgroundColor: "rgba(255,255,255,0.85)",
    },

    categoryItemActive: {
        backgroundColor: "rgba(255,210,100,0.15)",
        borderColor: "#FFD166",
    },

    categoryText: {
        color: "#000000",
        fontSize: 13,
        fontFamily: "Tajawal-Bold",
    },
    categoryTextActive: {
        color: "#0D2B66",
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


    soundButton: {
        width: 50,
        height: 50,
        backgroundColor: "#F4B400",
        borderRadius: 25,
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
    heatmapButton: {
        width: 46,
        height: 46,
        backgroundColor: "#fff",
        borderRadius: 23,
        alignItems: "center",
        justifyContent: "center",
        elevation: 6,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    heatmapButtonActive: {
        backgroundColor: "#FF6B35",
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
        elevation: 10000,
        zIndex: 10000,
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
    // ─── SAFE ROUTE PLANNING STYLES ─────────────────────────────────
    routeOptionCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 10,
        marginRight: 10,
        minWidth: 155,
        maxWidth: 180,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        elevation: 3,
    },
    routeOptionLabel: {
        fontSize: 13,
        fontWeight: '700',
        flexShrink: 1,
    },
    routeOptionDetail: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
    },
    safetyBarBg: {
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        marginTop: 6,
        overflow: 'hidden',
    },
    safetyBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    // ────────────────────────────────────────────────────────────────
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
        zIndex: 9999,
        elevation: 9999,
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

// ─── MARKER DETAIL BOTTOM SHEET ──────────────────────────────────
    markerDetailOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 9999,
        justifyContent: 'flex-end',
    },
    markerDetailBackdrop: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    markerDetailSheet: {
        backgroundColor: '#1a1a2e',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 10,
        maxHeight: '70%',
    },
    markerDetailHandleArea: {
        paddingVertical: 10,
        marginHorizontal: -20,
        marginTop: -20,
        marginBottom: 6,
        alignItems: 'center',
    },
    markerDetailHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignSelf: 'center',
    },
    markerDetailTitle: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Tajawal-Bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    markerDetailDesc: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontFamily: 'Tajawal-Regular',
        textAlign: 'center',
        marginBottom: 8,
    },
    markerDetailActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginTop: 8,
    },
    markerDetailDonateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E91E63',
        paddingVertical: 12,
        borderRadius: 10,
        gap: 8,
        marginTop: 8,
    },
    markerDetailDonateTxt: {
        color: '#fff',
        fontSize: 15,
        fontFamily: 'Tajawal-Bold',
    },
    markerDetailCloseBtn: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 12,
    },
    markerDetailCloseTxt: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Tajawal-Medium',
    },

    // ─── DRIVING MODE STYLES ───────────────────────────────────────────
    drivingModeButton: {
        width: 46,
        height: 46,
        backgroundColor: '#fff',
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    drivingModeOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 99999,
        elevation: 99999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    drivingModeExit: {
        position: 'absolute',
        left: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        zIndex: 10,
    },
    drivingModeExitText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    drivingModeLabel: {
        position: 'absolute',
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#0D2B66',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    drivingModeLabelText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    drivingModeLocationBar: {
        position: 'absolute',
        top: 70,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
    },
    drivingModeLocationText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontFamily: 'Tajawal-Regular',
    },
    drivingModeMainButton: {
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#EF4444',
        shadowOpacity: 0.5,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 30,
        elevation: 20,
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    drivingModeMainButtonDisabled: {
        backgroundColor: '#22C55E',
        shadowColor: '#22C55E',
    },
    drivingModeButtonInner: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    drivingModeButtonIcon: {
        fontSize: 48,
        marginBottom: 4,
    },
    drivingModeButtonText: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        fontFamily: 'Tajawal-Bold',
    },
    drivingModeButtonSubtext: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 4,
        fontFamily: 'Tajawal-Regular',
    },
    // ────────────────────────────────────────────────────────────────────

});
