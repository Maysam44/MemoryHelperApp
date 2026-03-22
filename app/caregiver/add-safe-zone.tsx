import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { auth, db } from '../../firebaseConfig';
import { doc, setDoc, collection } from 'firebase/firestore';
import { COLORS, SIZES, FONTS } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function AddSafeZoneScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [radius, setRadius] = useState('500'); // نصف القطر بالأمتار
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCurrentLocation = async () => {
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('إذن الموقع', 'نحتاج لإذن الوصول للموقع لتحديد المنطقة الآمنة.');
        setIsLocating(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc);
      Alert.alert('تم التحديد', 'تم التقاط إحداثيات موقعك الحالي بنجاح.');
    } catch (error) {
      console.error("Location error:", error);
      Alert.alert('خطأ', 'فشل في جلب الموقع الحالي.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSaveZone = async () => {
    if (!name.trim() || !location) {
      Alert.alert('حقول ناقصة', 'يرجى إدخال اسم للمنطقة والتقاط الموقع الحالي.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const zoneId = Date.now().toString();
        const newZone = {
          id: zoneId,
          name,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          radius: parseInt(radius),
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(collection(db, "users", user.uid, "safeZones"), zoneId), newZone);
        Alert.alert('تم الحفظ', 'تمت إضافة المنطقة الآمنة بنجاح.');
        router.back();
      }
    } catch (error) {
      console.error("Save zone error:", error);
      Alert.alert('خطأ', 'حدث خطأ أثناء حفظ المنطقة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'تحديد منطقة آمنة', 
        headerTitleAlign: 'center',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 15 }}>
            <MaterialCommunityIcons name="arrow-right" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        )
      }} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="map-marker-radius" size={80} color={COLORS.primary} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>اسم المنطقة (مثال: المنزل)</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="أدخل اسم المنطقة..."
            textAlign="right"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>نطاق الأمان (بالأمتار)</Text>
          <View style={styles.radiusRow}>
            {['100', '500', '1000', '2000'].map((r) => (
              <TouchableOpacity 
                key={r}
                style={[styles.radiusBtn, radius === r && styles.radiusBtnActive]}
                onPress={() => setRadius(r)}
              >
                <Text style={[styles.radiusText, radius === r && styles.radiusTextActive]}>{r}م</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.locationSection}>
          <Text style={styles.label}>موقع المنطقة الآمنة</Text>
          <TouchableOpacity 
            style={[styles.locateBtn, location && styles.locateBtnSuccess]} 
            onPress={getCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialCommunityIcons name={location ? "check-circle" : "crosshairs-gps"} size={24} color="white" />
                <Text style={styles.locateBtnText}>
                  {location ? 'تم التقاط الموقع بنجاح' : 'اضغط هنا لالتقاط الموقع الحالي'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {location && (
            <Text style={styles.coordText}>
              الإحداثيات: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
            </Text>
          )}
        </View>

        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information-outline" size={24} color={COLORS.secondary} />
          <Text style={styles.infoText}>
            سيقوم التطبيق بمراقبة موقع المريض وتنبيهك فوراً إذا خرج عن هذا النطاق.
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, { opacity: isSubmitting ? 0.7 : 1 }]} 
          onPress={handleSaveZone}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitBtnText}>حفظ منطقة الأمان</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  scrollContent: { padding: 25 },
  headerIcon: { alignItems: 'center', marginBottom: 30 },
  inputGroup: { marginBottom: 25 },
  label: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 10, textAlign: 'right' },
  input: { backgroundColor: 'white', borderRadius: 15, padding: 18, fontSize: 16, borderWidth: 1, borderColor: '#eee' },
  radiusRow: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  radiusBtn: { flex: 0.22, backgroundColor: 'white', padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  radiusBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  radiusText: { fontSize: 14, color: COLORS.textDark },
  radiusTextActive: { color: 'white', fontWeight: 'bold' },
  locationSection: { marginBottom: 25 },
  locateBtn: { backgroundColor: COLORS.secondary, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 15, elevation: 3 },
  locateBtnSuccess: { backgroundColor: '#4CAF50' },
  locateBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginRight: 10 },
  coordText: { textAlign: 'center', marginTop: 10, color: '#888', fontSize: 12 },
  infoCard: { flexDirection: 'row-reverse', backgroundColor: COLORS.secondary + '10', padding: 20, borderRadius: 20, alignItems: 'center', marginBottom: 30 },
  infoText: { flex: 1, marginRight: 12, fontSize: 14, color: COLORS.secondary, textAlign: 'right', lineHeight: 22 },
  submitBtn: { backgroundColor: COLORS.primary, padding: 20, borderRadius: 15, alignItems: 'center', elevation: 5 },
  submitBtnText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
});
