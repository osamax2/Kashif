import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import * as TaskManager from 'expo-task-manager';
import api from './api';

const LOCATION_TASK_NAME = 'background-location-task';
const ALERT_DISTANCE_THRESHOLD = 200; // 200 meters

interface Report {
  id: number;
  latitude: number;
  longitude: number;
  status: string;
  category_id: number;
  category?: {
    id: number;
    name: string;
  };
}

interface AlertSettings {
  soundEnabled: boolean;
  warnPothole: boolean;
  warnAccident: boolean;
  warnSpeed: boolean;
  appVolume: number;
  language: string;
}

class LocationMonitoringService {
  private isMonitoring = false;
  private currentLocation: Location.LocationObject | null = null;
  private nearbyReports: Report[] = [];
  private alertedReportIds: Set<number> = new Set();
  private audioInitialized = false;
  private isCheckingProximity = false;
  private isAlertShowing = false;
  private alertSettings: AlertSettings = {
    soundEnabled: true,
    warnPothole: true,
    warnAccident: true,
    warnSpeed: true,
    appVolume: 1,
    language: 'ar',
  };

  /**
   * Initialize audio mode for background playback
   */
  async initializeAudio(): Promise<void> {
    if (this.audioInitialized) return;
    
    try {
      console.log('🔊 Initializing audio mode for background playback...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      this.audioInitialized = true;
      console.log('✅ Audio mode initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize audio mode:', error);
    }
  }

  /**
   * Update alert settings
   */
  updateSettings(settings: Partial<AlertSettings>) {
    this.alertSettings = { ...this.alertSettings, ...settings };
    console.log('🔧 Alert settings updated:', this.alertSettings);
  }

  /**
   * Calculate distance between two coordinates in meters using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== 'granted') {
        console.log('Foreground location permission not granted');
        return false;
      }

      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();

      if (backgroundStatus !== 'granted') {
        console.log('Background location permission not granted');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Fetch nearby reports from backend
   */
  private async fetchNearbyReports(latitude: number, longitude: number): Promise<Report[]> {
    try {
      const response = await api.get<Report[]>('/api/reports/', {
        params: {
          limit: 1000,
          skip: 0,
        },
      });

      // Filter by distance manually since backend may not support radius param
      return response.data.filter((report) => {
        const rLat = typeof report.latitude === 'string' ? parseFloat(report.latitude) : report.latitude;
        const rLng = typeof report.longitude === 'string' ? parseFloat(report.longitude) : report.longitude;
        if (isNaN(rLat) || isNaN(rLng)) return false;
        
        const distance = this.calculateDistance(
          latitude,
          longitude,
          rLat,
          rLng
        );
        
        // Only include reports within 1km
        return distance <= 1000;
      });
    } catch (error: any) {
      // Silently handle 404 errors (endpoint not available)
      if (error?.response?.status !== 404) {
        console.error('Failed to fetch nearby reports:', error);
      }
      return [];
    }
  }

  /**
   * Check if user is approaching any reports
   */
  async checkProximityToReports(location: Location.LocationObject) {
    // Prevent concurrent checks
    if (this.isCheckingProximity || this.isAlertShowing) return;
    this.isCheckingProximity = true;
    
    try {
    const { latitude, longitude } = location.coords;

    // Fetch nearby reports
    this.nearbyReports = await this.fetchNearbyReports(latitude, longitude);

    // Check distance to each report
    for (const report of this.nearbyReports) {
      const rLat = typeof report.latitude === 'string' ? parseFloat(report.latitude) : report.latitude;
      const rLng = typeof report.longitude === 'string' ? parseFloat(report.longitude) : report.longitude;
      if (isNaN(rLat) || isNaN(rLng)) continue;
      
      const distance = this.calculateDistance(
        latitude,
        longitude,
        rLat,
        rLng
      );

      // If within alert threshold and not already alerted
      if (distance <= ALERT_DISTANCE_THRESHOLD && !this.alertedReportIds.has(report.id)) {
        // Check if alerts are enabled for this category
        const shouldAlert = this.shouldShowAlertForCategory(report.category_id);
        
        if (shouldAlert) {
          this.alertedReportIds.add(report.id);
          await this.showAlert(report, Math.round(distance));
        }
      }

      // Reset alert if user moves away
      if (distance > ALERT_DISTANCE_THRESHOLD + 100) {
        this.alertedReportIds.delete(report.id);
      }
    }
    } catch (error) {
      console.error('Error checking proximity:', error);
    } finally {
      this.isCheckingProximity = false;
    }
  }

  /**
   * Check if alert should be shown for this category
   * Category IDs from backend:
   * 1 = Speed Camera (كاميرا مراقبة)
   * 2 = Pothole (حفرة)
   * 3 = Accident (حادث)
   * 4 = Public Services
   * 5 = Other
   */
  private shouldShowAlertForCategory(categoryId: number): boolean {
    switch (categoryId) {
      case 1: // Speed Camera
        return this.alertSettings.warnSpeed;
      case 2: // Pothole
        return this.alertSettings.warnPothole;
      case 3: // Accident
        return this.alertSettings.warnAccident;
      default:
        return true;
    }
  }

  /**
   * Get alert message for category
   */
  private getAlertMessage(categoryId: number, distance: number): { title: string; message: string } {
    const lang = this.alertSettings.language;
    
    switch (categoryId) {
      case 1: // Speed Camera (كاميرا مراقبة)
        return {
          title: lang === 'ar' ? '📷 تنبيه: كاشف سرعة' : '📷 Alert: Speed Camera',
          message: lang === 'ar'
            ? `يوجد كاشف سرعة على بعد ${distance} متر أمامك. التزم بالسرعة المحددة!`
            : `There is a speed camera ${distance} meters ahead. Follow speed limit!`,
        };
      case 2: // Pothole (حفرة)
        return {
          title: lang === 'ar' ? '⚠️ تحذير: حفرة في الطريق' : '⚠️ Warning: Pothole Ahead',
          message: lang === 'ar' 
            ? `يوجد حفرة على بعد ${distance} متر أمامك. كن حذراً!`
            : `There is a pothole ${distance} meters ahead. Be careful!`,
        };
      case 3: // Accident (حادث)
        return {
          title: lang === 'ar' ? '🚨 تحذير: حادث مروري' : '🚨 Warning: Traffic Accident',
          message: lang === 'ar'
            ? `يوجد حادث مروري على بعد ${distance} متر أمامك. خفف السرعة!`
            : `There is a traffic accident ${distance} meters ahead. Slow down!`,
        };
      case 4: // Public Services
        return {
          title: lang === 'ar' ? '⚠️ تنبيه: خدمات عامة' : '⚠️ Alert: Public Services',
          message: lang === 'ar'
            ? `يوجد تنبيه على بعد ${distance} متر أمامك`
            : `Alert ${distance} meters ahead`,
        };
      case 5: // Other
        return {
          title: lang === 'ar' ? '⚠️ تنبيه' : '⚠️ Alert',
          message: lang === 'ar'
            ? `يوجد تنبيه على بعد ${distance} متر أمامك`
            : `Alert ${distance} meters ahead`,
        };
      default:
        return {
          title: lang === 'ar' ? '⚠️ تحذير' : '⚠️ Warning',
          message: lang === 'ar'
            ? `يوجد تنبيه على بعد ${distance} متر أمامك`
            : `Alert ${distance} meters ahead`,
        };
    }
  }

  /**
   * Play voice warning
   */
  private async playVoiceWarning(categoryId: number, distance: number) {
    console.log('🔊 playVoiceWarning called:', { categoryId, distance });
    console.log('🔊 Sound enabled:', this.alertSettings.soundEnabled);
    console.log('🔊 Volume:', this.alertSettings.appVolume);
    
    if (!this.alertSettings.soundEnabled) {
      console.log('🔇 Sound is disabled, skipping voice warning');
      return;
    }

    const lang = this.alertSettings.language;
    console.log('🔊 Language:', lang);
    let message = '';

    // Category IDs from backend:
    // 1 = Speed Camera (كاميرا مراقبة)
    // 2 = Pothole (حفرة)
    // 3 = Accident (حادث)
    switch (categoryId) {
      case 1: // Speed Camera
        message = lang === 'ar'
          ? `تنبيه! كاشف سرعة على بعد ${distance} متر`
          : `Alert! Speed camera ahead at ${distance} meters`;
        break;
      case 2: // Pothole
        message = lang === 'ar'
          ? `تحذير! حفرة في الطريق على بعد ${distance} متر`
          : `Warning! Pothole ahead at ${distance} meters`;
        break;
      case 3: // Accident
        message = lang === 'ar'
          ? `تحذير! حادث مروري على بعد ${distance} متر`
          : `Warning! Traffic accident ahead at ${distance} meters`;
        break;
      case 4: // Public Services
        message = lang === 'ar'
          ? `تنبيه على بعد ${distance} متر`
          : `Alert ${distance} meters ahead`;
        break;
      case 5: // Other
        message = lang === 'ar'
          ? `تنبيه على بعد ${distance} متر`
          : `Alert ${distance} meters ahead`;
        break;
      default:
        console.log('⚠️ Unknown category, using generic message');
        message = lang === 'ar'
          ? `تنبيه على بعد ${distance} متر`
          : `Alert ${distance} meters ahead`;
    }

    console.log('🔊 About to speak message:', message);
    console.log('🔊 Language setting:', lang);
    
    try {
      // Initialize audio if not already done
      await this.initializeAudio();

      // Play alert beep sound first (works on all devices)
      try {
        const { sound: alertSound } = await Audio.Sound.createAsync(
          require('../assets/sounds/alert.mp3'),
          { shouldPlay: true, volume: this.alertSettings.appVolume }
        );
        console.log('🔊 Alert beep sound played');
        
        // Unload sound after a delay
        setTimeout(() => {
          alertSound.unloadAsync().catch(() => {});
        }, 2000);
      } catch (soundError) {
        console.warn('⚠️ Failed to play alert sound:', soundError);
      }

      // Check if Speech is available
      const isSpeaking = await Speech.isSpeakingAsync();
      console.log('🔊 Is currently speaking:', isSpeaking);
      
      if (isSpeaking) {
        console.log('🔊 Stopping current speech before new one');
        await Speech.stop();
      }
      
      // Small delay to let the beep play first
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Get available voices and find the best one for the language
      const voices = await Speech.getAvailableVoicesAsync();
      console.log('🔊 Available voices count:', voices.length);
      
      // Find a voice for the target language
      const targetLangCode = lang === 'ar' ? 'ar' : 'en';
      const matchingVoices = voices.filter(v => 
        v.language.toLowerCase().startsWith(targetLangCode)
      );
      console.log(`🔊 Found ${matchingVoices.length} voices for ${targetLangCode}`);
      
      // Prefer specific voice identifiers if available
      let selectedVoice = matchingVoices.find(v => 
        lang === 'ar' 
          ? v.identifier?.includes('ar-SA') || v.identifier?.includes('ar_SA')
          : v.identifier?.includes('en-US') || v.identifier?.includes('en_US')
      ) || matchingVoices[0];
      
      const speechOptions: Speech.SpeechOptions = {
        language: lang === 'ar' ? 'ar-SA' : 'en-US',
        rate: lang === 'ar' ? 0.85 : 0.9, // Slightly slower for Arabic
        pitch: 1,
        volume: this.alertSettings.appVolume,
        onStart: () => console.log('🔊 Speech started'),
        onDone: () => console.log('🔊 Speech completed'),
        onStopped: () => console.log('🔊 Speech stopped'),
        onError: (error) => console.error('🔊 Speech error callback:', error),
      };
      
      // Use selected voice if found
      if (selectedVoice) {
        console.log('🔊 Using voice:', selectedVoice.identifier, selectedVoice.name);
        speechOptions.voice = selectedVoice.identifier;
      }
      
      console.log('🔊 Starting Speech.speak with options:', JSON.stringify(speechOptions));
      Speech.speak(message, speechOptions);
      console.log('🔊 Speech.speak call initiated');
    } catch (error) {
      console.error('❌ Failed to play voice warning:', error);
      console.error('❌ Error details:', JSON.stringify(error));
    }
  }

  /**
   * Show alert screen
   */
  private async showAlert(report: Report, distance: number) {
    if (this.isAlertShowing) return;
    this.isAlertShowing = true;
    
    try {
    const alertData = this.getAlertMessage(report.category_id, distance);
    
    console.log(`🚨 Alert: ${alertData.title} - ${distance}m ahead`);
    
    // Play voice warning
    await this.playVoiceWarning(report.category_id, distance);
    
    // Navigate to alert screen with parameters (only if app is in foreground)
    try {
      router.push({
        pathname: '/alert-screen',
        params: {
          reportId: report.id.toString(),
          distance: distance.toString(),
          categoryId: report.category_id.toString(),
        },
      });
    } catch (navError) {
      console.warn('Could not navigate to alert screen:', navError);
    }
    } finally {
      // Allow next alert after 5 seconds
      setTimeout(() => {
        this.isAlertShowing = false;
      }, 5000);
    }
  }

  /**
   * Start monitoring location
   */
  async startMonitoring(): Promise<boolean> {
    try {
      if (this.isMonitoring) {
        console.log('Location monitoring already active');
        return true;
      }

      // Initialize audio for background playback
      await this.initializeAudio();

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Location permissions not granted');
        return false;
      }

      // Start foreground location tracking
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Update every 10 meters
          timeInterval: 5000, // Update every 5 seconds
        },
        (location) => {
          this.currentLocation = location;
          this.checkProximityToReports(location).catch(err => 
            console.error('Proximity check failed:', err)
          );
        }
      );

