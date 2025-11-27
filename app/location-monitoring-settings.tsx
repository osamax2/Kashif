import locationMonitoringService from '@/services/location-monitoring';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View
} from 'react-native';

const BLUE = '#0D2B66';
const YELLOW = '#F4B400';
const WHITE = '#FFFFFF';
const LIGHT_CARD = 'rgba(255,255,255,0.09)';

export default function LocationMonitoringSettings() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [nearbyReports, setNearbyReports] = useState<any[]>([]);

  useEffect(() => {
    // Check if monitoring is already active
    setIsMonitoring(locationMonitoringService.isActive());

    // Update nearby reports periodically
    const interval = setInterval(() => {
      if (locationMonitoringService.isActive()) {
        setNearbyReports(locationMonitoringService.getNearbyReports());
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleToggleMonitoring = async () => {
    if (isMonitoring) {
      // Stop monitoring
      await locationMonitoringService.stopMonitoring();
      setIsMonitoring(false);
      setNearbyReports([]);
    } else {
      // Start monitoring
      const success = await locationMonitoringService.startMonitoring();
      
      if (success) {
        setIsMonitoring(true);
        Alert.alert(
          'تم التفعيل',
          'سيتم تنبيهك عند اقترابك من حفر على بعد 200 متر',
          [{ text: 'حسناً' }]
        );
      } else {
        Alert.alert(
          'خطأ',
          'فشل تفعيل مراقبة الموقع. تأكد من منح الأذونات اللازمة.',
          [{ text: 'حسناً' }]
        );
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header Card */}
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="navigate-circle" size={48} color={YELLOW} />
        </View>
        
        <Text style={styles.title}>مراقبة الطريق التلقائية</Text>
        <Text style={styles.description}>
          احصل على تنبيهات عند اقترابك من حفر مُبلغ عنها على بعد 200 متر
        </Text>

        {/* Toggle Switch */}
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>
            {isMonitoring ? 'مفعّل' : 'غير مفعّل'}
          </Text>
          <Switch
            value={isMonitoring}
            onValueChange={handleToggleMonitoring}
            trackColor={{ false: '#767577', true: YELLOW }}
            thumbColor={isMonitoring ? WHITE : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
          />
        </View>
      </View>

      {/* Status Card */}
      {isMonitoring && (
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons name="location" size={24} color={YELLOW} />
            <Text style={styles.statusTitle}>الحالة</Text>
          </View>
          
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>جاري المراقبة</Text>
            <View style={styles.activeDot} />
          </View>

          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>الحفر القريبة</Text>
            <Text style={styles.statusValue}>{nearbyReports.length}</Text>
          </View>
        </View>
      )}

      {/* Nearby Reports */}
      {isMonitoring && nearbyReports.length > 0 && (
        <View style={styles.reportsCard}>
          <Text style={styles.reportsTitle}>حفر قريبة منك</Text>
          
          {nearbyReports.map((report, index) => (
            <View key={report.id} style={styles.reportItem}>
              <Ionicons name="warning" size={20} color="#EF4444" />
              <Text style={styles.reportText}>
                حفرة على بعد {Math.round(report.distance || 0)} متر
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* How it works */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>كيف يعمل؟</Text>
        
        <View style={styles.infoItem}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoNumber}>1</Text>
          </View>
          <Text style={styles.infoText}>
            نراقب موقعك في الخلفية أثناء القيادة
          </Text>
        </View>

        <View style={styles.infoItem}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoNumber}>2</Text>
          </View>
          <Text style={styles.infoText}>
            عند اقترابك من حفرة على بعد 200م، ستظهر شاشة تنبيه
          </Text>
        </View>

        <View style={styles.infoItem}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoNumber}>3</Text>
          </View>
          <Text style={styles.infoText}>
            يمكنك تأكيد وجود الحفرة والحصول على +5 نقاط
          </Text>
        </View>
      </View>

      {/* Privacy Note */}
      <View style={styles.privacyNote}>
        <Ionicons name="shield-checkmark" size={20} color={YELLOW} />
        <Text style={styles.privacyText}>
          موقعك آمن ولن يتم مشاركته إلا لتحسين خدمة التنبيهات
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BLUE,
  },

  contentContainer: {
    padding: 20,
  },

  card: {
    backgroundColor: LIGHT_CARD,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },

  iconContainer: {
    backgroundColor: 'rgba(244, 180, 0, 0.2)',
    borderRadius: 50,
    padding: 16,
    marginBottom: 16,
  },

  title: {
    fontSize: 24,
    fontFamily: 'Tajawal-Bold',
    color: WHITE,
    textAlign: 'center',
    marginBottom: 8,
  },

  description: {
    fontSize: 16,
    fontFamily: 'Tajawal-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },

  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },

  switchLabel: {
    fontSize: 18,
    fontFamily: 'Tajawal-Medium',
    color: WHITE,
  },

  statusCard: {
    backgroundColor: LIGHT_CARD,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },

  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },

  statusTitle: {
    fontSize: 20,
    fontFamily: 'Tajawal-Bold',
    color: WHITE,
  },

  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },

  statusLabel: {
    fontSize: 16,
    fontFamily: 'Tajawal-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },

  statusValue: {
    fontSize: 18,
    fontFamily: 'Tajawal-Bold',
    color: YELLOW,
  },

  activeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ADE80',
  },

  reportsCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },

  reportsTitle: {
    fontSize: 18,
    fontFamily: 'Tajawal-Bold',
    color: WHITE,
    marginBottom: 12,
  },

  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },

  reportText: {
    fontSize: 16,
    fontFamily: 'Tajawal-Regular',
    color: WHITE,
  },

  infoCard: {
    backgroundColor: LIGHT_CARD,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },

  infoTitle: {
    fontSize: 20,
    fontFamily: 'Tajawal-Bold',
    color: WHITE,
    marginBottom: 16,
  },

  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },

  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: YELLOW,
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoNumber: {
    fontSize: 16,
    fontFamily: 'Tajawal-Bold',
    color: BLUE,
  },

  infoText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Tajawal-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },

  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: 'rgba(244, 180, 0, 0.1)',
    borderRadius: 16,
    marginBottom: 20,
  },

  privacyText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Tajawal-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
});
