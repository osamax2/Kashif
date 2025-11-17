// components/ReportDialog.tsx
import React, { useEffect, useRef, useState } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Pressable,
    TextInput,
    Animated,
    Platform,
} from "react-native";

const BLUE = "#0D2B66";
const LIGHT_CARD = "#E6F0FF";
const YELLOW = "#F4B400";

type ReportType = "pothole" | "accident" | "speed" | null;

interface Props {
    visible: boolean;
    type: ReportType;              // "pothole" | "accident" | "speed"
    onClose: () => void;
    onSubmit?: (payload: {
        type: ReportType;
        severity: "low" | "medium" | "high";
        address: string;
        notes: string;
        id: string;
        time: string;
    }) => void;
}

export default function ReportDialog({
                                         visible,
                                         type,
                                         onClose,
                                         onSubmit,
                                     }: Props) {
    const [severity, setSeverity] = useState<"low" | "medium" | "high">("low");
    const [address, setAddress] = useState("شارع المزة، دمشق");
    const [notes, setNotes] = useState("");
    const [successId, setSuccessId] = useState<string | null>(null);

    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setSuccessId(null);
            Animated.spring(slideAnim, {
                toValue: 1,
                useNativeDriver: true,
            }).start();
        } else {
            slideAnim.setValue(0);
        }
    }, [visible]);

    const handleSend = () => {
        const id = Math.floor(1000 + Math.random() * 9000).toString();
        const time = new Date().toLocaleString("ar-SY", {
            hour: "2-digit",
            minute: "2-digit",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });

        setSuccessId(id);

        onSubmit?.({
            type,
            severity,
            address,
            notes,
            id,
            time,
        });
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
                        <Pressable onPress={() => {}} hitSlop={10}>
                            <View style={styles.cameraBadge}>
                                <Text style={styles.cameraIcon}>📷</Text>
                                <View style={styles.cameraPlus}>
                                    <Text style={styles.cameraPlusText}>+</Text>
                                </View>
                            </View>
                        </Pressable>
                    </View>

                    {/* Level / Typ */}
                    <View style={styles.sectionRow}>
                        <Text style={styles.sectionLabel}>
                            {type === "speed" ? "نوعه:" : "مستوى الخطورة:"}
                        </Text>
                    </View>

                    {type === "speed" ? (
                        // Radar-Typ (stationär / mobil / Kamera)
                        <View style={styles.chipRow}>
                            <Chip
                                label="ثابتة"
                                active={severity === "low"}
                                color="#4DA3FF"
                                onPress={() => setSeverity("low")}
                            />
                            <Chip
                                label="متنقلة"
                                active={severity === "medium"}
                                color="#4DA3FF"
                                onPress={() => setSeverity("medium")}
                            />
                            <Chip
                                label="كاميرا مراقبة"
                                active={severity === "high"}
                                color="#4DA3FF"
                                onPress={() => setSeverity("high")}
                            />
                        </View>
                    ) : (
                        // Gefahr-Level (niedrig / mittel / hoch)
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

                    <Pressable style={styles.addressRow}>
                        <TextInput
                            value={address}
                            onChangeText={setAddress}
                            style={styles.addressInput}
                            placeholder="أدخل العنوان"
                            placeholderTextColor="#567"
                            textAlign="right"
                        />
                        <Text style={styles.pinIcon}>📍</Text>
                    </Pressable>

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
                    <View style={styles.timeRow}>
                        <Text style={styles.timeText}>
                            🕒 وقت البلاغ:{" "}
                            {new Date().toLocaleString("ar-SY", {
                                hour: "2-digit",
                                minute: "2-digit",
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                            })}
                        </Text>
                    </View>

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
                    <View style={styles.footerRow}>
                        <Pressable style={styles.sendButton} onPress={handleSend}>
                            <Text style={styles.sendIcon}>▶︎</Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

/** Kleine Pill-Buttons */
function Chip({
                  label,
                  active,
                  color,
                  onPress,
              }: {
    label: string;
    active: boolean;
    color: string;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.chip,
                {
                    backgroundColor: active ? color : "rgba(255,255,255,0.2)",
                    borderColor: active ? color : "transparent",
                },
            ]}
        >
            <Text
                style={[
                    styles.chipText,
                    { color: active ? BLUE : "#ffa834" },
                ]}
            >
                {label}
            </Text>
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
        fontSize: 12,
        color: BLUE,
        fontFamily: "Tajawal-Bold",
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
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: YELLOW,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    sendIcon: {
        fontSize: 26,
        color: BLUE,
    },
});