      // Start background location tracking
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 20,
        timeInterval: 10000,
        foregroundService: {
          notificationTitle: 'كاشف - مراقبة الطريق',
          notificationBody: 'جاري مراقبة الطريق للكشف عن الحفر',
          notificationColor: '#F4B400',
        },
      });

      this.isMonitoring = true;
      console.log('Location monitoring started');
      return true;
    } catch (error) {
      console.error('Failed to start location monitoring:', error);
      return false;
    }
  }

  /**
   * Stop monitoring location
   */
  async stopMonitoring() {
    try {
      if (!this.isMonitoring) {
        return;
      }

      const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
      if (isTaskDefined) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      this.isMonitoring = false;
      this.alertedReportIds.clear();
      console.log('Location monitoring stopped');
    } catch (error) {
      console.error('Failed to stop location monitoring:', error);
    }
  }

  /**
   * Get current location
   */
  getCurrentLocation(): Location.LocationObject | null {
    return this.currentLocation;
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Get nearby reports
   */
  getNearbyReports(): Report[] {
    return this.nearbyReports;
  }
}

// Define background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];

    if (location) {
      // Check proximity in background
      console.log('📍 Background location update:', location.coords);
      await locationMonitoringService.checkProximityToReports(location);
    }
  }
});

export const locationMonitoringService = new LocationMonitoringService();
export default locationMonitoringService;
