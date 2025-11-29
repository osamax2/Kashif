import { useLanguage } from "@/contexts/LanguageContext";
import { COUPONS } from "@/data/coupons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PRIMARY = "#0D2B66";  // Blau
const YELLOW = "#F4B400";   // Gelb

export default function CouponDetails() {
  const { id } = useLocalSearchParams();
  const { t } = useLanguage();
  const coupon = COUPONS.find((c) => c.id === id) ?? COUPONS[0];

  const title = t(`coupons.${coupon.id}.title`);
  const desc = t(`coupons.${coupon.id}.desc`);
  const validText = t(`coupons.${coupon.id}.validText`);
  const pointsLabel = t(`coupons.${coupon.id}.pointsLabel`);

  return (
    <View style={styles.root}>
      {/* HEADER */}
     <View style={styles.header}>
  <TouchableOpacity
    onPress={() => router.back()}
    style={styles.headerIcon}
  >
    <Ionicons name="arrow-forward" size={26} color={PRIMARY} />
  </TouchableOpacity>

  <Text style={styles.headerTitle}>تفاصيل القسيمة</Text>

  {/* Platzhalter, damit der Titel zentriert bleibt */}
  <View style={{ width: 30 }} />
</View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* COUPON CARD */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Image source={coupon.image} style={styles.cardIcon} />

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardDesc}>{desc}</Text>
              <Text style={styles.cardDate}>{validText}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.activateBtn}>
            <Text style={styles.activateText}>{t('coupons.activate')}</Text>
          </TouchableOpacity>
        </View>

        {/* VALID DATE SECTION */}
        <Text style={styles.sectionGrey}>{validText}</Text>

        {/* OFFER SECTION */}
        <Text style={styles.sectionTitle}>العرض</Text>
        <Text style={styles.sectionText}>
          ١٠٠٠ نقطة EXTRA عند التسوق عبر الإنترنت من قيمة ٣٠€ في أكثر من ٧٠٠ متجر.
        </Text>

        {/* INFO SECTION */}
        <Text style={styles.sectionTitle}>معلومات مهمة</Text>
        <Text style={styles.sectionText}>
          قم بتفعيل القسيمة الآن واحصل على ١٠٠٠ نقطة إضافية عند شراء بقيمة ٣٠€.
        </Text>
        <Text style={styles.sectionText}>
          يُرجى قراءة الشروط الخاصة بالمتاجر الغير مشاركة.
        </Text>

        {/* NOTES SECTION */}
        <Text style={styles.sectionTitle}>يرجى الانتباه</Text>
        <Text style={styles.sectionText}>
          * بعض الفئات مستثناة من النقاط الإضافية.  
          * لن يتم احتساب النقاط عند إرجاع الطلب.
        </Text>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

/* ==================== STYLES ==================== */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    paddingTop: 40,
    direction: "rtl",
  },

  /* HEADER */
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#FFF",
    height: 60,
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 22,
    color: PRIMARY,
    fontFamily: "Tajawal-Bold",
  },

  /* CARD */
  card: {
    backgroundColor: "#FFF",
    margin: 16,
    padding: 18,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },

  cardTop: {
    flexDirection: "row-reverse",
    alignItems: "center",
  },

  cardIcon: {
    width: 60,
    height: 60,
    marginLeft: 12,
  },

  cardTitle: {
    color: PRIMARY,
    fontSize: 22,
    fontFamily: "Tajawal-Bold",
  },

  cardDesc: {
    color: "#333",
    fontSize: 15,
    marginTop: 4,
  },

  cardDate: {
    color: "#555",
    fontSize: 13,
    marginTop: 6,
  },

  activateBtn: {
    backgroundColor: YELLOW,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 18,
    alignItems: "center",
  },

  activateText: {
    color: PRIMARY,
    fontSize: 18,
    fontFamily: "Tajawal-Bold",
  },

  /* SECTIONS */
  sectionGrey: {
    fontSize: 15,
    color: "#777",
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
  },

  sectionTitle: {
    fontSize: 20,
    color: PRIMARY,
    fontFamily: "Tajawal-Bold",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 6,
  },

  sectionText: {
    fontSize: 15,
    color: "#444",
    paddingHorizontal: 16,
    lineHeight: 24,
  },
  headerIcon: {
  padding: 6,
},
});
