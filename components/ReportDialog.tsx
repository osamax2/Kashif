// components/ReportDialog.tsx
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Image,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
const BLUE = "#0D2B66";
const LIGHT_CARD = "#E6F0FF";
const YELLOW = "#F4B400";

type ReportType = "pothole" | "accident" | "speed" | null;

interface Props {
    visible: boolean;
    type: ReportType;              // "pothole" | "accident" | "speed"
    address?: string;              // Dynamic address from search or GPS
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
    const [severity, setSeverity] = useState<"low" | "medium" | "high">("low");
    const [address, setAddress] = useState("");
    const [notes, setNotes] = useState("");
    const [successId, setSuccessId] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [photoMenu, setPhotoMenu] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState<{
        lat: number;
        lng: number;
        address: string;
    } | null>(null);
    const [showPlacesInput, setShowPlacesInput] = useState(false);

    const slideAnim = useRef(new Animated.Value(0)).current;


async function pickImage() {
  try {
    // Auswahl: Kamera ODER Galerie
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.7,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  } catch (e) {
    console.log("Image pick error:", e);
  }
}

async function takePhoto() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    alert("يرجى السماح للوصول إلى الكاميرا");
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.7,
  });

  if (!result.canceled) {
    setSelectedImage(result.assets[0].uri);
  }
}

    useEffect(() => {
        if (visible) {
            setSuccessId(null);
            setAddress(initialAddress || "الموقع التلقائي");
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
        const time = new Date().toLocaleString("ar-SY", {
            hour: "2-digit",
            minute: "2-digit",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });

        setSuccessId(id);

        // Verwende selectedPlace wenn vorhanden, sonst initialAddress (GPS)
        const finalAddress = selectedPlace 
            ? selectedPlace.address 
            : (initialAddress || "الموقع التلقائي");

        // Call onSubmit and wait for completion
        if (onSubmit) {
            await onSubmit({
                type,
                severity,
                address: finalAddress,
                notes,
                id,
                time,
                photoUri: selectedImage || undefined,
                // Füge Koordinaten hinzu wenn aus Google Places
                ...(selectedPlace && {
                    latitude: selectedPlace.lat,
                    longitude: selectedPlace.lng,
                }),
            });
        }
        
        // Close dialog after a short delay to show success message
        setTimeout(() => {
            onClose();
            // Reset form
            setSeverity('low');
            setNotes('');
            setAddress('');
            setSelectedImage(null);
            setSuccessId(null);
        }, 2000);
    };

    const titleByType: Record<Exclude<ReportType, null>, string> = {
        pothole: "بلاغ حفرة",
        accident: "بلاغ حادث",
        speed: "بلاغ رادار",
    };

    const title = type ? titleByType[type] : "بلاغ";

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.backdrop}>
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
                        },
                    ]}
                >
                    
                   {/* Header */}
<View style={styles.headerRow}>
    <Pressable onPress={onClose} hitSlop={10}>
        <Text style={styles.backIcon}>↩︎</Text>
    </Pressable>

    <Text style={styles.title}>{title}</Text>

    {/* Kamera-Icon rechts */}
    <Pressable onPress={() => setPhotoMenu(true)} hitSlop={10}>
        <View style={styles.cameraBadge}>
            <Text style={styles.cameraIcon}>📷</Text>
            <View style={styles.cameraPlus}>
                <Text style={styles.cameraPlusText}>+</Text>
            </View>
        </View>
    </Pressable>
</View>

{/* ⬇️ HIER DAS FOTO-ANZEIGE-FELD EINBAUEN */}
{selectedImage && (
  <View style={{ alignItems: "center", marginTop: 10 }}>
    <Image
      source={{ uri: selectedImage }}
      style={{
        width: 120,
        height: 120,
        borderRadius: 16,
        marginBottom: 6,
      }}
    />
  </View>
)}

{/* Level / Typ */}
<View style={styles.sectionRow}>
    <Text style={styles.sectionLabel}>
        {type === "speed" ? "نوعه:" : "مستوى الخطورة:"}
    </Text>
