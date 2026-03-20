import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';
import { useLocationTracking } from '../hooks/use-location-tracking';

export default function AddSafeZoneScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const { currentLocation, startLocationTracking } = useLocationTracking();
  
  const [name, setName] = useState('');
  const [radius, setRadius] = useState('100');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    startLocationTracking();
  }, []);

  const handleAddSafeZone = async () => {
    if (!name.trim() || !currentLocation) {
      Alert.alert('خطأ', 'يرجى إدخال اسم المنطقة والتأكد من تفعيل الموقع');
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
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
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
            <Text style={[styles.locationTitle, { color: COLORS.primary }]}>تحديد الموقع الحالي</Text>
            {currentLocation ? (
              <Text style={styles.locationCoords}>
                {currentLocation.coords.latitude.toFixed(6)}, {currentLocation.coords.longitude.toFixed(6)}
              </Text>
            ) : (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 10 }} />
            )}
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

          <View style={[styles.infoBox, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border }]}>
            <MaterialCommunityIcons name="information-outline" size={24} color={COLORS.primary} />
            <Text style={[styles.infoText, { color: dynamicColors.textMuted }]}>
              سيتم استخدام موقعك الحالي كمركز لمنطقة الأمان. سيتم تنبيهك إذا خرج المريض من هذا النطاق.
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: COLORS.primary, opacity: isSubmitting || !currentLocation ? 0.7 : 1 }]} 
            onPress={handleAddSafeZone}
            disabled={isSubmitting || !currentLocation}
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
  locationBox: {
    padding: 30,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 30,
  },
  locationTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10 },
  locationCoords: { fontSize: 14, color: '#666', marginTop: 5 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, textAlign: 'right' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    textAlign: 'right',
  },
  infoBox: {
    flexDirection: 'row-reverse',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 30,
  },
  infoText: { flex: 1, fontSize: 13, marginRight: 10, textAlign: 'right', lineHeight: 20 },
  submitButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 15,
    marginBottom: 40,
  },
  submitButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
