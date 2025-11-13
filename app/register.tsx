// app/register.tsx
import React, { useState } from "react";
import { I18nManager, ScrollView, StyleSheet, Text, TextInput, View, TouchableOpacity, Switch } from "react-native";
import { useRouter } from "expo-router";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function Register() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [dept, setDept] = useState("");
    const [tos, setTos] = useState(true);
    const [news, setNews] = useState(true);

    const onSubmit = () => {
        // TODO: Registrierung-API
        router.replace("/(tabs)"); // nach erfolgreicher Registrierung in die App
    };

    return (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>إنشاء حساب جديد</Text>

            <View style={styles.field}>
                <Text style={styles.label}>البريد الإلكتروني</Text>
                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="اكتب بريدك الإلكتروني" placeholderTextColor="#AAB3C0" textAlign="right" />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>كلمة المرور</Text>
                <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="اكتب كلمة المرور" placeholderTextColor="#AAB3C0" secureTextEntry textAlign="right" />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>الاسم</Text>
                <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="اكتب اسمك الأول" placeholderTextColor="#AAB3C0" textAlign="right" />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>الكنية</Text>
                <TextInput style={styles.input} value={dept} onChangeText={setDept} placeholder="اكتب الكنية" placeholderTextColor="#AAB3C0" textAlign="right" />
            </View>

            <View style={styles.switchRow}>
                <Text style={styles.switchText}>أوافق على شروط الاستخدام وسياسة الخصوصية</Text>
                <Switch value={tos} onValueChange={setTos} />
            </View>
            <View style={styles.switchRow}>
                <Text style={styles.switchText}>أرغب في استلام آخر الأخبار والعروض عبر البريد الإلكتروني</Text>
                <Switch value={news} onValueChange={setNews} />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push("/home")}>
                <Text style={styles.primaryText}>تسجيل حساب جديد</Text>
            </TouchableOpacity>

            {/* Unten: zurück zum Login – zentriert */}
            <TouchableOpacity style={{ width: "100%", alignItems: "center", marginTop: 20 }} onPress={() => router.back("/tabs/index")}>
                <Text style={styles.backToLogin}>لديك حساب؟ سجل الدخول</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: "#0D2B66", paddingHorizontal: 24, paddingVertical: 28, alignItems: "stretch", direction: "rtl" },
    title: { color: "#fff", fontSize: 24, fontFamily: "Tajawal-Bold", textAlign: "center", marginBottom: 24 },
    field: { marginBottom: 18 },
    label: { color: "#F4B400", fontSize: 16, fontFamily: "Tajawal-Medium", textAlign: "left", marginBottom: 8 },
    input: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.4)", color: "#fff", paddingVertical: 8, fontSize: 15 },
    switchRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
    switchText: { color: "#fff", flex: 1, textAlign: "left", marginHorizontal: 8 },
    primaryBtn: { backgroundColor: "#F4B400", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 18, elevation: 3 },
    primaryText: { color: "#fff", fontFamily: "Tajawal-Bold", fontSize: 16 },
    backToLogin: { color: "#A8C6FA", textDecorationLine: "underline", fontFamily: "Tajawal-Regular", fontSize: 15, textAlign: "center" },
});