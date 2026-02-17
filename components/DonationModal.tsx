/**
 * DonationModal.tsx
 * Community donation modal for report repairs.
 * All payment methods are currently disabled (UI only).
 */
import { useLanguage } from "@/contexts/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    ScrollView,
    Alert,
} from "react-native";

const BLUE = "#0D2B66";

interface DonationModalProps {
    visible: boolean;
    onClose: () => void;
    report: {
        id: number;
        title?: string;
        repair_cost?: number;
        total_donated?: number;
    } | null;
}

const PAYMENT_METHODS = [
    {
        id: "paypal",
        name: "PayPal",
        icon: "logo-paypal",
        color: "#003087",
        disabled: true,
    },
    {
        id: "visa",
        name: "Visa",
        icon: "card",
        color: "#1A1F71",
        disabled: true,
    },
    {
        id: "mastercard",
        name: "Mastercard",
        icon: "card-outline",
        color: "#EB001B",
        disabled: true,
    },
    {
        id: "shamcash",
        name: "شام كاش",
        icon: "wallet",
        color: "#2E7D32",
        disabled: true,
    },
];

export default function DonationModal({ visible, onClose, report }: DonationModalProps) {
    const { language } = useLanguage();
    const isRTL = language === "ar";
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
    const [amount, setAmount] = useState("");

    const repairCost = report?.repair_cost || 0;
    const totalDonated = report?.total_donated || 0;
    const remaining = Math.max(0, repairCost - totalDonated);
    const progress = repairCost > 0 ? Math.min(100, (totalDonated / repairCost) * 100) : 0;

    const handleDonate = () => {
        Alert.alert(
            isRTL ? "قريباً" : "Coming Soon",
            isRTL
                ? "خدمة الدفع غير متوفرة حالياً. سيتم تفعيلها قريباً."
                : "Payment service is not available yet. It will be activated soon.",
            [{ text: isRTL ? "حسناً" : "OK" }]
        );
    };

    const presetAmounts = [5, 10, 25, 50];

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.backdrop}>
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.card}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>
                                {isRTL ? "تبرع لإصلاح الحفرة" : "Donate to Repair"}
                            </Text>
                            <Pressable onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </Pressable>
                        </View>

                        {/* Report Info */}
                        {report && (
                            <View style={styles.reportInfo}>
                                <Text style={styles.reportTitle}>
                                    {report.title || (isRTL ? "بلاغ" : "Report")} #{report.id}
                                </Text>

                                {/* Cost & Progress */}
                                {repairCost > 0 ? (
                                    <View style={styles.costSection}>
                                        <View style={styles.costRow}>
                                            <Text style={styles.costLabel}>
                                                {isRTL ? "تكلفة الإصلاح:" : "Repair cost:"}
                                            </Text>
                                            <Text style={styles.costValue}>${repairCost}</Text>
                                        </View>
                                        <View style={styles.costRow}>
                                            <Text style={styles.costLabel}>
                                                {isRTL ? "تم جمع:" : "Collected:"}
                                            </Text>
                                            <Text style={[styles.costValue, { color: "#4CD964" }]}>
                                                ${totalDonated}
                                            </Text>
                                        </View>
                                        <View style={styles.costRow}>
                                            <Text style={styles.costLabel}>
                                                {isRTL ? "المتبقي:" : "Remaining:"}
                                            </Text>
                                            <Text style={[styles.costValue, { color: "#FF6B6B" }]}>
                                                ${remaining}
                                            </Text>
                                        </View>

                                        {/* Progress Bar */}
                                        <View style={styles.progressBar}>
                                            <View
                                                style={[
                                                    styles.progressFill,
                                                    { width: `${progress}%` },
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.progressText}>
                                            {progress.toFixed(0)}%
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={styles.noCostBadge}>
                                        <Ionicons name="information-circle" size={18} color="#FFD166" />
                                        <Text style={styles.noCostText}>
                                            {isRTL
                                                ? "لم يتم تحديد تكلفة الإصلاح بعد"
                                                : "Repair cost not set yet"}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Amount Input */}
                        <Text style={styles.sectionTitle}>
                            {isRTL ? "مبلغ التبرع ($)" : "Donation Amount ($)"}
                        </Text>
                        <View style={styles.amountRow}>
                            {presetAmounts.map((preset) => (
                                <Pressable
                                    key={preset}
                                    style={[
                                        styles.presetBtn,
                                        amount === String(preset) && styles.presetBtnActive,
                                    ]}
                                    onPress={() => setAmount(String(preset))}
                                >
                                    <Text
                                        style={[
                                            styles.presetText,
                                            amount === String(preset) && styles.presetTextActive,
                                        ]}
                                    >
                                        ${preset}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        <TextInput
                            style={styles.amountInput}
                            placeholder={isRTL ? "أو أدخل مبلغ آخر..." : "Or enter custom amount..."}
                            placeholderTextColor="#888"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />

                        {/* Payment Methods */}
                        <Text style={styles.sectionTitle}>
                            {isRTL ? "طريقة الدفع" : "Payment Method"}
                        </Text>
                        <View style={styles.methodsGrid}>
                            {PAYMENT_METHODS.map((method) => (
                                <Pressable
                                    key={method.id}
                                    style={[
                                        styles.methodCard,
                                        selectedMethod === method.id && styles.methodCardActive,
                                        method.disabled && styles.methodCardDisabled,
                                    ]}
                                    onPress={() => {
                                        if (method.disabled) {
                                            Alert.alert(
                                                isRTL ? "قريباً" : "Coming Soon",
                                                isRTL
                                                    ? `${method.name} غير متوفر حالياً`
                                                    : `${method.name} is not available yet`
                                            );
                                            return;
                                        }
                                        setSelectedMethod(method.id);
                                    }}
                                >
                                    <Ionicons
                                        name={method.icon as any}
                                        size={28}
                                        color={method.disabled ? "#555" : method.color}
                                    />
                                    <Text
                                        style={[
                                            styles.methodName,
                                            method.disabled && { color: "#555" },
                                        ]}
                                    >
                                        {method.name}
                                    </Text>
                                    {method.disabled && (
                                        <View style={styles.comingSoonBadge}>
                                            <Text style={styles.comingSoonText}>
                                                {isRTL ? "قريباً" : "Soon"}
                                            </Text>
                                        </View>
                                    )}
                                </Pressable>
                            ))}
                        </View>

                        {/* Donate Button */}
                        <Pressable
                            style={[styles.donateBtn, { opacity: 0.5 }]}
                            onPress={handleDonate}
                        >
                            <Ionicons name="heart" size={20} color="#fff" />
                            <Text style={styles.donateBtnText}>
                                {isRTL ? "تبرع الآن" : "Donate Now"}
                            </Text>
                        </Pressable>

                        <Text style={styles.disclaimer}>
                            {isRTL
                                ? "⚠️ خدمة الدفع معطلة حالياً. سيتم تفعيلها قريباً."
                                : "⚠️ Payment is currently disabled. Coming soon."}
                        </Text>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.7)",
    },
    card: {
        backgroundColor: "rgba(15,37,80,0.97)",
        borderRadius: 22,
        padding: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.15)",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    headerTitle: {
        color: "#FFD166",
        fontSize: 20,
        fontFamily: "Tajawal-Bold",
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.1)",
        alignItems: "center",
        justifyContent: "center",
    },
    reportInfo: {
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
    },
    reportTitle: {
        color: "#fff",
        fontSize: 16,
        fontFamily: "Tajawal-Bold",
        marginBottom: 10,
    },
    costSection: {
        gap: 6,
    },
    costRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    costLabel: {
        color: "#aaa",
        fontSize: 14,
        fontFamily: "Tajawal-Regular",
    },
    costValue: {
        color: "#fff",
        fontSize: 16,
        fontFamily: "Tajawal-Bold",
    },
    progressBar: {
        height: 8,
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 4,
        marginTop: 8,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#4CD964",
        borderRadius: 4,
    },
    progressText: {
        color: "#aaa",
        fontSize: 12,
        textAlign: "center",
        marginTop: 4,
        fontFamily: "Tajawal-Regular",
    },
    noCostBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(255,209,102,0.1)",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    noCostText: {
        color: "#FFD166",
        fontSize: 13,
        fontFamily: "Tajawal-Regular",
    },
    sectionTitle: {
        color: "#fff",
        fontSize: 15,
        fontFamily: "Tajawal-Bold",
        marginBottom: 10,
    },
    amountRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 10,
    },
    presetBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.08)",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },
    presetBtnActive: {
        backgroundColor: "rgba(255,209,102,0.2)",
        borderColor: "#FFD166",
    },
    presetText: {
        color: "#ccc",
        fontSize: 15,
        fontFamily: "Tajawal-Bold",
    },
    presetTextActive: {
        color: "#FFD166",
    },
    amountInput: {
        backgroundColor: "rgba(255,255,255,0.08)",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: "#fff",
        fontSize: 16,
        fontFamily: "Tajawal-Regular",
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },
    methodsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 16,
    },
    methodCard: {
        width: "47%",
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.08)",
        alignItems: "center",
        gap: 6,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },
    methodCardActive: {
        backgroundColor: "rgba(255,209,102,0.15)",
        borderColor: "#FFD166",
    },
    methodCardDisabled: {
        opacity: 0.5,
    },
    methodName: {
        color: "#fff",
        fontSize: 14,
        fontFamily: "Tajawal-Bold",
    },
    comingSoonBadge: {
        position: "absolute",
        top: 6,
        right: 6,
        backgroundColor: "#FF6B6B",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    comingSoonText: {
        color: "#fff",
        fontSize: 9,
        fontFamily: "Tajawal-Bold",
    },
    donateBtn: {
        flexDirection: "row",
        backgroundColor: "#E53935",
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginBottom: 10,
    },
    donateBtnText: {
        color: "#fff",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
    },
    disclaimer: {
        color: "#888",
        fontSize: 12,
        textAlign: "center",
        fontFamily: "Tajawal-Regular",
    },
});
