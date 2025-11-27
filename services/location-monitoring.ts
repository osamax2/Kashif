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
  private alertSettings: AlertSettings = {
    soundEnabled: true,
    warnPothole: true,
    warnAccident: true,
    warnSpeed: true,
    appVolume: 1.0,
    language: 'ar',
  };

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
        const distance = this.calculateDistance(
          latitude,
          longitude,
          parseFloat(report.latitude.toString()),
          parseFloat(report.longitude.toString())
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
    const { latitude, longitude } = location.coords;

    // Fetch nearby reports
    this.nearbyReports = await this.fetchNearbyReports(latitude, longitude);

    // Check distance to each report
    for (const report of this.nearbyReports) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        parseFloat(report.latitude.toString()),
        parseFloat(report.longitude.toString())
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
  }

  /**
   * Check if alert should be shown for this category
   */
  private shouldShowAlertForCategory(categoryId: number): boolean {
    // Category IDs: 1 = Pothole, 2 = Accident, 3 = Speed Camera
    switch (categoryId) {
      case 1:
        return this.alertSettings.warnPothole;
      case 2:
        return this.alertSettings.warnAccident;
      case 3:
        return this.alertSettings.warnSpeed;
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
      case 1: // Pothole
        return {
          title: lang === 'ar' ? '⚠️ تحذير: حفرة في الطريق' : '⚠️ Warning: Pothole Ahead',
          message: lang === 'ar' 
            ? `يوجد حفرة على بعد ${distance} متر أمامك. كن حذراً!`
            : `There is a pothole ${distance} meters ahead. Be careful!`,
        };
      case 2: // Accident
        return {
          title: lang === 'ar' ? '🚨 تحذير: حادث مروري' : '🚨 Warning: Traffic Accident',
          message: lang === 'ar'
            ? `يوجد حادث مروري على بعد ${distance} متر أمامك. خفف السرعة!`
            : `There is a traffic accident ${distance} meters ahead. Slow down!`,
        };
      case 3: // Speed Camera
        return {
          title: lang === 'ar' ? '📷 تنبيه: كاشف سرعة' : '📷 Alert: Speed Camera',
          message: lang === 'ar'
            ? `يوجد كاشف سرعة على بعد ${distance} متر أمامك. التزم بالسرعة المحددة!`
            : `There is a speed camera ${distance} meters ahead. Follow speed limit!`,
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
    if (!this.alertSettings.soundEnabled) return;

    const lang = this.alertSettings.language;
    let message = '';

    switch (categoryId) {
      case 1: // Pothole
        message = lang === 'ar'
          ? `تحذير! حفرة في الطريق على بعد ${distance} متر`
          : `Warning! Pothole ahead at ${distance} meters`;
        break;
      case 2: // Accident
        message = lang === 'ar'
          ? `تحذير! حادث مروري على بعد ${distance} متر`
          : `Warning! Traffic accident ahead at ${distance} meters`;
        break;
      case 3: // Speed Camera
        message = lang === 'ar'
          ? `تنبيه! كاشف سرعة على بعد ${distance} متر`
          : `Alert! Speed camera ahead at ${distance} meters`;
        break;
    }

    try {
      await Speech.speak(message, {
        language: lang === 'ar' ? 'ar-SA' : 'en-US',
        rate: 0.9,
        pitch: 1.0,
        volume: this.alertSettings.appVolume,
      });
    } catch (error) {
      console.error('Failed to play voice warning:', error);
    }
  }

  /**
   * Show alert screen
   */
  private async showAlert(report: Report, distance: number) {
    const alertData = this.getAlertMessage(report.category_id, distance);
    
    console.log(`🚨 Alert: ${alertData.title} - ${distance}m ahead`);
    
    // Play voice warning
    await this.playVoiceWarning(report.category_id, distance);
    
    // Navigate to alert screen with parameters
    router.push({
      pathname: '/alert-screen',
      params: {
        reportId: report.id.toString(),
        distance: distance.toString(),
        categoryId: report.category_id.toString(),
      },
    });
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
          this.checkProximityToReports(location);
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
