import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const PRIMARY = "#0D2B66";   // Dunkelblau
const YELLOW = "#F4B400";    // Gelb

export default function CouponsScreen() {
  const [activeTab, setActiveTab] = useState("inactive"); // inactive | active
  const [search, setSearch] = useState("");

  const coupons = [
    {
      id: 1,
      title: "1.000 EXTRA نقاط",
      desc: "على الشراء أونلاين بقيمة 30€ من أكثر من 700 متجر",
      valid: "صالح حتى 01.12.2025",
      image: require("../../assets/icons/speed.png"),
    },
    {
      id: 2,
      title: "45X نقاط إضافية",
      desc: "على التسوّق عبر الانترنت وعروض BLACK WEEK",
      valid: "صالح حتى 28.11.2025",
      image: require("../../assets/icons/pothole.png"),
    },
  ];

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>القسائم</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "inactive" && styles.tabItemActive]}
          onPress={() => setActiveTab("inactive")}
        >
          <Text style={[styles.tabText, activeTab === "inactive" && styles.tabTextActive]}>
            غير مفعّل
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "active" && styles.tabItemActive]}
          onPress={() => setActiveTab("active")}
        >
          <Text style={[styles.tabText, activeTab === "active" && styles.tabTextActive]}>
            مفعّل
          </Text>
        </TouchableOpacity>
      </View>

      {/* SUCHLEISTE */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={22} color={PRIMARY} />
        <TextInput
          placeholder="بحث"
          placeholderTextColor="#9BB1D8"
          style={styles.searchInput}
        />
      </View>

      {/* LISTE */}
      <ScrollView style={{ marginTop: 10 }}>
        {coupons.map((c) => (
          <TouchableOpacity
            style={styles.card}
            key={c.id}
            onPress={() =>
              router.push({ pathname: "/coupon-details", params: { id: c.id } })
            }
          >
            <View style={styles.cardTop}>
              <Image source={c.image} style={styles.cardIcon} />

              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardDesc}>{c.desc}</Text>
                <Text style={styles.cardDate}>{c.valid}</Text>
              </View>
            </View>

            <View style={styles.cardBtn}>
              <Text style={styles.cardBtnText}>تفعيل الآن</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PRIMARY, paddingTop: 48, paddingHorizontal: 14 },

  /* HEADER */
  header: {
    alignItems: "center",
    marginBottom: 6,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 24,
    fontFamily: "Tajawal-Bold",
  },

  /* TABS */
  tabRow: {
    flexDirection: "row-reverse",
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 4,
    borderRadius: 14,
    marginVertical: 10,
  },

  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },

  tabItemActive: {
    backgroundColor: "#FFF",
  },

  tabText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Tajawal-Bold",
  },

  tabTextActive: {
    color: PRIMARY,
  },

  /* SEARCH */
  searchBox: {
    backgroundColor: "#FFF",
    flexDirection: "row-reverse",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 45,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 10,
    textAlign: "right",
    color: PRIMARY,
  },

  /* CARD */
  card: {
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 18,
    marginBottom: 14,
  },

  cardTop: {
    flexDirection: "row-reverse",
    alignItems: "center",
  },

  cardIcon: {
    width: 52,
    height: 52,
    marginLeft: 14,
  },

  cardTitle: {
    color: PRIMARY,
    fontSize: 20,
    fontFamily: "Tajawal-Bold",
  },

  cardDesc: {
    color: "#333",
    fontSize: 14,
    marginVertical: 4,
  },

  cardDate: {
    color: "#666",
    fontSize: 12,
  },

  /* BUTTON */
  cardBtn: {
    backgroundColor: YELLOW,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    alignItems: "center",
  },

  cardBtnText: {
    color: PRIMARY,
    fontSize: 16,
    fontFamily: "Tajawal-Bold",
  },
});