</View>

                    {type === "speed" ? (
                        <View style={styles.chipRow}>
                            <Chip
                                label="ثابتة"
                                active={severity === "low"}
                                variant="radar"
                                onPress={() => setSeverity("low")}
                            />
                            <Chip
                                label="متنقلة"
                                active={severity === "medium"}
                                variant="radar"
                                onPress={() => setSeverity("medium")}
                            />
                            <Chip
                                label="كاميرا مراقبة"
                                active={severity === "high"}
                                variant="radar"
                                onPress={() => setSeverity("high")}
                            />
                        </View>
                    ) : (
                        <View style={styles.chipRow}>
                            <Chip
                                label="منخفضة"
                                active={severity === "low"}
                                color={YELLOW}
                                onPress={() => setSeverity("low")}
                            />
                            <Chip
                                label="وسط"
                                active={severity === "medium"}
                                color="#FFA94D"
                                onPress={() => setSeverity("medium")}
                            />
                            <Chip
                                label="خطيرة"
                                active={severity === "high"}
                                color="#FF6B6B"
                                onPress={() => setSeverity("high")}
                            />
                        </View>
                    )}

                    {/* Adresse */}
                    <View style={styles.sectionRow}>
                        <Text style={styles.sectionLabel}>الموقع:</Text>
                    </View>

                    {!showPlacesInput ? (
                        <Pressable 
                            style={styles.addressRow}
                            onPress={() => setShowPlacesInput(true)}
                        >
                            <Text style={styles.addressInput}>
                                {selectedPlace ? selectedPlace.address : (initialAddress || "الموقع التلقائي")}
                            </Text>
                            <Text style={styles.pinIcon}>📍</Text>
                        </Pressable>
                    ) : (
                        <View style={styles.placesContainer}>
                            <GooglePlacesAutocomplete
                                placeholder='ابحث عن موقع'
                                minLength={2}
                                listViewDisplayed='auto'
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
                                    key: 'AIzaSyBRM_T7GtQ8JROceC_Gm0qRVjgxNh2Fxr4',
                                    language: 'ar',
                                }}
                                textInputProps={{
                                    autoFocus: true,
                                    returnKeyType: 'search',
                                }}
                                styles={{
                                    container: {
                                        flex: 0,
                                    },
                                    textInputContainer: {
                                        backgroundColor: '#F5F7FF',
                                        borderRadius: 14,
                                        paddingHorizontal: 10,
                                    },
                                    textInput: {
                                        height: 40,
                                        color: BLUE,
                                        fontSize: 14,
                                        fontFamily: 'Tajawal-Regular',
                                        textAlign: 'right',
                                        backgroundColor: 'transparent',
                                    },
                                    predefinedPlacesDescription: {
                                        color: '#1faadb',
                                        fontFamily: 'Tajawal-Regular',
                                    },
                                    listView: {
                                        backgroundColor: 'white',
                                        borderRadius: 10,
                                        marginTop: 4,
                                    },
                                    row: {
                                        backgroundColor: 'white',
                                        padding: 13,
                                        height: 'auto',
                                        flexDirection: 'row-reverse',
                                    },
                                    separator: {
                                        height: 0.5,
                                        backgroundColor: '#c8c7cc',
                                    },
                                    description: {
                                        fontFamily: 'Tajawal-Regular',
                                        textAlign: 'right',
                                    },
                                    loader: {
                                        flexDirection: 'row',
                                        justifyContent: 'flex-end',
                                        height: 20,
                                    },
                                }}
                                enablePoweredByContainer={false}
                                nearbyPlacesAPI='GooglePlacesSearch'
                                debounce={400}
                            />
                            <Pressable 
                                onPress={() => {
                                    setShowPlacesInput(false);
                                    setSelectedPlace(null);
                                }}
                                style={styles.cancelSearchBtn}
                            >
                                <Text style={styles.cancelSearchText}>إلغاء</Text>
                            </Pressable>
                        </View>
                    )}

                    {/* Weitere Infos */}
                    <View style={styles.sectionRow}>
                        <Text style={styles.sectionLabel}>معلومات أخرى؟</Text>
                    </View>

                    <TextInput
                        style={styles.notesInput}
                        multiline
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="اكتب تفاصيل إضافية عن البلاغ"
                        placeholderTextColor="#567"
                        textAlign="right"
                    />

                    {/* Zeitzeile */}
                    <Text style={styles.timeText}>
    🕒 وقت البلاغ:{" "}
    {`م${new Date().getHours() % 12 || 12}:${String(new Date().getMinutes()).padStart(2, "0")}`}
    {" • "}
    {new Date().toLocaleDateString("ar-SY", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    })}
</Text>



                    {/* Erfolgsnachricht */}
                    {successId && (
                        <View style={styles.successBox}>
                            <Text style={styles.successText}>
                                تم إرسال بلاغك بنجاح! رقم البلاغ:{" "}
                                <Text style={{ fontFamily: "Tajawal-Bold" }}>{successId}</Text>
                            </Text>
                            <Text style={styles.successSub}>
                                سيتم مراجعته من قبل الجهات المختصة.
                            </Text>
                        </View>
                    )}

                    {/* Senden-Button unten rechts */}
                    <View style={styles.sendBtnWrapper}>
    <Pressable style={styles.sendBtn} onPress={handleSend}>
        <Text style={styles.sendBtnText}>إرسال</Text>
    </Pressable>
