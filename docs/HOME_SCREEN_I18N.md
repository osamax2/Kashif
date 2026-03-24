# Home Screen - i18n Integration ✅

## Abgeschlossene Änderungen

### 1. **Import und Hook Integration**
```typescript
import { useLanguage } from '@/contexts/LanguageContext';
const { t, language } = useLanguage();
```

### 2. **Übersetzte UI-Elemente**

#### Header:
- ✅ **Title**: "الرئيسية" → `t('home.title')`

#### Search:
- ✅ **Placeholder**: "ابحث عن موقع أو شارع" → dynamisch basierend auf Sprache
- ✅ **Google Places API**: Language parameter dynamisch (`language`)

#### Info Bar:
- ✅ **Active Reports**: Zeigt auf Arabisch/Englisch basierend auf `language`

#### Audio Sheet:
- ✅ **Title**: "إعدادات الصوت" → `t('home.soundSettings')`
- ✅ **Volume Label**: "مستوى صوت التطبيق" → `t('home.volume')`
- ✅ **Test Sound Button**: "اختبار الصوت" → `t('home.testSound')`
- ✅ **Close Button**: "إغلاق" → `t('common.close')`

#### Alert Type Buttons:
- ✅ **Pothole**: "حفرة" → `t('home.pothole')`
- ✅ **Accident**: "حادث" → `t('home.accident')`
- ✅ **Speed Camera**: "كاشف السرعة" → `t('home.speedCamera')`

### 3. **Funktionen mit i18n**

#### `speakWarning(type)`:
```typescript
// Arabisch/Englisch basierend auf language
message = t('home.warnPothole')  // "تحذير! توجد حفرة أمامك" / "Warning! Pothole ahead"
message = t('home.warnAccident') // "تحذير! حادث على الطريق" / "Warning! Accident on the road"
message = t('home.warnSpeed')    // "احذر! كاميرا سرعة أمامك" / "Caution! Speed camera ahead"

// TTS Language
language: language === 'ar' ? "ar-SA" : "en-US"
```

#### `playTestSound()`:
```typescript
await Speech.speak(t('home.testSoundText'), { 
    language: language === 'ar' ? "ar-SA" : "en-US",
    volume: appVolume
});
// "هذا اختبار" / "This is a test"
```

### 4. **ReportDialog Integration**

#### Default Address:
```typescript
address={searchMarker?.title || (language === 'ar' ? 'الموقع التلقائي' : 'Auto Location')}
```

#### Report Creation:
```typescript
title: data.type === 'pothole' 
    ? (language === 'ar' ? 'حفرة في الطريق' : 'Pothole on Road')
    : data.type === 'accident'
    ? (language === 'ar' ? 'حادث مروري' : 'Traffic Accident')
    : (language === 'ar' ? 'كاشف سرعة' : 'Speed Camera')

description: data.notes || (language === 'ar' ? 'بلاغ جديد' : 'New Report')
```

### 5. **Alert Messages**

#### Location Permission:
```typescript
alert(language === 'ar' 
    ? 'يرجى تفعيل تحديد الموقع أو البحث عن موقع' 
    : 'Please enable location or search for a location');
```

#### Error on Report Submit:
```typescript
alert(language === 'ar' 
    ? '❌ حدث خطأ أثناء إرسال البلاغ' 
    : '❌ Error submitting report');
```

#### Marker Default Title:
```typescript
title={report.title || categories.find(c => c.id === report.category_id)?.name || (language === 'ar' ? 'بلاغ' : 'Report')}
```

## Verwendete Translation Keys

### Aus `i18n/locales/ar.json` und `en.json`:

```json
{
  "home": {
    "title": "الرئيسية" / "Home",
    "volume": "مستوى الصوت" / "Volume",
    "testSound": "اختبار الصوت" / "Test Sound",
    "testSoundText": "هذا اختبار" / "This is a test",
    "soundSettings": "إعدادات الصوت" / "Sound Settings",
    "pothole": "حفرة" / "Pothole",
    "accident": "حادث" / "Accident",
    "speedCamera": "كاشف السرعة" / "Speed Camera",
    "warnPothole": "تحذير! توجد حفرة أمامك" / "Warning! Pothole ahead",
    "warnAccident": "تحذير! حادث على الطريق" / "Warning! Accident on the road",
    "warnSpeed": "احذر! كاميرا سرعة أمامك" / "Caution! Speed camera ahead"
  },
  "common": {
    "close": "إغلاق" / "Close"
  }
}
```

## Funktionsweise

### Standard (Arabisch):
1. App öffnet auf Arabisch (RTL Layout)
2. Alle Texte werden auf Arabisch angezeigt
3. TTS Warnungen auf Arabisch
4. Google Places API sucht auf Arabisch

### Nach Sprachwechsel (Englisch):
1. User geht zu Settings → Language → English
2. App neu starten (manuell)
3. Home Screen zeigt englische Texte (LTR Layout)
4. TTS Warnungen auf Englisch
5. Google Places API sucht auf Englisch

## Vorteile

✅ **Reaktiv**: Sprache ändert sich automatisch nach Context-Update  
✅ **Konsistent**: Alle Texte nutzen das gleiche i18n-System  
✅ **Wartbar**: Übersetzungen zentral in JSON-Dateien  
✅ **Erweiterbar**: Neue Sprachen einfach hinzuzufügen  
✅ **TTS Support**: Warnungen in der richtigen Sprache  
✅ **API Integration**: Google Places API nutzt User-Sprache  

## Testing

### Auf Arabisch (Standard):
1. App öffnen
2. Home Screen zeigt "الرئيسية"
3. Search Placeholder: "ابحث عن موقع أو شارع"
4. Alert Button klicken → Arabische Warnung
5. Test Sound → "هذا اختبار"

### Auf Englisch:
1. Settings → Language → English → Restart
2. Home Screen zeigt "Home"
3. Search Placeholder: "Search for location or street"
4. Alert Button klicken → Englische Warnung
5. Test Sound → "This is a test"

## Nächste Schritte

Weitere Screens konvertieren:
- [ ] Profile Screen
- [ ] Reports Screen
- [ ] Notifications Screen
- [ ] Alert Screen
- [ ] Login/Register Screens

Siehe `MULTI_LANGUAGE_GUIDE.md` für vollständige Anleitung.
