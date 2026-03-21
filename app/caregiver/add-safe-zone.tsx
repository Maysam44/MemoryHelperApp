import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';
import * as Location from 'expo-location';

export default function AddSafeZoneScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  
  const [name, setName] = useState('');
  const [radius, setRadius] = useState('100');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    setIsLoadingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'إذن الموقع مطلوب',
          'نحتاج للوصول إلى موقعك لتحديد المنطقة الآمنة. يرجى تفعيل الإذن من الإعدادات.',
          [{ text: 'إلغاء', style: 'cancel' }, { text: 'الإعدادات', onPress: () => Linking.openSettings() }]
        );
        setIsLoadingLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert('خطأ', 'تعذر الحصول على الموقع الحالي.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const openGoogleMaps = () => {
    // فتح خرائط قوقل للبحث عن موقع
    const url = Platform.select({
      ios: 'maps://app',
      android: 'https://www.google.com/maps',
    });
    if (url) Linking.openURL(url);
  };

  const handleAddSafeZone = async () => {
    if (!name.trim() || latitude === null || longitude === null) {
      Alert.alert('خطأ', 'يرجى إدخال اسم المنطقة والتأكد من تحديد الإحداثيات');
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
          latitude,
          longitude,
          radius: parseInt(radius) || 100,
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, "users", user.uid, "safeZones", zoneId), newZone);

        Alert.alert('تم بنجاح', 'تمت إضافة المنطقة الآمنة بنجاح');
        router.back();
      }
    } catch (error) {
      console.error("Error adding safe zone:", error);
      Alert.alert('خطأ', 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
      <Stack.Screen options={{ title: 'إضافة منطقة آمنة', headerTitleAlign: 'center' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={[styles.locationBox, { backgroundColor: COLORS.primary + '10', borderColor: COLORS.primary }]}>
            <MaterialCommunityIcons name="map-marker-radius" size={40} color={COLORS.primary} />
            <Text style={[styles.locationTitle, { color: COLORS.primary }]}>إحداثيات المنطقة</Text>
            {isLoadingLocation ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 10 }} />
            ) : latitude && longitude ? (
              <View style={{ alignItems: 'center', marginTop: 10 }}>
                <Text style={styles.locationCoords}>خط العرض: {latitude.toFixed(6)}</Text>
                <Text style={styles.locationCoords}>خط الطول: {longitude?.toFixed(6)}</Text>
              </View>
            ) : (
              <Text style={styles.errorText}>لم يتم تحديد الموقع بعد</Text>
            )}
            
            <View style={styles.locationButtonsRow}>
              <TouchableOpacity style={styles.locationBtn} onPress={requestLocationPermission}>
                <MaterialCommunityIcons name="refresh" size={20} color="white" />
                <Text style={styles.locationBtnText}>تحديث الحالي</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.locationBtn, { backgroundColor: COLORS.secondary }]} onPress={openGoogleMaps}>
                <MaterialCommunityIcons name="google-maps" size={20} color="white" />
                <Text style={styles.locationBtnText}>فتح الخرائط</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>اسم المنطقة (مثال: المنزل) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: dynamicColors.card, color: dynamicColors.textDark, borderColor: dynamicColors.border }]}
              value={name}
              onChangeText={setName}
              placeholder="المنزل، بيت الجدة، الحديقة..."
              placeholderTextColor={dynamicColors.textMuted}
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>نطاق الأمان (بالمتر)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: dynamicColors.card, color: dynamicColors.textDark, borderColor: dynamicColors.border }]}
              value={radius}
              onChangeText={setRadius}
              placeholder="100"
              placeholderTextColor={dynamicColors.textMuted}
              keyboardType="numeric"
              textAlign="right"
            />
          </View>

          <View style={styles.manualInputRow}>
             <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.miniLabel}>خط الطول</Text>
                <TextInput
                  style={styles.miniInput}
                  value={longitude?.toString()}
                  onChangeText={(v) => setLongitude(parseFloat(v))}
                  keyboardType="numeric"
                  placeholder="0.0000"
                />
             </View>
             <View style={{ flex: 1 }}>
                <Text style={styles.miniLabel}>خط العرض</Text>
                <TextInput
                  style={styles.miniInput}
                  value={latitude?.toString()}
                  onChangeText={(v) => setLatitude(parseFloat(v))}
                  keyboardType="numeric"
                  placeholder="0.0000"
                />
             </View>
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: COLORS.primary, opacity: isSubmitting || latitude === null ? 0.7 : 1 }]} 
            onPress={handleAddSafeZone}
            disabled={isSubmitting || latitude === null}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={24} color="white" style={{ marginLeft: 10 }} />
                <Text style={styles.submitButtonText}>حفظ المنطقة الآمنة</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  locationBox: { padding: 25, borderRadius: 25, borderWidth: 1, alignItems: 'center', marginBottom: 25 },
  locationTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10 },
  locationCoords: { fontSize: 14, color: '#666', marginTop: 5 },
  errorText: { color: COLORS.error, marginTop: 10 },
  locationButtonsRow: { flexDirection: 'row-reverse', marginTop: 20, gap: 10 },
  locationBtn: { flexDirection: 'row-reverse', backgroundColor: COLORS.primary, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15, alignItems: 'center' },
  locationBtnText: { color: 'white', fontWeight: 'bold', marginRight: 8, fontSize: 12 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, textAlign: 'right' },
  input: { borderWidth: 1, borderRadius: 12, padding: 15, fontSize: 16, textAlign: 'right' },
  manualInputRow: { flexDirection: 'row', marginBottom: 30 },
  miniLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 5, textAlign: 'right' },
  miniInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, textAlign: 'center', backgroundColor: 'white' },
  submitButton: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 15, marginBottom: 40 },
  submitButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
