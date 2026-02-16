import ChangeModal from "@/components/ChangeModal";
import IOSActionSheet from "@/components/IOSActionSheet";
import SuccessModal from "@/components/SuccessModal";
import TermsModal from "@/components/TermsModal";
import Ionicons from "@expo/vector-icons/Ionicons";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import NotificationService, { DEFAULT_NOTIFICATION_PREFERENCES } from "@/services/notifications";
import {
    ActivityIndicator,
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
  const [notifStatusUpdates, setNotifStatusUpdates] = useState(true);
  const [notifPoints, setNotifPoints] = useState(true);
  const [notifCoupons, setNotifCoupons] = useState(true);
  const [notifGeneral, setNotifGeneral] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState(22);
  const [quietHoursEnd, setQuietHoursEnd] = useState(7);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
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
  const [showTerms, setShowTerms] = useState(false);

  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState((user as any)?.phone || "");

  const router = useRouter();

  // Load notification preferences from backend
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const prefs = await NotificationService.getPreferences();
        setNotifReports(prefs.report_notifications);
        setNotifStatusUpdates(prefs.status_updates);
        setNotifPoints(prefs.points_notifications);
        setNotifCoupons(prefs.coupon_notifications);
        setNotifGeneral(prefs.general_notifications);
        setQuietHoursEnabled(prefs.quiet_hours_enabled);
        setQuietHoursStart(prefs.quiet_hours_start);
        setQuietHoursEnd(prefs.quiet_hours_end);
      } catch (e) {
        console.error("Failed to load notification prefs:", e);
      } finally {
        setPrefsLoading(false);
      }
    };
    loadPrefs();
  }, []);

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

  const saveChanges = async () => {
    setPrefsSaving(true);
    try {
      await NotificationService.updatePreferences({
        report_notifications: notifReports,
        status_updates: notifStatusUpdates,
        points_notifications: notifPoints,
        coupon_notifications: notifCoupons,
        general_notifications: notifGeneral,
        quiet_hours_enabled: quietHoursEnabled,
        quiet_hours_start: quietHoursStart,
        quiet_hours_end: quietHoursEnd,
      });
      setSuccessVisible(true);
    } catch (e) {
      console.error("Failed to save notification prefs:", e);
      showToast(effectiveRTL ? "Save failed" : "فشل الحفظ");
    } finally {
      setPrefsSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      {/* Header ✅ UMGEKEHRT */}
<View style={[styles.header, { flexDirection: "row" }]}>
  {/* LEFT */}
  <TouchableOpacity
    onPress={isRTL ? () => router.back() : handleLogout}
    style={styles.iconBtn}
  >
    <Ionicons
      name={isRTL ? "chevron-back" : "log-out-outline"}
      size={isRTL ? 30 : 28}
      color={YELLOW}
    />
  </TouchableOpacity>

  <Text style={styles.headerTitle}>{t("settings.title")}</Text>

  {/* RIGHT */}
  <TouchableOpacity
    onPress={isRTL ? handleLogout : () => router.back()}
    style={styles.iconBtn}
  >
    <Ionicons
      name={isRTL ? "log-out-outline" : "chevron-forward"}
      size={isRTL ? 28 : 30}
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

      {prefsLoading ? (
        <View style={[styles.card, { alignItems: "center", padding: 20 }]}>
          <ActivityIndicator size="small" color={YELLOW} />
        </View>
      ) : (
        <View style={styles.card}>
          <SwitchRow
            isRTL={effectiveRTL}
            label={t("settings.notifReports")}
            value={notifReports}
            onChange={setNotifReports}
          />
          <SwitchRow
            isRTL={effectiveRTL}
            label={t("settings.notifStatusUpdates")}
            value={notifStatusUpdates}
            onChange={setNotifStatusUpdates}
          />
          <SwitchRow
            isRTL={effectiveRTL}
            label={t("settings.notifPoints")}
            value={notifPoints}
            onChange={setNotifPoints}
          />
          <SwitchRow
            isRTL={effectiveRTL}
            label={t("settings.notifCoupons")}
            value={notifCoupons}
            onChange={setNotifCoupons}
          />
          <SwitchRow
            isRTL={effectiveRTL}
            label={t("settings.notifGeneral")}
            value={notifGeneral}
            onChange={setNotifGeneral}
          />

          {/* Quiet Hours */}
          <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: "#333", paddingTop: 12 }}>
            <SwitchRow
              isRTL={effectiveRTL}
              label={t("settings.quietHours")}
              value={quietHoursEnabled}
              onChange={setQuietHoursEnabled}
            />
            {quietHoursEnabled && (
              <View style={{ paddingHorizontal: 8, marginTop: 8 }}>
                <Text style={{ color: "#aaa", fontSize: 12, marginBottom: 8, textAlign: effectiveRTL ? "right" : "left" }}>
                  {t("settings.quietHoursDesc")}
                </Text>
                <View style={{ flexDirection: effectiveRTL ? "row-reverse" : "row", justifyContent: "space-between" }}>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#ccc", fontSize: 12, marginBottom: 4 }}>{t("settings.quietHoursStart")}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <TouchableOpacity
                        onPress={() => setQuietHoursStart((prev) => (prev === 0 ? 23 : prev - 1))}
                        style={{ padding: 8 }}
                      >
                        <Text style={{ color: YELLOW, fontSize: 20, fontWeight: "bold" }}>−</Text>
                      </TouchableOpacity>
                      <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold", minWidth: 50, textAlign: "center" }}>
                        {String(quietHoursStart).padStart(2, "0")}:00
                      </Text>
                      <TouchableOpacity
                        onPress={() => setQuietHoursStart((prev) => (prev === 23 ? 0 : prev + 1))}
                        style={{ padding: 8 }}
                      >
                        <Text style={{ color: YELLOW, fontSize: 20, fontWeight: "bold" }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#ccc", fontSize: 12, marginBottom: 4 }}>{t("settings.quietHoursEnd")}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <TouchableOpacity
                        onPress={() => setQuietHoursEnd((prev) => (prev === 0 ? 23 : prev - 1))}
                        style={{ padding: 8 }}
                      >
                        <Text style={{ color: YELLOW, fontSize: 20, fontWeight: "bold" }}>−</Text>
                      </TouchableOpacity>
                      <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold", minWidth: 50, textAlign: "center" }}>
                        {String(quietHoursEnd).padStart(2, "0")}:00
                      </Text>
                      <TouchableOpacity
                        onPress={() => setQuietHoursEnd((prev) => (prev === 23 ? 0 : prev + 1))}
                        style={{ padding: 8 }}
                      >
                        <Text style={{ color: YELLOW, fontSize: 20, fontWeight: "bold" }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={saveChanges} disabled={prefsSaving}>
        {prefsSaving ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <Text style={styles.saveButtonText}>{t("settings.saveChanges")}</Text>
        )}
      </TouchableOpacity>

      {/* Send Feedback */}
      <TouchableOpacity
        style={[
          styles.feedbackButton,
          { flexDirection: effectiveRTL ? "row-reverse" : "row" },
        ]}
        onPress={() => router.push("/feedback")}
      >
        <FontAwesome
          name="comment"
          size={18}
          color="#F4B400"
          style={effectiveRTL ? { marginLeft: 8 } : { marginRight: 8 }}
        />
        <Text style={styles.feedbackButtonText}>{t("feedback.menuTitle")}</Text>
      </TouchableOpacity>

      {/* View Terms of Service */}
      <TouchableOpacity
        style={[
          styles.feedbackButton,
          { flexDirection: effectiveRTL ? "row-reverse" : "row" },
        ]}
        onPress={() => setShowTerms(true)}
      >
        <FontAwesome
          name="file-text-o"
          size={18}
          color="#F4B400"
          style={effectiveRTL ? { marginLeft: 8 } : { marginRight: 8 }}
        />
        <Text style={styles.feedbackButtonText}>{t("terms.title")}</Text>
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

      <TermsModal
        visible={showTerms}
        onClose={() => setShowTerms(false)}
      />
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

  feedbackButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(244,180,0,0.3)",
  },

  feedbackButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Tajawal-Medium",
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
