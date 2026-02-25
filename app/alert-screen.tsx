import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { gamificationAPI } from '@/services/api';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  I18nManager,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const { width, height } = Dimensions.get('window');
const DESTRUCTIVE_RED = '#DC2626';
const WHITE = '#FFFFFF';

export default function AlertScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { refreshUser } = useAuth();
  const { reportId, distance: initialDistance, categoryId } = useLocalSearchParams<{
    reportId: string;
    distance: string;
    categoryId: string;
  }>();

  const [distance, setDistance] = useState(parseInt(initialDistance || '200'));
  const [isConfirming, setIsConfirming] = useState(false);
  const categoryIdNum = parseInt(categoryId || '1');
  const pulseAnim = new Animated.Value(1);
  const scaleAnim = new Animated.Value(0.5);
  const rotateAnim = new Animated.Value(0);
  const roadAnim = new Animated.Value(0);

  // Get alert data based on category
  const getAlertData = () => {
    switch (categoryIdNum) {
      case 1: // Infrastructure / Pothole
        return {
          icon: 'warning' as const,
          iconColor: DESTRUCTIVE_RED,
          title: language === 'ar' ? '⚠️ تحذير!' : language === 'ku' ? '⚠️ Hişyarî!' : '⚠️ Warning!',
          subtitle: language === 'ar' ? 'حفرة في الأمام' : language === 'ku' ? 'Çalêk li pêşiya te heye' : 'Pothole Ahead',
        };
      case 2: // Environment
        return {
          icon: 'leaf' as const,
          iconColor: '#4CAF50',
          title: language === 'ar' ? '🌿 تنبيه!' : language === 'ku' ? '🌿 Hişyarî!' : '🌿 Alert!',
          subtitle: language === 'ar' ? 'خطر بيئي في الأمام' : language === 'ku' ? 'Metirsiya çevreyî li pêşiya te heye' : 'Environmental Hazard Ahead',
        };
      case 3: // Public Safety / Accident
        return {
          icon: 'alert-circle' as const,
          iconColor: DESTRUCTIVE_RED,
          title: language === 'ar' ? '🚨 تحذير!' : language === 'ku' ? '🚨 Hişyarî!' : '🚨 Warning!',
          subtitle: language === 'ar' ? 'حادث مروري في الأمام' : language === 'ku' ? 'Qezayek li pêşiya te heye' : 'Traffic Accident Ahead',
        };
      case 4: // Speed Camera
        return {
          icon: 'speedometer' as const,
          iconColor: DESTRUCTIVE_RED,
          title: language === 'ar' ? '📷 تنبيه!' : language === 'ku' ? '📷 Hişyarî!' : '📷 Alert!',
          subtitle: language === 'ar' ? 'كاشف سرعة في الأمام' : language === 'ku' ? 'Kameraya lezê li pêşiya te heye' : 'Speed Camera Ahead',
        };
      case 6: // Mines
        return {
          icon: 'warning' as const,
          iconColor: DESTRUCTIVE_RED,
          title: language === 'ar' ? '💣 تحذير!' : language === 'ku' ? '💣 Hişyarî!' : '💣 Warning!',
          subtitle: language === 'ar' ? 'منطقة ألغام في الأمام' : language === 'ku' ? 'Devera mînan li pêşiya te heye' : 'Mine Area Ahead',
        };
      default:
        return {
          icon: 'warning' as const,
          iconColor: DESTRUCTIVE_RED,
          title: language === 'ar' ? '⚠️ تحذير!' : language === 'ku' ? '⚠️ Hişyarî!' : '⚠️ Warning!',
          subtitle: language === 'ar' ? 'حفرة في الأمام' : language === 'ku' ? 'Çalêk li pêşiya te heye' : 'Pothole Ahead',
        };
    }
  };

  const alertData = getAlertData();

  useEffect(() => {
    // Initial scale animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();

    // Background pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Warning icon shake animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: -5,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 5,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -5,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
      ])
    ).start();

    // Road animation
    Animated.loop(
      Animated.timing(roadAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();

    // Simulate approaching pothole - decrease distance
    const distanceInterval = setInterval(() => {
      setDistance((prev) => {
        if (prev <= 0) {
          clearInterval(distanceInterval);
          return 0;
        }
        return prev - 5; // Decrease by 5m every 100ms
      });
    }, 100);

    // Vibration pattern: vibrate, pause, vibrate
    Vibration.vibrate([200, 100, 200]);

    // Play alert sound
    playAlertSound();

    return () => {
      clearInterval(distanceInterval);
      Vibration.cancel();
    };
  }, []);

  // Pre-generated Kurdish audio files by category
  const getKurdishAudioFile = () => {
    switch (categoryIdNum) {
      case 1: return require('../assets/sounds/ku/warning_pothole.mp3');
      case 2: return require('../assets/sounds/ku/warning_environment.mp3');
      case 3: return require('../assets/sounds/ku/warning_accident.mp3');
      case 4: return require('../assets/sounds/ku/warning_speed_camera.mp3');
      case 6: return require('../assets/sounds/ku/warning_mines.mp3');
      default: return require('../assets/sounds/ku/warning_generic.mp3');
    }
  };

  // Helper: play an Audio.Sound and wait until it finishes
  const playAndWait = (source: any, volume = 1.0): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        const { sound } = await Audio.Sound.createAsync(source, {
          shouldPlay: false,
          volume,
        });
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
            resolve();
          }
        });
        await sound.playAsync();
      } catch (err) {
        reject(err);
      }
    });
  };

  const playAlertSound = async () => {
    console.log('🔊 playAlertSound called');
    try {
      // Configure audio mode for playback
      console.log('🔊 Setting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      console.log('🔊 Audio mode set successfully');

      // Step 1: Play alert beep sound and WAIT for it to finish
      console.log('🔊 Playing alert beep...');
      await playAndWait(require('../assets/sounds/alert.wav'));
      console.log('🔊 Alert beep finished');

      // Small gap between beep and voice
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 2: Play voice warning AFTER beep is done
      if (language === 'ku') {
        // Play pre-generated Kurdish audio file sequentially
        console.log('🔊 Playing Kurdish voice warning...');
        try {
          await playAndWait(getKurdishAudioFile());
          console.log('🔊 Kurdish voice warning finished');
        } catch (kuError) {
          console.warn('⚠️ Kurdish audio failed:', kuError);
        }
      } else {
        // Arabic or English TTS
        const ttsMessage = language === 'ar'
          ? 'تحذير! خطر في الأمام'
          : 'Warning! Danger ahead';
        await Speech.speak(ttsMessage, {
          language: language === 'ar' ? 'ar-SA' : 'en-US',
          rate: 0.9,
          pitch: 1,
        });
      }
    } catch (error) {
      console.warn('⚠️ Alert sound failed, using TTS fallback:', error);
      // Fallback: play voice warning directly
      try {
        if (language === 'ku') {
          await playAndWait(getKurdishAudioFile());
        } else {
          const ttsMessage = language === 'ar'
            ? 'تحذير! خطر في الأمام'
            : 'Warning! Danger ahead';
          await Speech.speak(ttsMessage, {
            language: language === 'ar' ? 'ar-SA' : 'en-US',
            rate: 0.9,
            pitch: 1,
          });
        }
      } catch (ttsError) {
        console.error('❌ TTS fallback also failed:', ttsError);
      }
    }
  };

  const handleDismiss = () => {
    router.back();
  };

  const handleConfirm = async () => {
    if (!reportId || isConfirming) return;

    try {
      setIsConfirming(true);

      // Call API to confirm report and award 20 points
      const result = await gamificationAPI.confirmReport(parseInt(reportId));

      console.log('✅ Report confirmed:', result.message, `+${result.points} points`);

      // Refresh user data to update points
      await refreshUser();

      // Show success message briefly before closing
      // You could add a success animation here if desired
      setTimeout(() => {
        router.back();
      }, 500);

    } catch (error: any) {
      console.error('❌ Failed to confirm report:', error);

      // Show error message
      const errorMessage = error?.response?.data?.detail ||
          (language === 'ar' ? 'فشل تأكيد البلاغ' : language === 'ku' ? 'Piştrastkirina raporê têk çû' : 'Failed to confirm report');

      alert(errorMessage);
      setIsConfirming(false);
    }
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [-5, 5],
    outputRange: ['-5deg', '5deg'],
  });

  const roadTranslateY = roadAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100],
  });

  return (
    <View style={styles.container}>
      {/* Pulsing Background Overlay */}
      <Animated.View
        style={[
          styles.pulsingBackground,
          {
            opacity: pulseAnim.interpolate({
              inputRange: [1, 1.1],
              outputRange: [0.8, 1],
            }),
          },
        ]}
      />

      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
        <View style={styles.closeButtonInner}>
          <Ionicons name="close" size={24} color={WHITE} />
        </View>
      </TouchableOpacity>

      {/* Main Content */}
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Warning Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ rotate: rotateInterpolate }],
            },
          ]}
        >
          <View style={styles.iconCircle}>
            <Ionicons name={alertData.icon} size={96} color={alertData.iconColor} />
          </View>
        </Animated.View>

        {/* Alert Text */}
        <Text style={styles.mainTitle}>{alertData.title}</Text>
        <Text style={styles.subtitle}>{alertData.subtitle}</Text>

          {/* Distance Indicator */}
          <Animated.View
              style={[
                styles.distanceCard,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
          >
            <View style={styles.distanceContent}>
              <Ionicons name="navigate" size={24} color={WHITE} style={styles.navigationIcon} />
              <Text style={styles.distanceText}>{distance}{language === 'ar' ? 'م' : language === 'ku' ? 'm' : 'm'}</Text>
            </View>
            <Text style={styles.warningText}>
              {language === 'ar' ? 'إبطئ السرعة وكن حذراً' : language === 'ku' ? 'Lezê kêm bike û hişyar be' : 'Slow down and be careful'}
            </Text>
          </Animated.View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
                activeOpacity={0.8}
                disabled={isConfirming}
            >
              {isConfirming ? (
                  <ActivityIndicator size="small" color={DESTRUCTIVE_RED} />
              ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={DESTRUCTIVE_RED} />
                    <Text style={styles.confirmButtonText}>
                      {language === 'ar' ? 'شكراً للتأكيد (+20 نقطة)' : language === 'ku' ? 'Spas ji bo piştrastkirinê (+20 xal)' : 'Thanks for confirming (+20 points)'}
                    </Text>
                  </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.dismissButton}
                onPress={handleDismiss}
                activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color={WHITE} style={{ marginRight: 8 }} />
              <Text style={styles.dismissButtonText}>
                {language === 'ar' ? 'تجاهل' : language === 'ku' ? 'Guh nedê' : 'Ignore'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Road Visualization at Bottom */}
        <View style={styles.roadContainer}>
          <Animated.View
              style={[
                styles.roadLines,
                {
                  transform: [{ translateY: roadTranslateY }],
                },
              ]}
          >
            {[0, 1, 2, 3, 4].map((i) => (
                <View key={i} style={styles.roadLine} />
            ))}
          </Animated.View>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESTRUCTIVE_RED,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  pulsingBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: DESTRUCTIVE_RED,
  },

  closeButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
  },

  closeButtonInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
    padding: 12,
  },

  content: {
    alignItems: 'center',
    zIndex: 1,
  },

  iconContainer: {
    marginBottom: 24,
  },

  iconCircle: {
    backgroundColor: WHITE,
    borderRadius: 100,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  mainTitle: {
    fontSize: 40,
    color: WHITE,
    marginBottom: 16,
    fontFamily: 'Tajawal-Bold',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 28,
    color: WHITE,
    marginBottom: 32,
    fontFamily: 'Tajawal-Medium',
    textAlign: 'center',
  },

  distanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    width: width - 48,
    alignItems: 'center',
  },

  distanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  navigationIcon: {
    marginLeft: 12,
  },

  distanceText: {
    fontSize: 56,
    color: WHITE,
    fontFamily: 'Tajawal-Bold',
  },

  warningText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Tajawal-Regular',
    textAlign: 'center',
  },

  buttonContainer: {
    width: width - 48,
    gap: 12,
  },

  confirmButton: {
    backgroundColor: WHITE,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },

  confirmButtonText: {
    fontSize: 18,
    color: DESTRUCTIVE_RED,
    fontFamily: 'Tajawal-Bold',
    marginLeft: 8,
  },

  dismissButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dismissButtonText: {
    fontSize: 18,
    color: WHITE,
    fontFamily: 'Tajawal-Medium',
  },

  roadContainer: {
    position: 'absolute',
    bottom: 0,
    left: width / 2 - 32,
    width: 64,
    height: 150,
    overflow: 'hidden',
    opacity: 0.2,
  },

  roadLines: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
  },

  roadLine: {
    width: 4,
    height: 60,
    backgroundColor: WHITE,
    marginBottom: 32,
  },
});
