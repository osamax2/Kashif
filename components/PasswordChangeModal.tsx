import React, { useState } from "react";
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useLanguage } from "../contexts/LanguageContext";

const BLUE = "#0D2B66";
const YELLOW = "#F4B400";

interface Props {
    visible: boolean;
    onClose: () => void;
    onSave: (currentPassword: string, newPassword: string) => Promise<void>;
}

export default function PasswordChangeModal({ visible, onClose, onSave }: Props) {
    const { language } = useLanguage();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) return;
        if (newPassword.length < 6) {
            setError(
                language === "ar" ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
                    : language === "ku" ? "Şîfre divê herî kêm 6 tîp be"
                        : "Password must be at least 6 characters"
            );
            return;
        }
        if (newPassword !== confirmPassword) {
            setError(
                language === "ar" ? "كلمتا المرور غير متطابقتين"
                    : language === "ku" ? "Şîfre hevdu nagirin"
                        : "Passwords do not match"
            );
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await onSave(currentPassword, newPassword);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (e: any) {
            const detail = e?.response?.data?.detail;
            if (detail === "Current password is incorrect") {
                setError(
                    language === "ar" ? "كلمة المرور الحالية غير صحيحة"
                        : language === "ku" ? "Şîfreya niha ne rast e"
                            : "Current password is incorrect"
                );
            } else {
                setError(detail || (language === "ar" ? "فشل في تغيير كلمة المرور" : language === "ku" ? "Guherandina şîfreyê serneket" : "Failed to change password"));
            }
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setError(null);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.modalBox}>
                    <Text style={styles.title}>
                        {language === "ar" ? "تغيير كلمة المرور" : language === "ku" ? "Guherandina şîfreyê" : "Change Password"}
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder={language === "ar" ? "كلمة المرور الحالية" : language === "ku" ? "Şîfreya niha" : "Current password"}
                        placeholderTextColor="#A5B4D0"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry
                        textAlign="right"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder={language === "ar" ? "كلمة المرور الجديدة" : language === "ku" ? "Şîfreya nû" : "New password"}
                        placeholderTextColor="#A5B4D0"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        textAlign="right"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder={language === "ar" ? "تأكيد كلمة المرور الجديدة" : language === "ku" ? "Şîfreya nû teyid bike" : "Confirm new password"}
                        placeholderTextColor="#A5B4D0"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        textAlign="right"
                    />

                    {error && <Text style={styles.errorText}>{error}</Text>}

                    <View style={styles.buttonsRow}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={saving}>
                            <Text style={styles.cancelText}>
                                {language === "ar" ? "إلغاء" : language === "ku" ? "Betal bike" : "Cancel"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                            {saving ? (
                                <ActivityIndicator size="small" color={BLUE} />
                            ) : (
                                <Text style={styles.saveText}>
                                    {language === "ar" ? "حفظ" : language === "ku" ? "Parastin" : "Save"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.55)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalBox: {
        width: "85%",
        backgroundColor: BLUE,
        borderRadius: 16,
        padding: 20,
        elevation: 6,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
    },
    title: {
        color: "#fff",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
        textAlign: "center",
        marginBottom: 15,
    },
    input: {
        backgroundColor: "#1D3B70",
        color: "#fff",
        borderRadius: 10,
        padding: 12,
        fontFamily: "Tajawal-Regular",
        marginBottom: 12,
    },
    errorText: {
        color: "#ff6b6b",
        fontSize: 13,
        fontFamily: "Tajawal-Regular",
        textAlign: "center",
        marginBottom: 10,
    },
    buttonsRow: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        marginTop: 4,
    },
    saveBtn: {
        backgroundColor: YELLOW,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        minWidth: 80,
        alignItems: "center",
    },
    saveText: {
        color: BLUE,
        fontFamily: "Tajawal-Bold",
        fontSize: 16,
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    cancelText: {
        color: "#aaa",
        fontFamily: "Tajawal-Regular",
        fontSize: 16,
    },
});
