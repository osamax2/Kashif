import Header from "@/components/Header";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    FlatList,
    I18nManager,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const BLUE = "#0D2B66";
const LIGHT_CARD = "rgba(255,255,255,0.09)";
const BORDER = "rgba(255,255,255,0.18)";
const YELLOW = "#F4B400";

const INITIAL_NOTIFICATIONS = [
  { id: "1", type: "success", message: "تم إصلاح الحفرة رقم 23", time: "منذ لحظات" },
  { id: "2", type: "update", message: "تغيير حالة البلاغ رقم 551233", time: "قبل دقيقتين" },
  { id: "3", type: "warning", message: "بلاغك قيد المراجعة الآن", time: "اليوم 12:10" },
  { id: "4", type: "points", message: "حصلت على +20 نقاط جديدة ⭐", time: "اليوم 10:40" },
];

export default function ModernNotifications() {
  const router = useRouter();
  const [items, setItems] = useState(INITIAL_NOTIFICATIONS);

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setItems([]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return { icon: "checkmark-circle", color: "#4ADE80" };
      case "warning":
        return { icon: "warning", color: "#FACC15" };
      case "update":
        return { icon: "sync", color: "#60A5FA" };
      case "points":
        return { icon: "star", color: "#F4B400" };
      default:
        return { icon: "notifications", color: "#FFD166" };
    }
  };

  const renderDelete = (id: string) => (
    <View style={styles.deleteBox}>
      <Ionicons name="trash" size={26} color="#fff" />
    </View>
  );

  const renderItem = ({ item }: { item: (typeof INITIAL_NOTIFICATIONS)[number] }) => {
    const meta = getIcon(item.type);

    return (
      <Swipeable
        renderRightActions={() => renderDelete(item.id)}
        renderLeftActions={() => renderDelete(item.id)}
        overshootLeft={false}
        overshootRight={false}
        onSwipeableRightOpen={() => deleteItem(item.id)}
        onSwipeableLeftOpen={() => deleteItem(item.id)}
      >
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: meta.color + "22" }]}>
            <Ionicons name={meta.icon as any} size={26} color={meta.color} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.msg}>{item.message}</Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>
        </View>
      </Swipeable>
    );
  };

  const hasNotifications = items.length > 0;

  return (
    <View style={styles.root}>
      <Header title="الإشعارات" rightIcon="chevron-forward" onRightPress={() => router.back()} />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-circle" size={50} color={YELLOW} />
            <Text style={styles.emptyText}>لا توجد إشعارات حالياً</Text>
            <Text style={styles.emptySub}>
              سنخبرك فور وصول تحديثات جديدة لبلاغاتك.
            </Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />

      {/* 🔥 Neuer Button „مسح كل الإشعارات“ */}
      <TouchableOpacity
        style={[
          styles.clearButton,
          !hasNotifications && styles.clearButtonDisabled,
        ]}
        disabled={!hasNotifications}
        onPress={clearAll}
        activeOpacity={0.9}
      >
        <Ionicons
          name="trash-outline"
          size={20}
          color={hasNotifications ? BLUE : "#666"}
          style={{ marginLeft: 6 }}
        />
        <Text style={styles.clearButtonText}>مسح كل الإشعارات</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BLUE,
    paddingHorizontal: 18,
    paddingTop: 50,
  },

  title: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "Tajawal-Bold",
    textAlign: "center",
    marginBottom: 20,
  },

  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 16,
    borderRadius: 22,
    backgroundColor: LIGHT_CARD,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },

  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 14,
  },

  msg: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Tajawal-Regular",
    marginBottom: 4,
    textAlign: "left",
  },

  time: {
    color: "#B9CBF2",
    fontSize: 13,
    fontFamily: "Tajawal-Regular",
    textAlign: "left",
  },

  deleteBox: {
    width: 80,
    backgroundColor: "#E35151",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    marginVertical: 6,
  },

  emptyBox: {
    marginTop: 80,
    alignItems: "center",
    paddingHorizontal: 20,
  },

  emptyText: {
    marginTop: 10,
    fontSize: 18,
    color: "#fff",
    fontFamily: "Tajawal-Bold",
  },

  emptySub: {
    marginTop: 6,
    fontSize: 14,
    color: "#B9CBF2",
    fontFamily: "Tajawal-Regular",
    textAlign: "center",
  },

  clearButton: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: YELLOW,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  clearButtonDisabled: {
    opacity: 0.5,
  },

  clearButtonText: {
    color: BLUE,
    fontSize: 16,
    fontFamily: "Tajawal-Bold",
  },
});
