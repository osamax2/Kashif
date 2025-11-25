import ChangeModal from "@/components/ChangeModal";
import IOSActionSheet from "@/components/IOSActionSheet";
import SuccessModal from "@/components/SuccessModal";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useState } from "react";

import {
    I18nManager,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const BLUE = "#0D2B66";
const YELLOW = "#F4B400";
const CARD = "#133B7A";

export default function SettingsScreen() {
    const [hideName, setHideName] = useState(false);
    const [notifReports, setNotifReports] = useState(true);
    const [notifPoints, setNotifPoints] = useState(false);
    const [notifGeneral, setNotifGeneral] = useState(true);
    const [successVisible, setSuccessVisible] = useState(false);
    const [nameModal, setNameModal] = useState(false);
    const [name, setName] = useState("");

    const [languageSheet, setLanguageSheet] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState("العربية");

    const [emailModal, setEmailModal] = useState(false);
    const [passwordModal, setPasswordModal] = useState(false);
    const [phoneModal, setPhoneModal] = useState(false);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");

    const router = useRouter();



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
            <View style={styles.header}>
                {/* Logout Icon – oben rechts (visuell) */}
                <TouchableOpacity onPress={() => alert("تم تسجيل الخروج")} style={styles.iconBtn}>
                    <Ionicons name="log-out-outline" size={28} color={YELLOW} />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>الإعدادات</Text>

                {/* Back icon (like profile) */}
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                    <Ionicons name="chevron-forward" size={30} color={YELLOW} />
                </TouchableOpacity>
            </View>

            {/* USER ID */}
            <Text style={styles.userId}>
                <Text style={{ color: "#ccc" }}>   رقم المستخدم: </Text>U-2025-143
            </Text>

            {/* ACTIONS */}
            <View
                style={styles.card}>
                    <TouchableOpacity onPress={() => setNameModal(true)}>
                    <Text style={styles.textItem}>تغيير الاسم</Text>
                        </TouchableOpacity>
                <TouchableOpacity onPress={() => setEmailModal(true)}>
                    <Text style={styles.textItem}>تغيير البريد الإلكتروني</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setPasswordModal(true)}>
                    <Text style={styles.textItem}>تغيير كلمة المرور</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setPhoneModal(true)}>
                    <Text style={styles.textItem}>تغيير رقم الموبايل</Text>
                </TouchableOpacity>

                {/* Language */}
                <TouchableOpacity
                    onPress={() => setLanguageSheet(true)}
                    style={styles.languageRow}
                >
                     <View style={styles.languageSelector}>
                        <Text style={styles.languageValue}>{selectedLanguage}</Text>
                       
                    </View>
                    <Text style={styles.languageLabel}>اللغة: </Text>

                   
                </TouchableOpacity>


                <SuccessModal
                    visible={successVisible}
                    message="تم حفظ التغييرات بنجاح"
                    onClose={() => setSuccessVisible(false)}
                />

                {/* Hide name */}
                <View style={styles.switchRow}>
                    <Text style={styles.switchText}>إخفاء اسمي عن البلاغات العامة</Text>
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
                options={["العربية", "English", "Deutsch", "Türkçe"]}
                onSelect={(choice: string) => {
                    setSelectedLanguage(choice);
                    alert("تم اختيار اللغة: " + choice);
                }}
            />

            {/* Notifications */}
            <Text style={styles.sectionTitle}>   الإشعارات</Text>

            <View style={styles.card}>
                <SwitchRow
                    label="إشعارات البلاغات"
                    value={notifReports}
                    onChange={setNotifReports}
                />
                <SwitchRow
                    label="إشعارات النقاط والمكافآت"
                    value={notifPoints}
                    onChange={setNotifPoints}
                />
                <SwitchRow
                    label="إشعارات عامة"
                    value={notifGeneral}
                    onChange={setNotifGeneral}
                />
            </View>

            <TouchableOpacity style={styles.saveButton}onPress={saveChanges}>
                <Text style={styles.saveButtonText}>حفظ التغييرات</Text>
            </TouchableOpacity>


            {/* ------- MODALS ------- */}
            <ChangeModal
                visible={emailModal}
                onClose={() => setEmailModal(false)}
                title="تغيير البريد الإلكتروني"
                placeholder="اكتب بريدك الجديد"
                value={email}
                setValue={setEmail}
                onSave={() => {
                    alert("تم تغيير البريد الإلكتروني 👍");
                    setEmailModal(false);
                }}
            />
        <ChangeModal
            visible={nameModal}
                onClose={() => setNameModal(false)}
        title="تغيير الاسم"
        placeholder="اكتب اسمك الجديد"
        value={name}
        setValue={setName}
            onSave={() => {
            alert("تم تغيير الاسم 👍");
            setNameModal(false);
            }}
                    />

            <ChangeModal
                visible={passwordModal}
                onClose={() => setPasswordModal(false)}
                title="تغيير كلمة المرور"
                placeholder="اكتب كلمة المرور الجديدة"
                value={password}
                setValue={setPassword}
                onSave={() => {
                    alert("تم تغيير كلمة المرور 👍");
                    setPasswordModal(false);
                }}
            />

            <ChangeModal
                visible={phoneModal}
                onClose={() => setPhoneModal(false)}
                title="تغيير رقم الموبايل"
                placeholder="اكتب رقمك الجديد"
                value={phone}
                setValue={setPhone}
                onSave={() => {
                    alert("تم تغيير رقم الموبايل 👍");
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
    return (
        <View style={styles.switchRow}>
            <Text style={styles.switchText}>{label}</Text>

            <Switch
                value={value}
                onValueChange={onChange}
                trackColor={{ false: "#777", true: YELLOW }}
                thumbColor={value ? "#fff" : "#ccc"}
                style={{ marginLeft: 4 }} // damit es rechts nicht rausfällt
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BLUE,
        paddingHorizontal: 20,
        paddingTop: 35,
        direction: "rtl",
         minHeight: "100%",
    },

    header: {
        width: "100%",
        flexDirection: "row-reverse",
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
        marginBottom: 20,
        textAlign: "left",
        fontFamily: "Tajawal-Regular",
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
        flexDirection: "row-reverse",   // RTL Reihenfolge
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.25)",
    },

    languageLabel: {
        color: "#FFFFFF",
        fontSize: 14,
        fontFamily: "Tajawal-Bold",
        textAlign: "right",
    },

    languageSelector: {
        flexDirection: "row-reverse",
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
        textAlign: "left",
    },

    switchRow: {
        flexDirection: "row-reverse",   // TEXT rechts → SWITCH links
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 0,
    },

    switchText: {
        color: "white",
        fontSize: 16,
        fontFamily: "Tajawal-Regular",
        flex: 1,
        textAlign: "left",             // rechtsbündig
        writingDirection: "rtl",
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
    textItem: {
        color: "#fff",
        fontSize: 16,
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderColor: "rgba(255,255,255,0.25)",
        fontFamily: "Tajawal-Regular",
        textAlign: "left",
    },

});
