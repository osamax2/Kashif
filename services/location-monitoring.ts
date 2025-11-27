import * as Location from 'expo-location';
import { router } from 'expo-router';
import * as TaskManager from 'expo-task-manager';
import api from './api';

const LOCATION_TASK_NAME = 'background-location-task';
const ALERT_DISTANCE_THRESHOLD = 200; // 200 meters

interface Report {
  id: number;
  latitude: number;
  longitude: number;
  status: string;
  type: string;
}

class LocationMonitoringService {
  private isMonitoring = false;
  private currentLocation: Location.LocationObject | null = null;
  private nearbyReports: Report[] = [];
  private alertedReportIds: Set<number> = new Set();

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
      const response = await api.get<Report[]>('/api/reporting/nearby', {
        params: {
          latitude,
          longitude,
          radius: 1000, // 1km radius
        },
      });

      return response.data.filter(
        (report) => report.status === 'pending' || report.status === 'in_progress'
      );
    } catch (error) {
      console.error('Failed to fetch nearby reports:', error);
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
        report.latitude,
        report.longitude
      );

      // If within alert threshold and not already alerted
      if (distance <= ALERT_DISTANCE_THRESHOLD && !this.alertedReportIds.has(report.id)) {
        this.alertedReportIds.add(report.id);
        this.showAlert(report, Math.round(distance));
      }

      // Reset alert if user moves away
      if (distance > ALERT_DISTANCE_THRESHOLD + 100) {
        this.alertedReportIds.delete(report.id);
      }
    }
  }

  /**
   * Show alert screen
   */
  private showAlert(report: Report, distance: number) {
    console.log(`Alert: Pothole detected ${distance}m ahead!`);
    
    // Navigate to alert screen
    router.push({
      pathname: '/alert-screen',
      params: {
        reportId: report.id,
        distance: distance.toString(),
        type: report.type,
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
      await locationMonitoringService.checkProximityToReports(location);
    }
  }
});

export const locationMonitoringService = new LocationMonitoringService();
export default locationMonitoringService;
