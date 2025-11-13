import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    I18nManager,
    Switch,
    ScrollView,
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

    return (
        <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 60 }}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity>
                    <Text style={styles.backIcon}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>الإعدادات</Text>
                <View style={{ width: 32 }} />
            </View>

            {/* USER ID */}
            <Text style={styles.userId}>
                <Text style={{ color: "#ccc" }}>رقم المستخدم: </Text>U-2025-143
            </Text>

            {/* ACTIONS */}
            <View style={styles.card}>
                <SettingsItem label="تغيير البريد الإلكتروني" />
                <SettingsItem label="تغيير كلمة المرور" />
                <SettingsItem label="تغيير رقم الموبايل" />

                {/* Language */}
                <View style={styles.languageRow}>
                    {/* rechts → العربية ▼ */}
                    <View style={styles.languageSelector}>
                        <Text style={styles.languageValue}>العربية</Text>
                        <Text style={styles.languageArrow}>▼</Text>
                    </View>

                    {/* links → اللغة */}
                    <Text style={styles.languageLabel}>اللغة</Text>
                </View>



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

            {/* Notifications */}
            <Text style={styles.sectionTitle}>الإشعارات</Text>

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

            <TouchableOpacity style={styles.saveButton}>
                <Text style={styles.saveButtonText}>حفظ التغييرات</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

/* COMPONENT: Row for main actions */
function SettingsItem({ label }: { label: string }) {
    return (
        <TouchableOpacity style={styles.settingsItem}>
            <Text style={styles.settingsLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

/* COMPONENT: Switch Row */
function SwitchRow({ label, value, onChange }) {
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
        paddingTop: 50,
        direction: "rtl",
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
        paddingVertical: 2,
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
        gap: 0,
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
        marginBottom: 5,
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
        color: BLUE,
        fontSize: 18,
        fontFamily: "Tajawal-Bold",
    },
});
