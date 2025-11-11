import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, I18nManager, ScrollView } from "react-native";
import { FontAwesome, MaterialCommunityIcons } from "@expo/vector-icons";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function Profile() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.headerTitle}>الملف الشخصي</Text>

        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            <Text style={styles.levelNumber}>4</Text>
          </View>
          <Text style={styles.levelLabel}>محترف 🚀</Text>
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: "65%" }]} />
          </View>
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.userName}>أحمد محمد</Text>
          <Text style={styles.coins}><Text style={styles.coinsNumber}>340</Text> نقطة  <FontAwesome name="coins" size={16} color="#F4B400" /></Text>
        </View>

        <View style={styles.achievements}
        >
          <Text style={styles.rankText}>المركز الرابع في منطقتك 🏆</Text>
          <Text style={styles.rankText}>المركز السادس في سوريا 🏆</Text>

          <Text style={styles.latestTitle}>آخر المكافآت المكتسبة:</Text>

          <View style={styles.rewardRow}><FontAwesome name="handshake-o" size={18} color="#F4B400" style={styles.rewardIcon} /><Text style={styles.rewardText}>+10 بلاغ جديد</Text></View>
          <View style={styles.rewardRow}><FontAwesome name="handshake-o" size={18} color="#F4B400" style={styles.rewardIcon} /><Text style={styles.rewardText}>+20 تم إصلاح</Text></View>
          <View style={styles.rewardRow}><FontAwesome name="handshake-o" size={18} color="#F4B400" style={styles.rewardIcon} /><Text style={styles.rewardText}>+10 بلاغ جديد</Text></View>
        </View>

        <TouchableOpacity style={styles.shareBtn} activeOpacity={0.9}>
          <Text style={styles.shareText}>شارك إنجازك</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#0D2B66",
    alignItems: "center",
    paddingVertical: 20,
  },
  inner: {
    width: "92%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 6,
    marginBottom: 18,
    textAlign: "center",
  },
  avatarWrap: {
    alignItems: "center",
    marginBottom: 14,
  },
  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: "#7EA2F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  levelNumber: { color: "#F4B400", fontSize: 36, fontWeight: "700" },
  levelLabel: { color: "#FFFFFF", marginTop: 6 },
  progressRow: { width: "100%", paddingVertical: 10 },
  progressBarBg: {
    height: 14,
    backgroundColor: "#2E4B8A",
    borderRadius: 8,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: "#F4B400" },
  nameRow: { width: "100%", flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  userName: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  coins: { color: "#F4B400", fontSize: 14, alignItems: "center" },
  coinsNumber: { color: "#F4B400", fontWeight: "700", marginRight: 6 },
  achievements: { width: "100%", marginTop: 20, alignItems: "flex-start" },
  rankText: { color: "#BFD7EA", textAlign: "right", marginBottom: 8 },
  latestTitle: { color: "#F4B400", fontWeight: "700", marginTop: 8, marginBottom: 8 },
  rewardRow: { flexDirection: "row-reverse", alignItems: "center", marginBottom: 8 },
  rewardIcon: { marginLeft: 8 },
  rewardText: { color: "#FFFFFF" },
  shareBtn: {
    backgroundColor: "#F4B400",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 18,
  },
  shareText: { color: "#0D2B66", fontWeight: "700" },
});
