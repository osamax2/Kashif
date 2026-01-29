// components/OnboardingTutorial.tsx
import { useLanguage } from "@/contexts/LanguageContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const ONBOARDING_KEY = "@kashif_onboarding_completed";

interface TutorialStep {
    id: string;
    icon: string;
    titleAr: string;
    titleEn: string;
    descriptionAr: string;
    descriptionEn: string;
    color: string;
}

const tutorialSteps: TutorialStep[] = [
    {
        id: "welcome",
        icon: "🗺️",
        titleAr: "مرحباً بك في كاشف!",
        titleEn: "Welcome to Kashif!",
        descriptionAr: "تطبيقك الذكي للإبلاغ عن مخاطر الطريق وتحذيرك منها أثناء القيادة",
        descriptionEn: "Your smart app for reporting road hazards and warning you while driving",
        color: "#0D2B66",
    },
    {
        id: "map",
        icon: "📍",
        titleAr: "الخريطة التفاعلية",
        titleEn: "Interactive Map",
        descriptionAr: "تصفح الخريطة لرؤية جميع البلاغات النشطة في منطقتك. النقاط الملونة تمثل أنواع مختلفة من المخاطر",
        descriptionEn: "Browse the map to see all active reports in your area. Colored dots represent different types of hazards",
        color: "#1A3B7A",
    },
    {
        id: "report",
        icon: "➕",
        titleAr: "إضافة بلاغ",
        titleEn: "Add Report",
        descriptionAr: "اضغط على زر + لإضافة بلاغ جديد. اختر نوع المخاطرة: حفرة 🕳️، حادث 🚗، أو كاشف سرعة 📷",
        descriptionEn: "Tap the + button to add a new report. Choose hazard type: Pothole 🕳️, Accident 🚗, or Speed Camera 📷",
        color: "#F4B400",
    },
    {
        id: "longpress",
        icon: "📌",
        titleAr: "اختيار الموقع يدوياً",
        titleEn: "Manual Location Selection",
        descriptionAr: "اضغط مطولاً على أي مكان في الخريطة لوضع علامة واختيار موقع البلاغ يدوياً",
        descriptionEn: "Long press anywhere on the map to place a pin and manually select the report location",
        color: "#FF9500",
    },
    {
        id: "photo",
        icon: "📷",
        titleAr: "التقاط صور بالذكاء الاصطناعي",
        titleEn: "AI Photo Analysis",
        descriptionAr: "التقط صورة للحفرة وسيقوم الذكاء الاصطناعي بتحليلها وتحديد حجمها وخطورتها تلقائياً",
        descriptionEn: "Take a photo of the pothole and AI will analyze it, automatically detecting its size and severity",
        color: "#5856D6",
    },
    {
        id: "warnings",
        icon: "🔊",
        titleAr: "التنبيهات الصوتية",
        titleEn: "Voice Warnings",
        descriptionAr: "اضغط على زر 🔔 لتفعيل التنبيهات الصوتية. ستحذرك عند الاقتراب من أي خطر على الطريق",
        descriptionEn: "Tap the 🔔 button to enable voice warnings. You'll be alerted when approaching any road hazard",
        color: "#34C759",
    },
    {
        id: "filter",
        icon: "🔍",
        titleAr: "تصفية البلاغات",
        titleEn: "Filter Reports",
        descriptionAr: "استخدم شريط الفئات في الأعلى لتصفية البلاغات حسب النوع: الكل، حفر، حوادث، أو كاشفات سرعة",
        descriptionEn: "Use the category bar at the top to filter reports by type: All, Potholes, Accidents, or Speed Cameras",
        color: "#FF2D55",
    },
    {
        id: "search",
        icon: "🔎",
        titleAr: "البحث عن موقع",
        titleEn: "Search Location",
        descriptionAr: "استخدم شريط البحث للعثور على أي موقع في سوريا والانتقال إليه مباشرة على الخريطة",
        descriptionEn: "Use the search bar to find any location in Syria and navigate to it directly on the map",
        color: "#007AFF",
    },
    {
        id: "points",
        icon: "⭐",
        titleAr: "نظام النقاط والمكافآت",
        titleEn: "Points & Rewards",
        descriptionAr: "اكسب نقاط عند إضافة بلاغات مؤكدة! استبدل نقاطك بكوبونات وعروض حصرية",
        descriptionEn: "Earn points for confirmed reports! Redeem your points for coupons and exclusive offers",
        color: "#FFD700",
    },
    {
        id: "ready",
        icon: "🚀",
        titleAr: "أنت جاهز!",
        titleEn: "You're Ready!",
        descriptionAr: "ابدأ الآن بالإبلاغ عن مخاطر الطريق وساعد في جعل القيادة أكثر أماناً للجميع",
        descriptionEn: "Start now by reporting road hazards and help make driving safer for everyone",
        color: "#0D2B66",
    },
];

interface Props {
    readonly onComplete: () => void;
}

