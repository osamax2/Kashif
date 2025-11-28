// app/(tabs)/coupons.tsx
import CouponCard from "@/components/CouponCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { COUPONS, type Coupon } from "@/data/coupons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const PRIMARY = "#0D2B66";
const YELLOW = "#F4B400";

export default function CouponsScreen() {
  const [activeTab, setActiveTab] = useState<"inactive" | "active">("inactive");
  const [search, setSearch] = useState("");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const { t } = useLanguage();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // "Live" Laden simulieren
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      setCoupons(COUPONS);
      setLoading(false);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }, 700);

    return () => clearTimeout(t);
  }, []);

  const filtered = coupons.filter((c) => {
    const matchesTab = activeTab === "active" ? c.isActive : !c.isActive;

    // resolve localized strings for search
    const title = t(`coupons.${c.id}.title`);
    const desc = t(`coupons.${c.id}.desc`);

    const matchesSearch =
      search.trim().length === 0 ||
      title.includes(search) ||
      desc.includes(search);

    return matchesTab && matchesSearch;
  });

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>القسائم</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "inactive" && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab("inactive")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "inactive" && styles.tabTextActive,
            ]}
          >
            غير مفعّل
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "active" && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab("active")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "active" && styles.tabTextActive,
            ]}
          >
            مفعّل
          </Text>
        </TouchableOpacity>
      </View>

      {/* Suche */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={PRIMARY} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="بحث عن قسيمة"
          placeholderTextColor="#9BB1D8"
          style={styles.searchInput}
          textAlign="right"
        />
      </View>

      {/* Inhalt */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={YELLOW} />
          <Text style={styles.loadingText}>يتم تحميل القسائم...</Text>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            style={{ marginTop: 12 }}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {filtered.map((c) => (
              <CouponCard
                key={c.id}
                coupon={c}
                onPress={() =>
                  router.push({ pathname: "/coupon-details", params: { id: c.id } })
                }
              />
            ))}

            {filtered.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>لا توجد قسائم في هذا القسم</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PRIMARY,
    paddingTop: 48,
    paddingHorizontal: 14,
    direction: "rtl",
  },
  header: {
    alignItems: "center",
    marginBottom: 6,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 24,
    fontFamily: "Tajawal-Bold",
  },
  tabRow: {
    flexDirection: "row-reverse",
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 4,
    borderRadius: 16,
    marginVertical: 10,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: "center",
  },
  tabItemActive: {
    backgroundColor: "#FFF",
  },
  tabText: {
    color: "#FFF",
    fontSize: 15,
    fontFamily: "Tajawal-Bold",
  },
  tabTextActive: {
    color: PRIMARY,
  },
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
    fontSize: 15,
    paddingHorizontal: 10,
    color: PRIMARY,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#E3ECFF",
    marginTop: 10,
    fontFamily: "Tajawal-Regular",
  },
  emptyBox: {
    marginTop: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#E3ECFF",
    fontFamily: "Tajawal-Regular",
  },
});
