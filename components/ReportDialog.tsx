// components/ReportDialog.tsx ✅ wie index.tsx: Arabisch = LTR, Englisch = RTL (effectiveRTL = !isRTL)

import { useLanguage } from "@/contexts/LanguageContext";
import { isOnline, savePendingReport } from "@/services/offline-reports";
import * as FileSystem from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";

const BLUE = "#0D2B66";
const YELLOW = "#F4B400";

type ReportType = "pothole" | "accident" | "speed" | null;

interface Props {
  visible: boolean;
  type: ReportType;
  address?: string;
  onClose: () => void;
  onSubmit?: (payload: {
    type: ReportType;
    severity: "low" | "medium" | "high";
    address: string;
    notes: string;
    id: string;
    time: string;
    photoUri?: string;
    latitude?: number;
    longitude?: number;
  }) => void;
}

export default function ReportDialog({
  visible,
  type,
  address: initialAddress,
  onClose,
  onSubmit,
}: Props) {
  const { t, isRTL } = useLanguage();

  // ✅ WIE index.tsx: Arabisch = LTR | Englisch = RTL
  const effectiveRTL = !isRTL;

  const [severity, setSeverity] = useState<"low" | "medium" | "high">("low");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [successId, setSuccessId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [photoMenu, setPhotoMenu] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [showPlacesInput, setShowPlacesInput] = useState(false);
  const [checkingImage, setCheckingImage] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  // ──── Image Quality Check ────
  const MIN_WIDTH = 640;
  const MIN_HEIGHT = 480;
  const MIN_FILE_SIZE = 50 * 1024; // 50 KB

  async function validateImageQuality(uri: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Check file size
      const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
      if (fileInfo.exists && (fileInfo as any).size < MIN_FILE_SIZE) {
        return { valid: false, reason: t("imageQuality.tooSmall") };
      }

      // Check resolution by manipulating to get dimensions
      const manipResult = await manipulateAsync(uri, [], { format: SaveFormat.JPEG });
      
      // Get image dimensions via Image.getSize
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        Image.getSize(
          manipResult.uri,
          (width, height) => resolve({ width, height }),
          (error) => reject(error)
        );
      });

      if (dimensions.width < MIN_WIDTH || dimensions.height < MIN_HEIGHT) {
        return { valid: false, reason: t("imageQuality.tooSmall") };
      }

      return { valid: true };
    } catch (e) {
      console.log("Image quality check error:", e);
      // Don't block on validation failure — allow the image
      return { valid: true };
    }
  }

  async function processImage(uri: string): Promise<boolean> {
    setCheckingImage(true);
    try {
      const result = await validateImageQuality(uri);
      if (!result.valid) {
        Alert.alert(
          t("imageQuality.validationFailed"),
          result.reason || t("imageQuality.tooSmall")
        );
        return false;
      }
      return true;
    } finally {
      setCheckingImage(false);
    }
  }

  async function pickImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.7,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        const isValid = await processImage(uri);
        if (isValid) {
          setPendingImage(uri);
          setPhotoMenu(false);
        }
      }
    } catch (e) {
      console.log("Image pick error:", e);
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      alert(t("reportDialog.cameraPermission"));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const isValid = await processImage(uri);
      if (isValid) {
        setPendingImage(uri);
        setPhotoMenu(false);
      }
    }
  }

  useEffect(() => {
    if (visible) {
      setSuccessId(null);
      setAddress(initialAddress || t("reportDialog.locationAuto"));
      setSelectedPlace(null);
      setShowPlacesInput(false);
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible, initialAddress]);

  const handleSend = async () => {
    const id = Math.floor(1000 + Math.random() * 9000).toString();

    // Sprache bleibt nach "isRTL" (arabisch vs englisch)
    const time = new Date().toLocaleString(isRTL ? "ar-SY" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const finalAddress = selectedPlace
      ? selectedPlace.address
      : initialAddress || t("reportDialog.locationAuto");

    const reportPayload = {
      type,
      severity,
      address: finalAddress,
      notes,
      id,
      time,
      photoUri: selectedImage || undefined,
      ...(selectedPlace && {
        latitude: selectedPlace.lat,
        longitude: selectedPlace.lng,
      }),
    };

    const online = await isOnline();

    if (!online) {
      await savePendingReport({
        ...reportPayload,
        savedAt: Date.now(),
      });

      Alert.alert(
        isRTL ? "لا يوجد اتصال بالإنترنت" : "No Internet Connection",
        isRTL
          ? "تم حفظ البلاغ وسيتم إرساله تلقائياً عند الاتصال بالإنترنت"
          : "Report saved and will be sent automatically when connected to the internet",
        [{ text: isRTL ? "حسناً" : "OK" }]
      );

      setTimeout(() => {
        onClose();
        setSeverity("low");
        setNotes("");
        setAddress("");
        setSelectedImage(null);
      }, 500);
      return;
    }

    setSuccessId(id);

    if (onSubmit) {
      await onSubmit(reportPayload);
    }

    setTimeout(() => {
      onClose();
      setSeverity("low");
      setNotes("");
      setAddress("");
      setSelectedImage(null);
      setSuccessId(null);
    }, 2000);
  };

  const titleByType: Record<Exclude<ReportType, null>, string> = {
    pothole: t("reportDialog.titlePothole"),
    accident: t("reportDialog.titleAccident"),
    speed: t("reportDialog.titleSpeed"),
  };

  const title = type ? titleByType[type] : t("reportDialog.titleDefault");

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}
      >
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.card,
                {
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    },
                  ],
                  opacity: slideAnim,
                  maxHeight: "90%",
                },
              ]}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1 }}
              >
                {/* Header */}
                <View
                  style={[
                    styles.headerRow,
                    { flexDirection: effectiveRTL ? "row-reverse" : "row" },
                  ]}
                >
                  <Pressable onPress={onClose} hitSlop={10}>
                    <Text style={styles.backIcon}>
                      {effectiveRTL ? "↩︎" : "←"}
                    </Text>
                  </Pressable>

                  {/* Titel in der Mitte */}
                  <Text style={styles.title}>{title}</Text>

                  <Pressable onPress={() => setPhotoMenu(true)} hitSlop={10}>
                    <View style={styles.cameraBadge}>
                      <Text style={styles.cameraIcon}>📷</Text>
                      <View
                        style={[
                          styles.cameraPlus,
                          effectiveRTL ? { left: -2, right: undefined } : {},
                        ]}
                      >
                        <Text style={styles.cameraPlusText}>+</Text>
                      </View>
                    </View>
                  </Pressable>
                </View>

                {/* Bild Preview */}
                {selectedImage && (
                  <View style={{ alignItems: "center", marginTop: 10 }}>
                    <Image
                      source={{ uri: selectedImage }}
                      style={{ width: 120, height: 120, borderRadius: 16 }}
                    />
                  </View>
                )}

                {/* Level / Typ */}
                <View style={styles.sectionRow}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { textAlign: effectiveRTL ? "right" : "left" },
                    ]}
                  >
                    {type === "speed"
                      ? t("reportDialog.typeLabel")
                      : t("reportDialog.severityLabel")}
                  </Text>
                </View>

                {type === "speed" ? (
                  <View
                    style={[
                      styles.chipRow,
                      { flexDirection: effectiveRTL ? "row-reverse" : "row" },
                    ]}
                  >
                    <Chip
                      label={t("reportDialog.radarFixed")}
                      active={severity === "low"}
                      variant="radar"
                      onPress={() => setSeverity("low")}
                    />
                    <Chip
                      label={t("reportDialog.radarMobile")}
                      active={severity === "medium"}
                      variant="radar"
                      onPress={() => setSeverity("medium")}
                    />
                    <Chip
                      label={t("reportDialog.radarCamera")}
                      active={severity === "high"}
                      variant="radar"
                      onPress={() => setSeverity("high")}
                    />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.chipRow,
                      { flexDirection: effectiveRTL ? "row-reverse" : "row" },
                    ]}
                  >
                    <Chip
                      label={t("reportDialog.severityLow")}
                      active={severity === "low"}
                      color={YELLOW}
                      onPress={() => setSeverity("low")}
                    />
                    <Chip
                      label={t("reportDialog.severityMedium")}
                      active={severity === "medium"}
                      color="#FFA94D"
                      onPress={() => setSeverity("medium")}
                    />
                    <Chip
                      label={t("reportDialog.severityHigh")}
                      active={severity === "high"}
                      color="#FF6B6B"
                      onPress={() => setSeverity("high")}
                    />
                  </View>
                )}

                {/* Adresse */}
                <View style={styles.sectionRow}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { textAlign: effectiveRTL ? "right" : "left" },
                    ]}
                  >
                    {t("reportDialog.locationLabel")}
                  </Text>
                </View>

                {!showPlacesInput ? (
                  <Pressable
                    style={[
                      styles.addressRow,
                      { flexDirection: effectiveRTL ? "row-reverse" : "row" },
                    ]}
                    onPress={() => setShowPlacesInput(true)}
                  >
                    <Text
                      style={[
                        styles.addressInput,
                        { textAlign: effectiveRTL ? "right" : "left" },
                      ]}
                    >
                      {selectedPlace
                        ? selectedPlace.address
                        : initialAddress || t("reportDialog.locationAuto")}
                    </Text>
                    <Text
                      style={[
                        styles.pinIcon,
                        effectiveRTL ? { marginRight: 6, marginLeft: 0 } : {},
                      ]}
                    >
                      📍
                    </Text>
                  </Pressable>
                ) : (
                  <View style={styles.placesContainer}>
                    <GooglePlacesAutocomplete
                      placeholder={t("reportDialog.locationSearch")}
                      minLength={2}
                      listViewDisplayed="auto"
                      fetchDetails={true}
                      renderDescription={(row) => row.description}
                      onPress={(data, details = null) => {
                        if (details) {
                          setSelectedPlace({
                            lat: details.geometry.location.lat,
                            lng: details.geometry.location.lng,
                            address: data.description,
                          });
                          setAddress(data.description);
                          setShowPlacesInput(false);
                        }
                      }}
                      query={{
                        key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
                        language: isRTL ? "ar" : "en", // ✅ Sprache bleibt echte Sprache
                      }}
                      textInputProps={{
                        autoFocus: true,
                        returnKeyType: "search",
                      }}
                      styles={{
                        container: { flex: 0 },
                        textInputContainer: {
                          backgroundColor: "#F5F7FF",
                          borderRadius: 14,
                          paddingHorizontal: 10,
                        },
                        textInput: {
                          height: 40,
                          color: BLUE,
                          fontSize: 14,
                          fontFamily: "Tajawal-Regular",
                          textAlign: effectiveRTL ? "right" : "left",
                          backgroundColor: "transparent",
                        },
                        listView: {
                          backgroundColor: "white",
                          borderRadius: 10,
                          marginTop: 4,
                        },
                        row: {
                          backgroundColor: "white",
                          padding: 13,
                          height: "auto",
                          flexDirection: effectiveRTL ? "row-reverse" : "row",
                        },
                        description: {
                          fontFamily: "Tajawal-Regular",
                          textAlign: effectiveRTL ? "right" : "left",
                        },
                      }}
                      enablePoweredByContainer={false}
                      nearbyPlacesAPI="GooglePlacesSearch"
                      debounce={400}
                    />

                    <Pressable
                      onPress={() => {
                        setShowPlacesInput(false);
                        setSelectedPlace(null);
                      }}
                      style={styles.cancelSearchBtn}
                    >
                      <Text style={styles.cancelSearchText}>
                        {t("reportDialog.locationCancel")}
                      </Text>
                    </Pressable>
                  </View>
                )}

                {/* Notes */}
                <View style={styles.sectionRow}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { textAlign: effectiveRTL ? "right" : "left" },
                    ]}
                  >
                    {t("reportDialog.notesLabel")}
                  </Text>
                </View>

                <TextInput
                  style={[
                    styles.notesInput,
                    { textAlign: effectiveRTL ? "right" : "left" },
                  ]}
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t("reportDialog.notesPlaceholder")}
                  placeholderTextColor="#567"
                />

                {/* Time */}
                <Text
                  style={[
                    styles.timeText,
                    { textAlign: effectiveRTL ? "right" : "left" },
                  ]}
                >
                  {t("reportDialog.timeLabel")}{" "}
                  {`${new Date().getHours() % 12 || 12}:${String(
                    new Date().getMinutes()
                  ).padStart(2, "0")} ${
                    new Date().getHours() >= 12
                      ? isRTL
                        ? "م"
                        : "PM"
                      : isRTL
                      ? "ص"
                      : "AM"
                  }`}
                  {" • "}
                  {new Date().toLocaleDateString(isRTL ? "ar-SY" : "en-US", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </Text>

                {/* Success */}
                {successId && (
                  <View style={styles.successBox}>
                    <Text
                      style={[
                        styles.successText,
                        { textAlign: effectiveRTL ? "right" : "left" },
                      ]}
                    >
                      {t("reportDialog.successTitle")}{" "}
                      <Text style={{ fontFamily: "Tajawal-Bold" }}>
                        {successId}
                      </Text>
                    </Text>
                    <Text
                      style={[
                        styles.successSub,
                        { textAlign: effectiveRTL ? "right" : "left" },
                      ]}
                    >
                      {t("reportDialog.successSubtitle")}
                    </Text>
                  </View>
                )}

                {/* Send Button */}
                <View style={styles.sendBtnWrapper}>
                  <Pressable style={styles.sendBtn} onPress={handleSend}>
                    <Text style={styles.sendBtnText}>
                      {t("reportDialog.sendButton")}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      {/* IMAGE QUALITY CHECK OVERLAY */}
      {checkingImage && (
        <View style={[styles.photoOverlay, { justifyContent: 'center', alignItems: 'center' }]}>
          <View style={{ backgroundColor: BLUE, padding: 30, borderRadius: 16, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={YELLOW} />
            <Text style={{ color: '#fff', fontFamily: 'Tajawal-Medium', fontSize: 16, marginTop: 12 }}>
              {t("imageQuality.checking")}
            </Text>
          </View>
        </View>
      )}

      {/* PHOTO PREVIEW - Save/Cancel after cropping */}
      {pendingImage && (
        <View style={styles.photoOverlay}>
          <Pressable
            style={styles.photoOverlayBg}
            onPress={() => setPendingImage(null)}
          />
          <View style={styles.photoMenuBox}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <Image
                source={{ uri: pendingImage }}
                style={{ width: 200, height: 200, borderRadius: 20 }}
              />
            </View>
            <View style={{ flexDirection: effectiveRTL ? "row-reverse" : "row", justifyContent: "space-around" }}>
              <Pressable
                style={{
                  backgroundColor: YELLOW,
                  paddingVertical: 12,
                  paddingHorizontal: 36,
                  borderRadius: 14,
                  elevation: 4,
                }}
                onPress={() => {
                  setSelectedImage(pendingImage);
                  setPendingImage(null);
                }}
              >
                <Text style={{ color: "#fff", fontSize: 18, fontFamily: "Tajawal-Bold" }}>
                  {t("common.save")}
                </Text>
              </Pressable>
              <Pressable
                style={{
                  backgroundColor: "rgba(255,255,255,0.15)",
                  paddingVertical: 12,
                  paddingHorizontal: 36,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.3)",
                }}
                onPress={() => setPendingImage(null)}
              >
                <Text style={{ color: "#fff", fontSize: 18, fontFamily: "Tajawal-Bold" }}>
                  {t("common.cancel")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* PHOTO MENU */}
      {photoMenu && (
        <View style={styles.photoOverlay}>
          <Pressable
            style={styles.photoOverlayBg}
            onPress={() => setPhotoMenu(false)}
          />

          <View style={styles.photoMenuBox}>
            <Pressable
              style={[
                styles.photoMenuItem,
                { flexDirection: effectiveRTL ? "row-reverse" : "row" },
              ]}
              onPress={takePhoto}
            >
              <Text style={styles.photoMenuIcon}>📷</Text>
              <Text
                style={[
                  styles.photoMenuText,
                  { textAlign: effectiveRTL ? "right" : "left" },
                ]}
              >
                {t("reportDialog.photoMenuTake")}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.photoMenuItem,
                { flexDirection: effectiveRTL ? "row-reverse" : "row" },
              ]}
              onPress={pickImage}
            >
              <Text style={styles.photoMenuIcon}>🖼️</Text>
              <Text
                style={[
                  styles.photoMenuText,
                  { textAlign: effectiveRTL ? "right" : "left" },
                ]}
              >
                {t("reportDialog.photoMenuPick")}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </Modal>
  );
}

function Chip({
  label,
  active,
  color,
  variant,
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  variant?: "radar";
  onPress: () => void;
}) {
  const isRadar = variant === "radar";
  const backgroundColor = active
    ? isRadar
      ? BLUE
      : color || "#FFF"
    : isRadar
    ? "#FFF"
    : "rgba(255,255,255,0.2)";

  const borderColor = active ? (isRadar ? BLUE : "transparent") : "transparent";
  const textColor = active ? (isRadar ? YELLOW : BLUE) : isRadar ? BLUE : "#ffa834";

  return (
    <Pressable onPress={onPress} style={[styles.chip, { backgroundColor, borderColor }]}>
      <Text style={[styles.chipText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    backgroundColor: "rgb(213,228,252)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  headerRow: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    color: BLUE,
    fontSize: 20,
    fontFamily: "Tajawal-Bold",
    textAlign: "center",
    flex: 1,
  },
  backIcon: {
    fontSize: 24,
    color: BLUE,
    width: 44,
    textAlign: "center",
  },
  cameraBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BLUE,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraIcon: { fontSize: 20, color: "#fff" },
  cameraPlus: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: YELLOW,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  cameraPlusText: {
    fontSize: 14,
    color: BLUE,
    fontFamily: "Tajawal-Bold",
    marginTop: -6,
  },
  sectionRow: { marginTop: 12, marginBottom: 4 },
  sectionLabel: { color: BLUE, fontSize: 15, fontFamily: "Tajawal-Bold" },

  chipRow: { justifyContent: "space-between", marginBottom: 4 },
  chip: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 2,
  },
  chipText: { textAlign: "center", fontSize: 14, fontFamily: "Tajawal-Bold" },

  addressRow: {
    alignItems: "center",
    backgroundColor: "#F5F7FF",
    borderRadius: 14,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    paddingHorizontal: 10,
  },
  addressInput: {
    flex: 1,
    color: BLUE,
    fontSize: 14,
    fontFamily: "Tajawal-Regular",
  },
  placesContainer: { zIndex: 1000, elevation: 1000 },
  cancelSearchBtn: { marginTop: 8, padding: 8, alignItems: "center" },
  cancelSearchText: { color: BLUE, fontSize: 14, fontFamily: "Tajawal-Bold" },
  pinIcon: { fontSize: 20, marginLeft: 6 },

  notesInput: {
    marginTop: 4,
    backgroundColor: "#F5F7FF",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 70,
    color: BLUE,
    fontSize: 14,
    fontFamily: "Tajawal-Regular",
    textAlignVertical: "top",
  },
  timeText: { color: "#445", fontSize: 12, fontFamily: "Tajawal-Regular" },

  successBox: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "rgba(76, 217, 100,0.12)",
  },
  successText: { color: BLUE, fontSize: 14, fontFamily: "Tajawal-Regular" },
  successSub: {
    color: "#333",
    fontSize: 12,
    fontFamily: "Tajawal-Regular",
    marginTop: 2,
  },

  photoOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 999,
  },
  photoOverlayBg: { flex: 1 },
  photoMenuBox: {
    backgroundColor: "#123A7A",
    padding: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  photoMenuItem: { alignItems: "center", paddingVertical: 12 },
  photoMenuIcon: { fontSize: 26, marginLeft: 12, color: "#FFD166" },
  photoMenuText: { fontSize: 17, color: "white", fontFamily: "Tajawal-Bold" },

  sendBtnWrapper: { marginTop: 20, alignItems: "center", justifyContent: "center" },
  sendBtn: {
    width: "85%",
    backgroundColor: YELLOW,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  sendBtnText: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Tajawal-Bold",
    textAlign: "center",
  },
});
