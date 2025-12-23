import ChangeModal from "@/components/ChangeModal";
import IOSActionSheet from "@/components/IOSActionSheet";
import SuccessModal from "@/components/SuccessModal";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
    Alert,
    I18nManager,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const BLUE = "#0D2B66";
const YELLOW = "#F4B400";
const CARD = "#133B7A";

export default function SettingsScreen() {
    const { user, logout } = useAuth();
    const { language, setLanguage, t, isRTL } = useLanguage();
    const [hideName, setHideName] = useState(false);
    const [notifReports, setNotifReports] = useState(true);
    const [notifPoints, setNotifPoints] = useState(false);
    const [notifGeneral, setNotifGeneral] = useState(true);
    const [successVisible, setSuccessVisible] = useState(false);
    const [nameModal, setNameModal] = useState(false);
    const [name, setName] = useState(user?.full_name || "");

    const [languageSheet, setLanguageSheet] = useState(false);
    const selectedLanguage = language === 'ar' ? t('settings.languages.ar') : t('settings.languages.en');

    const [emailModal, setEmailModal] = useState(false);
    const [passwordModal, setPasswordModal] = useState(false);
    const [phoneModal, setPhoneModal] = useState(false);

    const [email, setEmail] = useState(user?.email || "");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState(user?.phone || "");

    const router = useRouter();

    const handleLogout = () => {
        Alert.alert(
            t('auth.logout'),
            t('auth.logoutConfirm'),
            [
                {
                    text: t('common.cancel'),
                    style: 'cancel',
                },
                {
                    text: t('auth.logout'),
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                    },
                },
            ]
        );
    };

    const saveChanges = () => {
        // Beispiel: Daten sammeln

        const payload = {
            hideName,
            notifReports,
            notifPoints,
            notifGeneral,
            email,
            phone
        };

        console.log("Gespeicherte Daten:", payload);

        // Beispiel Backend Request (optional)
        /*
        fetch("https://deinserver/speichern", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        */

        // Erfolgsmeldung

        setSuccessVisible(true); // Modernes Popup anzeigen

    };

    return (
        <ScrollView
    style={styles.root}
    contentContainerStyle={{
        paddingBottom: 120,
        flexGrow: 1,
    }}
    showsVerticalScrollIndicator={false}
>

            {/* Header */}
            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {/* Logout Icon */}
                <TouchableOpacity onPress={handleLogout} style={styles.iconBtn}>
                    <Ionicons name="log-out-outline" size={28} color={YELLOW} />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>{t('settings.title')}</Text>

                {/* Back icon */}
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                    <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={30} color={YELLOW} />
                </TouchableOpacity>
            </View>

            {/* USER ID + USERNAME */}
            <Text style={[styles.userId, { textAlign: isRTL ? 'right' : 'left' }]}>
                <Text style={{ color: "#ccc" }}>   {t('profile.userId')} </Text>{user?.id ? `U-${user.id}` : 'U-2025-143'}
            </Text>
            <Text style={[styles.userName, { textAlign: isRTL ? 'right' : 'left' }]}>{user?.full_name || 'مستخدم'}</Text>

            {/* ACTIONS */}
            <View
                style={styles.card}>
                    <TouchableOpacity onPress={() => {
                        setName(user?.full_name || "");
                        setNameModal(true);
                    }}>
                    <Text style={styles.textItem}>{t('settings.changeName')}</Text>
                        </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                    setEmail(user?.email || "");
                    setEmailModal(true);
                }}>
                    <Text style={styles.textItem}>{t('settings.changeEmail')}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setPasswordModal(true)}>
                    <Text style={styles.textItem}>{t('settings.changePassword')}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => {
                    setPhone(user?.phone || "");
                    setPhoneModal(true);
                }}>
                    <Text style={styles.textItem}>{t('settings.changePhone')}</Text>
                </TouchableOpacity>

                {/* Language */}
                <TouchableOpacity
                    onPress={() => setLanguageSheet(true)}
                    style={[styles.languageRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                >
                     <View style={[styles.languageSelector, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={styles.languageValue}>{selectedLanguage}</Text>
                       
                    </View>
                    <Text style={[styles.languageLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings.language')}: </Text>

                   
                </TouchableOpacity>


                <SuccessModal
                    visible={successVisible}
                    message={t('settings.changesSaved')}
                    onClose={() => setSuccessVisible(false)}
                />

                {/* Hide name */}
                <View style={styles.switchRow}>
                    <Text style={styles.switchText}>{t('settings.hideName')}</Text>
                    <Switch
                        value={hideName}
                        onValueChange={setHideName}
                        trackColor={{ false: "#888", true: YELLOW }}
                        thumbColor={hideName ? "#fff" : "#ccc"}
                    />
                </View>
            </View>
            <IOSActionSheet
                visible={languageSheet}
                onClose={() => setLanguageSheet(false)}
                options={[t('settings.languages.ar'), t('settings.languages.en')]}
                onSelect={async (choice: string) => {
                    const newLang = choice === 'العربية' || choice === t('settings.languages.ar') ? 'ar' : 'en';
                    await setLanguage(newLang);
                }}
            />

            {/* Notifications */}
            <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>   {t('settings.notifications')}</Text>

            <View style={styles.card}>
                <SwitchRow
                    label={t('settings.notifReports')}
                    value={notifReports}
                    onChange={setNotifReports}
                />
                <SwitchRow
                    label={t('settings.notifPoints')}
                    value={notifPoints}
                    onChange={setNotifPoints}
                />
                <SwitchRow
                    label={t('settings.notifGeneral')}
                    value={notifGeneral}
                    onChange={setNotifGeneral}
                />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
                <Text style={styles.saveButtonText}>{t('settings.saveChanges')}</Text>
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity style={[styles.logoutButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={22} color="#fff" style={isRTL ? { marginLeft: 8 } : { marginRight: 8 }} />
                <Text style={styles.logoutButtonText}>{t('auth.logout')}</Text>
            </TouchableOpacity>


            {/* ------- MODALS ------- */}
            <ChangeModal
                visible={emailModal}
                onClose={() => setEmailModal(false)}
                title={t('settings.changeEmail')}
                placeholder={t('settings.placeholders.newEmail')}
                value={email}
                setValue={setEmail}
                onSave={() => {
                    alert(t('common.success') + ' 👍');
                    setEmailModal(false);
                }}
            />
        <ChangeModal
            visible={nameModal}
                onClose={() => setNameModal(false)}
        title={t('settings.changeName')}
        placeholder={t('settings.placeholders.newName')}
        value={name}
        setValue={setName}
            onSave={() => {
            alert(t('common.success') + ' 👍');
            setNameModal(false);
            }}
                    />

            <ChangeModal
                visible={passwordModal}
                onClose={() => setPasswordModal(false)}
                title={t('settings.changePassword')}
                placeholder={t('settings.placeholders.newPassword')}
                value={password}
                setValue={setPassword}
                onSave={() => {
                    alert(t('common.success') + ' 👍');
                    setPasswordModal(false);
                }}
            />

            <ChangeModal
                visible={phoneModal}
                onClose={() => setPhoneModal(false)}
                title={t('settings.changePhone')}
                placeholder={t('settings.placeholders.newPhone')}
                value={phone}
                setValue={setPhone}
                onSave={() => {
                    alert(t('common.success') + ' 👍');
                    setPhoneModal(false);
                }}
            />
        </ScrollView>


    );
}

/* COMPONENT: Row for main actions */
//function SettingsItem({ label }: { label: string }) {
//  return (
//    <TouchableOpacity style={styles.settingsItem}>
//   <Text style={styles.settingsLabel}>{label}</Text>
//   </TouchableOpacity>
//// );
//}






/* COMPONENT: Switch Row */
function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
    const isRTL = I18nManager.isRTL;
    return (
        <View style={[styles.switchRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.switchText, { textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>

            <Switch
                value={value}
                onValueChange={onChange}
                trackColor={{ false: "#777", true: YELLOW }}
                thumbColor={value ? "#fff" : "#ccc"}
                style={isRTL ? { marginLeft: 4 } : { marginRight: 4 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BLUE,
        paddingHorizontal: 20,
        paddingTop: 45,
         minHeight: "100%",
    },

    header: {
        width: "100%",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        
    },

    backIcon: {
        color: YELLOW,
        fontSize: 26,
    },

    headerTitle: {
        color: "white",
        fontSize: 24,
        fontFamily: "Tajawal-Bold",
    },
    iconBtn: {
        padding: 6,
    },

    userId: {
        color: "#fff",
        fontSize: 16,
        marginBottom: 8,
        fontFamily: "Tajawal-Regular",
    },

    userName: {
        color: YELLOW,
        fontSize: 20,
        marginBottom: 20,
        fontFamily: "Tajawal-Bold",
    },

    card: {
        backgroundColor: CARD,
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 20,
        gap: 10,
    },

    settingsItem: {
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.2)",
    },

    settingsLabel: {
        color: "#fff",
        fontSize: 14,
        textAlign: "left",
        fontFamily: "Tajawal-Regular",
    },

    languageRow: {
        width: "100%",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.25)",
    },

    languageLabel: {
        color: "#FFFFFF",
        fontSize: 14,
        fontFamily: "Tajawal-Medium",
    },

    languageSelector: {
        alignItems: "center",
        gap: 8,
        marginRight: "auto",
    },

    languageValue: {
        color: "#F4B400",     // gelb wie dein Bild
        fontSize: 14,
        fontFamily: "Tajawal-Bold",
    },

    languageArrow: {
        color: "#F4B400",
        fontSize: 14,
        marginTop: 2,
    },


    sectionTitle: {
        color: "#fff",
        fontSize: 14,
        marginBottom: 14,
        fontFamily: "Tajawal-Bold",
    },

    switchRow: {
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 0,
    },

    switchText: {
        color: "white",
        fontSize: 16,
        fontFamily: "Tajawal-Regular",
        flex: 1,
    },

    saveButton: {
        backgroundColor: YELLOW,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10,
        textAlign: "right"
    },

    saveButtonText: {
        color: "#ffffff",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
    },
    
    logoutButton: {
        backgroundColor: "#DC2626",
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 16,
        justifyContent: "center",
    },

    logoutButtonText: {
        color: "#ffffff",
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
    },

    textItem: {
        color: "#fff",
        fontSize: 16,
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderColor: "rgba(255,255,255,0.25)",
        fontFamily: "Tajawal-Regular",
    },

});
