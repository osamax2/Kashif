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

  // ✅ WIE index.tsx: Arabisch = LTR | Englisch = RTL
  const effectiveRTL = !isRTL;

  const [hideName, setHideName] = useState(false);
  const [notifReports, setNotifReports] = useState(true);
  const [notifPoints, setNotifPoints] = useState(false);
  const [notifGeneral, setNotifGeneral] = useState(true);
  const [successVisible, setSuccessVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [nameModal, setNameModal] = useState(false);
  const [name, setName] = useState(user?.full_name || "");
  const [hideNameMessage, setHideNameMessage] = useState<string | null>(null);

  const [languageSheet, setLanguageSheet] = useState(false);
  const selectedLanguage =
    language === "ar"
      ? t("settings.languages.ar")
      : t("settings.languages.en");

  const [emailModal, setEmailModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [phoneModal, setPhoneModal] = useState(false);

  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState((user as any)?.phone || "");

  const router = useRouter();

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleLogout = () => {
    Alert.alert(t("auth.logout"), t("auth.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("auth.logout"),
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const saveChanges = () => {
    const payload = {
      hideName,
      notifReports,
      notifPoints,
      notifGeneral,
      email,
      phone,
    };

    console.log("Gespeicherte Daten:", payload);
    setSuccessVisible(true);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { flexDirection: effectiveRTL ? "row-reverse" : "row" },
        ]}
      >
        <TouchableOpacity onPress={handleLogout} style={styles.iconBtn}>
          <Ionicons name="log-out-outline" size={28} color={YELLOW} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t("settings.title")}</Text>

        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons
            name={effectiveRTL ? "chevron-forward" : "chevron-back"}
            size={30}
            color={YELLOW}
          />
        </TouchableOpacity>
      </View>

      {/* USER */}
      <Text style={[styles.userId, { textAlign: effectiveRTL ? "right" : "left" }]}>
        <Text style={{ color: "#ccc" }}>   {t("profile.userId")} </Text>
        {user?.id ? `U-${user.id}` : "U-2025-143"}
      </Text>

      <Text
        style={[styles.userName, { textAlign: effectiveRTL ? "right" : "left" }]}
      >
        {user?.full_name || "مستخدم"}
      </Text>

      {/* ACTIONS */}
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => {
            setName(user?.full_name || "");
            setNameModal(true);
          }}
        >
          <Text style={[styles.textItem, { textAlign: effectiveRTL ? "right" : "left" }]}>
            {t("settings.changeName")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setEmail(user?.email || "");
            setEmailModal(true);
          }}
        >
          <Text style={[styles.textItem, { textAlign: effectiveRTL ? "right" : "left" }]}>
            {t("settings.changeEmail")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setPasswordModal(true)}>
          <Text style={[styles.textItem, { textAlign: effectiveRTL ? "right" : "left" }]}>
            {t("settings.changePassword")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setPhone((user as any)?.phone || "");
            setPhoneModal(true);
          }}
        >
          <Text style={[styles.textItem, { textAlign: effectiveRTL ? "right" : "left" }]}>
            {t("settings.changePhone")}
          </Text>
        </TouchableOpacity>

        {/* Language */}
        <TouchableOpacity
          onPress={() => setLanguageSheet(true)}
          style={[
            styles.languageRow,
            { flexDirection: effectiveRTL ? "row-reverse" : "row" },
          ]}
        >
          <View
            style={[
              styles.languageSelector,
              {
                flexDirection: effectiveRTL ? "row-reverse" : "row",
                // ✅ damit value immer auf der "anderen" Seite bleibt wie in index
                marginLeft: effectiveRTL ? 0 : "auto",
                marginRight: effectiveRTL ? "auto" : 0,
              },
            ]}
          >
            <Text style={styles.languageValue}>{selectedLanguage}</Text>
          </View>

          <Text
            style={[
              styles.languageLabel,
              { textAlign: effectiveRTL ? "right" : "left" },
            ]}
          >
            {t("settings.language")}:
          </Text>
        </TouchableOpacity>

        <SuccessModal
          visible={successVisible}
          message={t("settings.changesSaved")}
          onClose={() => setSuccessVisible(false)}
        />

        {/* Hide name */}
        <View
          style={[
            styles.switchRow,
            { flexDirection: effectiveRTL ? "row-reverse" : "row" },
          ]}
        >
          <Text
            style={[
              styles.switchText,
              { textAlign: effectiveRTL ? "right" : "left" },
            ]}
          >
            {t("settings.hideName")}
          </Text>

          <Switch
            value={hideName}
            onValueChange={(value) => {
              setHideName(value);
              const message = value
                ? effectiveRTL
                  ? "The name has been hidden from the list of reports"
                  : "تم إخفاء الاسم من قائمة البلاغات"
                : effectiveRTL
                ? "The name has been activated in the list of reports"
                : "تم تفعيل الاسم في قائمة البلاغات";

              setHideNameMessage(message);
              setTimeout(() => setHideNameMessage(null), 3000);
            }}
            trackColor={{ false: "#888", true: YELLOW }}
            thumbColor={hideName ? "#fff" : "#ccc"}
          />
        </View>

        {hideNameMessage && (
          <Text
            style={[
              styles.hideNameMessage,
              { textAlign: effectiveRTL ? "right" : "left" },
            ]}
          >
            {hideNameMessage}
          </Text>
        )}
      </View>

      <IOSActionSheet
        visible={languageSheet}
        onClose={() => setLanguageSheet(false)}
        options={[t("settings.languages.ar"), t("settings.languages.en")]}
        onSelect={async (choice: string) => {
          const newLang =
            choice === "العربية" || choice === t("settings.languages.ar")
              ? "ar"
              : "en";
          await setLanguage(newLang);
        }}
      />

      {/* Notifications */}
      <Text
        style={[
          styles.sectionTitle,
          { textAlign: effectiveRTL ? "right" : "left" },
        ]}
      >
        {"   "}
        {t("settings.notifications")}
      </Text>

      <View style={styles.card}>
        <SwitchRow
          isRTL={effectiveRTL}
          label={t("settings.notifReports")}
          value={notifReports}
          onChange={setNotifReports}
        />
        <SwitchRow
          isRTL={effectiveRTL}
          label={t("settings.notifPoints")}
          value={notifPoints}
          onChange={setNotifPoints}
        />
        <SwitchRow
          isRTL={effectiveRTL}
          label={t("settings.notifGeneral")}
          value={notifGeneral}
          onChange={setNotifGeneral}
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
        <Text style={styles.saveButtonText}>{t("settings.saveChanges")}</Text>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity
        style={[
          styles.logoutButton,
          { flexDirection: effectiveRTL ? "row-reverse" : "row" },
        ]}
        onPress={handleLogout}
      >
        <Ionicons
          name="log-out-outline"
          size={22}
          color="#fff"
          style={effectiveRTL ? { marginLeft: 8 } : { marginRight: 8 }}
        />
        <Text style={styles.logoutButtonText}>{t("auth.logout")}</Text>
      </TouchableOpacity>

      {/* MODALS */}
      <ChangeModal
        visible={emailModal}
        onClose={() => setEmailModal(false)}
        title={t("settings.changeEmail")}
        placeholder={t("settings.placeholders.newEmail")}
        value={email}
        setValue={setEmail}
        onSave={() => {
          showToast(t("common.success") + " 👍");
          setEmailModal(false);
        }}
      />

      <ChangeModal
        visible={nameModal}
        onClose={() => setNameModal(false)}
        title={t("settings.changeName")}
        placeholder={t("settings.placeholders.newName")}
        value={name}
        setValue={setName}
        onSave={() => {
          showToast(t("common.success") + " 👍");
          setNameModal(false);
        }}
      />

      <ChangeModal
        visible={passwordModal}
        onClose={() => setPasswordModal(false)}
        title={t("settings.changePassword")}
        placeholder={t("settings.placeholders.newPassword")}
        value={password}
        setValue={setPassword}
        onSave={() => {
          showToast(t("common.success") + " 👍");
          setPasswordModal(false);
        }}
      />

      <ChangeModal
        visible={phoneModal}
        onClose={() => setPhoneModal(false)}
        title={t("settings.changePhone")}
        placeholder={t("settings.placeholders.newPhone")}
        value={phone}
        setValue={setPhone}
        onSave={() => {
          showToast(t("common.success") + " 👍");
          setPhoneModal(false);
        }}
      />

      {toastMessage && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </ScrollView>
  );
}

/* Switch Row ✅ ohne I18nManager – wie index: bekommt isRTL von außen */
function SwitchRow({
  isRTL,
  label,
  value,
  onChange,
}: {
  isRTL: boolean;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={[styles.switchRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
      <Text style={[styles.switchText, { textAlign: isRTL ? "right" : "left" }]}>
        {label}
      </Text>

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

  headerTitle: {
    color: "white",
    fontSize: 24,
    fontFamily: "Tajawal-Bold",
  },

  iconBtn: { padding: 6 },

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
  },

  languageValue: {
    color: "#F4B400",
    fontSize: 14,
    fontFamily: "Tajawal-Bold",
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

  hideNameMessage: {
    color: YELLOW,
    fontSize: 14,
    fontFamily: "Tajawal-Regular",
    marginTop: 8,
    paddingHorizontal: 4,
  },

  toastContainer: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "#333",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },

  toastText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Tajawal-Regular",
  },
});
