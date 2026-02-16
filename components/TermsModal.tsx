// components/TermsModal.tsx
import { useLanguage } from "@/contexts/LanguageContext";
import { authAPI, TermsOfService } from "@/services/api";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BLUE = "#0D2B66";
const YELLOW = "#F4B400";

interface Props {
  visible: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export default function TermsModal({ visible, onClose, onAccept, showAcceptButton = false }: Props) {
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const effectiveRTL = !isRTL;
  const [tos, setTos] = useState<TermsOfService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (visible) {
      loadTos();
    }
  }, [visible]);

  const loadTos = async () => {
    setLoading(true);
    setError(false);
    try {
      const currentTos = await authAPI.getCurrentTos();
      setTos(currentTos);
    } catch (e) {
      console.log("Failed to load TOS:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const title = tos ? (effectiveRTL ? tos.title_ar : tos.title_en) : "";
  const content = tos ? (effectiveRTL ? tos.content_ar : tos.content_en) : "";

  const dir: { textAlign: "right" | "left"; writingDirection: "rtl" | "ltr" } = {
    textAlign: effectiveRTL ? "right" : "left",
    writingDirection: effectiveRTL ? "rtl" : "ltr",
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[styles.header, { flexDirection: effectiveRTL ? "row-reverse" : "row" }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, dir]}>
            {title || t("terms.title")}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={YELLOW} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{t("terms.loadError")}</Text>
            <TouchableOpacity onPress={loadTos} style={styles.retryBtn}>
              <Text style={styles.retryText}>{t("terms.retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {tos?.version && (
              <Text style={[styles.version, dir]}>
                {t("terms.version")}: {tos.version}
              </Text>
            )}
            <Text style={[styles.contentText, dir]}>
              {content}
            </Text>
          </ScrollView>
        )}

        {/* Accept Button */}
        {showAcceptButton && !loading && !error && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={onAccept}
            >
              <Text style={styles.acceptBtnText}>{t("terms.accept")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BLUE,
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Tajawal-Bold",
    flex: 1,
    textAlign: "center",
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    color: "#fff",
    fontSize: 20,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 16,
    fontFamily: "Tajawal-Medium",
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: YELLOW,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontFamily: "Tajawal-Bold",
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  version: {
    color: YELLOW,
    fontSize: 13,
    fontFamily: "Tajawal-Medium",
    marginBottom: 12,
  },
  contentText: {
    color: "#E0E8F5",
    fontSize: 15,
    lineHeight: 26,
    fontFamily: "Tajawal-Regular",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  acceptBtn: {
    backgroundColor: YELLOW,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  acceptBtnText: {
    color: "#fff",
    fontFamily: "Tajawal-Bold",
    fontSize: 16,
  },
});