</View>

                </Animated.View>
                
                {/* --- PHOTO MENU --- */}
{photoMenu && (
  <View style={styles.photoOverlay}>
    {/* Hintergrund zum Schließen */}
    <Pressable style={styles.photoOverlayBg} onPress={() => setPhotoMenu(false)} />

    <View style={styles.photoMenuBox}>
      <Pressable style={styles.photoMenuItem} onPress={takePhoto}>
        <Text style={styles.photoMenuIcon}>📷</Text>
        <Text style={styles.photoMenuText}>التقاط صورة</Text>
      </Pressable>

      <Pressable style={styles.photoMenuItem} onPress={pickImage}>
        <Text style={styles.photoMenuIcon}>🖼️</Text>
        <Text style={styles.photoMenuText}>اختيار صورة من الهاتف</Text>
      </Pressable>
    </View>
  </View>
)}

            </View>
            
        </Modal>
        
    );
}

/** Kleine Pill-Buttons */
/** Kleine Pill-Buttons */
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
        backgroundColor: "rgb(213,228,252)", // leichtes Glas
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
        direction: "rtl",
    },
    headerRow: {
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    
    title: {
        color: BLUE,
        fontSize: 20,
        fontFamily: "Tajawal-Bold",
    },
    backIcon: {
        fontSize: 24,
        color: BLUE,
    },
    cameraBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: BLUE,
        justifyContent: "center",
        alignItems: "center",
    },
    cameraIcon: {
        fontSize: 20,
        color: "#fff",
    },
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
    sectionRow: {
        marginTop: 12,
        marginBottom: 4,
    },
    sectionLabel: {
        color: BLUE,
        fontSize: 15,
        fontFamily: "Tajawal-Bold",
        textAlign: "left",
    },
    chipRow: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    chip: {
        flex: 1,
        marginHorizontal: 2,
        paddingVertical: 9,
        borderRadius: 20,
        borderWidth: 2,
    },
    chipText: {
        textAlign: "center",
        fontSize: 14,
        fontFamily: "Tajawal-Bold",
    },
    addressRow: {
        flexDirection: "row-reverse",
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
        textAlign: "left",
    },
    placesContainer: {
        zIndex: 1000,
        elevation: 1000,
    },
    cancelSearchBtn: {
        marginTop: 8,
        padding: 8,
        alignItems: 'center',
    },
    cancelSearchText: {
        color: BLUE,
        fontSize: 14,
        fontFamily: 'Tajawal-Bold',
    },
    pinIcon: {
        fontSize: 20,
        marginLeft: 6,
    },
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
    timeRow: {
        marginTop: 10,
        borderTopWidth: 0.6,
        borderTopColor: "rgba(0,0,0,0.08)",
        paddingTop: 6,
    },
    timeText: {
        color: "#445",
        fontSize: 12,
        fontFamily: "Tajawal-Regular",
        textAlign: "left",
    },
    successBox: {
        marginTop: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 16,
        backgroundColor: "rgba(76, 217, 100,0.12)",
    },
    successText: {
        color: BLUE,
        fontSize: 14,
        fontFamily: "Tajawal-Regular",
        textAlign: "left",
    },
    successSub: {
        color: "#333",
        fontSize: 12,
        fontFamily: "Tajawal-Regular",
        marginTop: 2,
        textAlign: "left",
    },
    footerRow: {
        marginTop: 10,
        flexDirection: "row-reverse",
        justifyContent: "flex-end",
    },
    sendButton: {
        width: 40,
        height: 50,
        borderRadius: 20,
        backgroundColor: YELLOW,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#ffffffff",
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    sendIcon: {
        fontSize: 26,
        color: BLUE,
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

photoOverlayBg: {
  flex: 1,
},

photoMenuBox: {
  backgroundColor: "#123A7A",
  padding: 20,
  borderTopLeftRadius: 25,
  borderTopRightRadius: 25,
},

photoMenuItem: {
  flexDirection: "row-reverse",
  alignItems: "center",
  paddingVertical: 12,
},

photoMenuIcon: {
  fontSize: 26,
  marginLeft: 12,
  color: "#FFD166",
},

photoMenuText: {
  fontSize: 17,
  color: "white",
  fontFamily: "Tajawal-Bold",
  textAlign: "left",
},
sendBtnWrapper: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
},

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
