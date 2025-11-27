import { useLanguage } from '@/contexts/LanguageContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
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
  const [distance, setDistance] = useState(200);
  const pulseAnim = new Animated.Value(1);
  const scaleAnim = new Animated.Value(0.5);
  const rotateAnim = new Animated.Value(0);
  const roadAnim = new Animated.Value(0);

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

  const playAlertSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/alert.mp3'), // You need to add this file
        { shouldPlay: true, volume: 1.0 },
        null,
        false
      );
      await sound.playAsync();
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  };

  const handleDismiss = () => {
    router.back();
  };

  const handleConfirm = () => {
    // TODO: Add 5 points to user
    // TODO: Confirm pothole exists
    router.back();
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
            <Ionicons name="warning" size={96} color={DESTRUCTIVE_RED} />
          </View>
        </Animated.View>

        {/* Alert Text */}
        <Text style={styles.mainTitle}>⚠️ تحذير!</Text>
        <Text style={styles.subtitle}>حفرة في الأمام</Text>

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
            <Text style={styles.distanceText}>{distance}م</Text>
          </View>
          <Text style={styles.warningText}>إبطئ السرعة وكن حذراً</Text>
        </Animated.View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={20} color={DESTRUCTIVE_RED} />
            <Text style={styles.confirmButtonText}>شكراً للتأكيد (+5 نقاط)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissButtonText}>تجاهل</Text>
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
    backgroundColor: 'transparent',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
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
