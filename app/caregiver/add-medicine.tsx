import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';
import { useNotifications } from '../hooks/use-notifications';

export default function AddMedicineScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const { scheduleMedicineReminder } = useNotifications();
  
  const [name, setName] = useState('');
  const [time, setTime] = useState('08:00');
  const [dosage, setDosage] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'يومي' | 'كل يومين' | 'ثلاث مرات يومياً'>('يومي');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddMedicine = async () => {
    if (!name.trim() || !time.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الدواء والوقت');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const medicineId = Date.now().toString();
        const newMedicine = {
          id: medicineId,
          name,
          time,
          dosage,
          description,
          frequency,
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, "users", user.uid, "medicines", medicineId), newMedicine);

        // جدولة التنبيه
        await scheduleMedicineReminder(name, time, `${dosage} - ${description}`);

        Alert.alert('تم بنجاح', 'تمت إضافة الدواء وجدولة التنبيه');
        router.back();
      }
    } catch (error) {
      console.error("Error adding medicine:", error);
      Alert.alert('خطأ', 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
      <Stack.Screen options={{ title: 'إضافة دواء جديد', headerTitleAlign: 'center' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>اسم الدواء *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: dynamicColors.card, color: dynamicColors.textDark, borderColor: dynamicColors.border }]}
              value={name}
              onChangeText={setName}
              placeholder="مثال: الأسبرين"
              placeholderTextColor={dynamicColors.textMuted}
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>الوقت (HH:mm) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: dynamicColors.card, color: dynamicColors.textDark, borderColor: dynamicColors.border }]}
              value={time}
              onChangeText={setTime}
              placeholder="مثال: 08:00"
              placeholderTextColor={dynamicColors.textMuted}
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>الجرعة</Text>
            <TextInput
              style={[styles.input, { backgroundColor: dynamicColors.card, color: dynamicColors.textDark, borderColor: dynamicColors.border }]}
              value={dosage}
              onChangeText={setDosage}
              placeholder="مثال: حبة واحدة"
              placeholderTextColor={dynamicColors.textMuted}
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>التكرار</Text>
            <View style={styles.frequencyRow}>
              {['يومي', 'كل يومين', 'ثلاث مرات يومياً'].map((f: any) => (
                <TouchableOpacity 
                  key={f}
                  style={[styles.frequencyBtn, { backgroundColor: frequency === f ? COLORS.primary : dynamicColors.card, borderColor: COLORS.primary }]}
                  onPress={() => setFrequency(f)}
                >
                  <Text style={{ color: frequency === f ? 'white' : COLORS.primary, fontSize: 12 }}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>وصف إضافي</Text>
            <TextInput
              style={[styles.input, { backgroundColor: dynamicColors.card, color: dynamicColors.textDark, borderColor: dynamicColors.border, height: 80 }]}
              value={description}
              onChangeText={setDescription}
              placeholder="مثال: بعد الأكل"
              placeholderTextColor={dynamicColors.textMuted}
              multiline
              textAlign="right"
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: COLORS.primary, opacity: isSubmitting ? 0.7 : 1 }]} 
            onPress={handleAddMedicine}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={24} color="white" style={{ marginLeft: 10 }} />
                <Text style={styles.submitButtonText}>حفظ الدواء</Text>
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
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, textAlign: 'right' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    textAlign: 'right',
  },
  frequencyRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 5 },
  frequencyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    flex: 0.32,
    alignItems: 'center',
  },
  submitButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 15,
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
