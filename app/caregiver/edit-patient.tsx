import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function EditPatientScreen() {
  const router = useRouter();
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientStage, setPatientStage] = useState('early');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setPatientName(data.patientName || '');
            setPatientAge(data.patientAge?.toString() || '');
            setPatientStage(data.patientStage || 'early');
          }
        }
      } catch (error) {
        console.error("Error fetching patient data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPatientData();
  }, []);

  const handleSave = async () => {
    if (!patientName.trim() || !patientAge.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم وعمر المريض.");
      return;
    }

    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "users", user.uid);
        await updateDoc(docRef, { 
          patientName: patientName.trim(),
          patientAge: parseInt(patientAge),
          patientStage: patientStage
        });
        Alert.alert("نجاح", "تم تحديث بيانات المريض بنجاح.");
        router.back();
      }
    } catch (error) {
      Alert.alert("خطأ", "فشل تحديث بيانات المريض.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'تعديل بيانات المريض', 
        headerTitleAlign: 'center',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: SIZES.padding }}>
            <MaterialCommunityIcons name="chevron-right" size={30} color={COLORS.textDark} />
          </TouchableOpacity>
        )
      }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم المريض</Text>
            <TextInput
              style={styles.input}
              value={patientName}
              onChangeText={setPatientName}
              placeholder="أدخل اسم المريض"
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>عمر المريض</Text>
            <TextInput
              style={styles.input}
              value={patientAge}
              onChangeText={setPatientAge}
              placeholder="أدخل عمر المريض"
              keyboardType="numeric"
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>مرحلة الحالة</Text>
            <View style={styles.stageContainer}>
              <TouchableOpacity 
                style={[styles.stageButton, patientStage === 'early' && styles.stageButtonActive]}
                onPress={() => setPatientStage('early')}
              >
                <Text style={[styles.stageText, patientStage === 'early' && styles.stageTextActive]}>مبكرة</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.stageButton, patientStage === 'moderate' && styles.stageButtonActive]}
                onPress={() => setPatientStage('moderate')}
              >
                <Text style={[styles.stageText, patientStage === 'moderate' && styles.stageTextActive]}>متوسطة</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.stageButton, patientStage === 'advanced' && styles.stageButtonActive]}
                onPress={() => setPatientStage('advanced')}
              >
                <Text style={[styles.stageText, patientStage === 'advanced' && styles.stageTextActive]}>متأخرة</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.saveButton, isSaving && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.saveButtonText}>حفظ التغييرات</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: SIZES.padding },
  inputGroup: { marginBottom: SIZES.padding },
  label: { fontSize: SIZES.body, fontWeight: FONTS.bold, color: COLORS.textDark, marginBottom: SIZES.base, textAlign: 'right' },
  input: { backgroundColor: COLORS.card, padding: SIZES.padding, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border, textAlign: 'right', fontSize: SIZES.body },
  stageContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  stageButton: { flex: 1, padding: SIZES.base, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', marginHorizontal: 4, backgroundColor: COLORS.card },
  stageButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stageText: { fontSize: SIZES.caption, color: COLORS.textDark },
  stageTextActive: { color: COLORS.textLight, fontWeight: FONTS.bold },
  saveButton: { backgroundColor: COLORS.primary, padding: SIZES.padding, borderRadius: SIZES.radius, alignItems: 'center', marginTop: SIZES.padding },
  saveButtonText: { color: COLORS.textLight, fontSize: SIZES.h3, fontWeight: FONTS.bold }
});