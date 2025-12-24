// services/offline-reports.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const PENDING_REPORTS_KEY = 'pending_reports';

export interface PendingReport {
    type: "pothole" | "accident" | "speed" | null;
    severity: "low" | "medium" | "high";
    address: string;
    notes: string;
    id: string;
    time: string;
    photoUri?: string;
    latitude?: number;
    longitude?: number;
    savedAt: number;
}

// Check if device is connected to the internet
export async function isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
}

// Save a report locally when offline
export async function savePendingReport(report: PendingReport): Promise<void> {
    try {
        const existingReports = await getPendingReports();
        existingReports.push(report);
        await AsyncStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify(existingReports));
        console.log('Report saved locally:', report.id);
    } catch (error) {
        console.error('Failed to save pending report:', error);
        throw error;
    }
}

// Get all pending reports
export async function getPendingReports(): Promise<PendingReport[]> {
    try {
        const data = await AsyncStorage.getItem(PENDING_REPORTS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Failed to get pending reports:', error);
        return [];
    }
}

// Remove a pending report after successful sync
export async function removePendingReport(reportId: string): Promise<void> {
    try {
        const existingReports = await getPendingReports();
        const updatedReports = existingReports.filter(r => r.id !== reportId);
        await AsyncStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify(updatedReports));
        console.log('Pending report removed:', reportId);
    } catch (error) {
        console.error('Failed to remove pending report:', error);
    }
}

// Clear all pending reports
export async function clearPendingReports(): Promise<void> {
    try {
        await AsyncStorage.removeItem(PENDING_REPORTS_KEY);
    } catch (error) {
        console.error('Failed to clear pending reports:', error);
    }
}

// Get count of pending reports
export async function getPendingReportsCount(): Promise<number> {
    const reports = await getPendingReports();
    return reports.length;
}

// Subscribe to network changes
export function subscribeToNetworkChanges(
    onOnline: () => void,
    onOffline: () => void
): () => void {
    const unsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected && state.isInternetReachable !== false) {
            onOnline();
        } else {
            onOffline();
        }
    });
    return unsubscribe;
}