export default function OnboardingTutorial({ onComplete }: Props) {
    const { language } = useLanguage();
    const isRTL = language === 'ar';
    
    const [currentStep, setCurrentStep] = useState(0);
    const [visible, setVisible] = useState(true);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    const step = tutorialSteps[currentStep];
    const isLastStep = currentStep === tutorialSteps.length - 1;
    const isFirstStep = currentStep === 0;

    const animateTransition = (direction: 'next' | 'prev', callback: () => void) => {
        const toValue = direction === 'next' ? -SCREEN_WIDTH : SCREEN_WIDTH;
        
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: toValue,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            callback();
            slideAnim.setValue(direction === 'next' ? SCREEN_WIDTH : -SCREEN_WIDTH);
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 8,
                }),
            ]).start();
        });
    };

    const handleNext = () => {
        if (isLastStep) {
            handleComplete();
        } else {
            animateTransition('next', () => setCurrentStep(prev => prev + 1));
        }
    };

    const handlePrev = () => {
        if (!isFirstStep) {
            animateTransition('prev', () => setCurrentStep(prev => prev - 1));
        }
    };

    const handleSkip = () => {
        handleComplete();
    };

    const handleComplete = async () => {
        try {
            await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        } catch (e) {
            console.warn('Failed to save onboarding state:', e);
        }
        setVisible(false);
        onComplete();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={false}
            statusBarTranslucent
        >
            <View style={[styles.container, { backgroundColor: step.color }]}>
                {/* Skip Button */}
                {!isLastStep && (
                    <Pressable style={styles.skipButton} onPress={handleSkip}>
                        <Text style={styles.skipText}>
                            {isRTL ? 'تخطي' : 'Skip'}
                        </Text>
                    </Pressable>
                )}

                {/* Content */}
                <Animated.View 
                    style={[
                        styles.content,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateX: slideAnim }],
                        },
                    ]}
                >
                    {/* Icon */}
                    <View style={styles.iconContainer}>
                        <Text style={styles.icon}>{step.icon}</Text>
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, isRTL && styles.rtlText]}>
                        {isRTL ? step.titleAr : step.titleEn}
                    </Text>

                    {/* Description */}
                    <Text style={[styles.description, isRTL && styles.rtlText]}>
                        {isRTL ? step.descriptionAr : step.descriptionEn}
                    </Text>
                </Animated.View>

                {/* Progress Dots */}
                <View style={styles.dotsContainer}>
                    {tutorialSteps.map((s, index) => (
                        <View
                            key={s.id}
                            style={[
                                styles.dot,
                                index === currentStep && styles.dotActive,
                            ]}
                        />
                    ))}
                </View>

                {/* Navigation Buttons */}
                <View style={[styles.buttonsContainer, isRTL && styles.buttonsContainerRTL]}>
                    {/* Back Button */}
                    {!isFirstStep ? (
                        <Pressable style={styles.backButton} onPress={handlePrev}>
                            <Text style={styles.backButtonText}>
                                {isRTL ? '→' : '←'}
                            </Text>
                        </Pressable>
                    ) : (
                        <View style={styles.backButtonPlaceholder} />
                    )}

                    {/* Next/Start Button */}
                    <Pressable 
                        style={[styles.nextButton, isLastStep && styles.startButton]} 
                        onPress={handleNext}
                    >
                        <Text style={styles.nextButtonText}>
                            {isLastStep 
                                ? (isRTL ? 'ابدأ الآن' : 'Start Now')
                                : (isRTL ? 'التالي' : 'Next')
                            }
                        </Text>
                        {!isLastStep && (
                            <Text style={styles.nextButtonArrow}>
                                {isRTL ? '←' : '→'}
                            </Text>
                        )}
                    </Pressable>
                </View>

                {/* Step Counter */}
                <Text style={styles.stepCounter}>
                    {currentStep + 1} / {tutorialSteps.length}
                </Text>
            </View>
        </Modal>
    );
}

// Check if onboarding should be shown
export async function shouldShowOnboarding(): Promise<boolean> {
    try {
        const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
        return completed !== 'true';
    } catch (e) {
        return true; // Show onboarding if we can't read the state
    }
}

// Reset onboarding (for testing)
export async function resetOnboarding(): Promise<void> {
    try {
        await AsyncStorage.removeItem(ONBOARDING_KEY);
    } catch (e) {
        console.warn('Failed to reset onboarding:', e);
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: 24,
    },
    skipButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        zIndex: 10,
    },
    skipText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 16,
        fontFamily: 'Tajawal-Medium',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    icon: {
        fontSize: 70,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Tajawal-Bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 20,
    },
    description: {
        fontSize: 17,
        fontFamily: 'Tajawal-Regular',
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        lineHeight: 28,
        paddingHorizontal: 10,
    },
    rtlText: {
        writingDirection: 'rtl',
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    dotActive: {
        width: 24,
        backgroundColor: '#fff',
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    buttonsContainerRTL: {
        flexDirection: 'row-reverse',
    },
    backButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonPlaceholder: {
        width: 50,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 24,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 30,
        gap: 8,
    },
    startButton: {
        backgroundColor: '#F4B400',
        paddingHorizontal: 40,
    },
    nextButtonText: {
        color: '#0D2B66',
        fontSize: 18,
        fontFamily: 'Tajawal-Bold',
    },
    nextButtonArrow: {
        color: '#0D2B66',
        fontSize: 20,
    },
    stepCounter: {
        textAlign: 'center',
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        marginTop: 20,
        fontFamily: 'Tajawal-Regular',
    },
});
