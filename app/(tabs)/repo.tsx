import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function ReportsScreen() {
  const reports = [
    { id: "1239878", date: "10.11.2024", status: "مفتوح", icon: "🔍" },
    { id: "6676434", date: "12.05.2022", status: "تم الإصلاح", icon: "✔️" },
    { id: "1234567", date: "01.12.2021", status: "قيد المراجعة", icon: "⏳" },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>البلاغات</Text>

      {/* Section Title */}
      <Text style={styles.sectionTitle}>إحصائيات بلاغاتي</Text>

      {/* Neon Stats Row */}
      <View style={styles.statsRow}>
        <NeonCircle title="البلاغات المقترحة" value="90%" color="#4F46E5" />
        <NeonCircle title="البلاغات قيد المعالجة" value="40%" color="#FF6B6B" />
        <NeonCircle title="تم إصلاحها" value="64%" color="#4ADE80" />
      </View>

      {/* Alerts Box */}
      <View style={styles.alertBox}>
        <Text style={styles.alertTitle}>تنبيهات فورية</Text>
        <Text style={styles.alertText}>⏰ لا يوجد تنبيهات جديدة الآن</Text>
        <Text style={styles.alertEdit}>تعديل</Text>
      </View>

      {/* Neon Table */}
      <Text style={styles.sectionTitle}>قائمة بلاغاتي</Text>

      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={styles.tableHeader}>الحالة</Text>
          <Text style={styles.tableHeader}>التاريخ</Text>
          <Text style={styles.tableHeader}>رقم البلاغ</Text>
        </View>

        {reports.map((r, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.tableCell}>{r.icon + " " + r.status}</Text>
            <Text style={styles.tableCell}>{r.date}</Text>
            <Text style={styles.tableCell}>{r.id}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/* ---------------------- Neon Circle Component ---------------------- */

function NeonCircle({ title, value, color }) {
  return (
    <View style={styles.circleContainer}>
      <View style={[styles.circleGlow, { shadowColor: color }]} />
      <View style={[styles.circle, { borderColor: color }]}>
        <Text style={styles.circleValue}>{value}</Text>
      </View>
      <Text style={styles.circleLabel}>{title}</Text>
    </View>
  );
}

/* ---------------------- Styles ---------------------- */

const BLUE = "#0D2B66";
const YELLOW = "#F4B400";

const styles = StyleSheet.create({
  container: {
    backgroundColor: BLUE,
    padding: 16,
    direction: "rtl",
    flex: 1,
  },

  header: {
    color: "white",
    fontSize: 26,
    textAlign: "center",
    fontFamily: "Tajawal-Bold",
    marginVertical: 10,
  },

  sectionTitle: {
    color: YELLOW,
    fontSize: 18,
    marginVertical: 14,
    fontFamily: "Tajawal-Bold",
  },

  /* ---------------- Neon Stats ---------------- */
  statsRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  circleContainer: {
    alignItems: "center",
    width: "33%",
  },

  circle: {
    width: 90,
    height: 90,
    borderRadius: 50,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D2B66",
  },

  circleValue: {
    color: "white",
    fontSize: 22,
    fontFamily: "Tajawal-Bold",
  },

  circleLabel: {
    color: "#DCE1EB",
    marginTop: 6,
    fontFamily: "Tajawal-Regular",
  },

  circleGlow: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 50,
    shadowRadius: 12,
    shadowOpacity: 0.9,
    shadowOffset: { width: 0, height: 0 },
  },

  /* ---------------- Alerts Box ---------------- */
  alertBox: {
    backgroundColor: "#112F66",
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  alertTitle: {
    color: YELLOW,
    fontFamily: "Tajawal-Bold",
    fontSize: 16,
    marginBottom: 6,
  },

  alertText: {
    color: "#DCE1EB",
    fontFamily: "Tajawal-Regular",
    marginBottom: 8,
  },

  alertEdit: {
    color: YELLOW,
    alignSelf: "flex-start",
    fontFamily: "Tajawal-Medium",
  },

  /* ---------------- Neon Table ---------------- */
  table: {
    width: "100%",
    backgroundColor: "#112F66",
    borderRadius: 14,
    overflow: "hidden",
    borderColor: YELLOW,
    borderWidth: 1.2,
  },

  tableHeaderRow: {
    flexDirection: "row-reverse",
    backgroundColor: YELLOW,
    padding: 10,
  },

  tableHeader: {
    flex: 1,
    textAlign: "center",
    color: BLUE,
    fontFamily: "Tajawal-Bold",
    fontSize: 15,
  },

  tableRow: {
    flexDirection: "row-reverse",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  tableCell: {
    flex: 1,
    textAlign: "center",
    color: "white",
    fontFamily: "Tajawal-Regular",
    fontSize: 15,
  },
});
