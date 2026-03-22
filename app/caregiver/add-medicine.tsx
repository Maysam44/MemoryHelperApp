import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { doc, setDoc, collection } from 'firebase/firestore';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';
import { useNotifications } from '../hooks/use-notifications';

export default function AddMedicineScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const { scheduleMedicineReminder } = useNotifications();
  
  const [name, setName] = useState('');
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [dosage, setDosage] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddMedicine = async () => {
    if (!name.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الدواء');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const medicineId = Date.now().toString();
        
        // تحويل الوقت لتنسيق 24 ساعة للحفظ الداخلي
        let h = parseInt(hour);
        if (period === 'PM' && h < 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        const time24 = `${h.toString().padStart(2, '0')}:${minute}`;

        const newMedicine = {
          id: medicineId,
          name,
          time: time24,
          displayTime: `${hour}:${minute} ${period === 'AM' ? 'صباحاً' : 'مساءً'}`,
          dosage,
          description,
          status: 'pending', // pending, taken, missed
          lastTakenDate: null,
          createdAt: new Date().toISOString(),
        };

        const medRef = doc(collection(db, "users", user.uid, "medicines"), medicineId);
        await setDoc(medRef, newMedicine);

        // جدولة التنبيه الفعلي
        await scheduleMedicineReminder(name, time24, description);

        Alert.alert('تم بنجاح', 'تمت إضافة الدواء وجدولة التنبيهات الذكية');
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
      <Stack.Screen options={{ 
        title: 'إضافة دواء جديد', 
        headerTitleAlign: 'center',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 15 }}>
            <MaterialCommunityIcons name="arrow-right" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        )
      }} />
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
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>وقت الدواء *</Text>
            <View style={styles.timePickerRow}>
              <View style={styles.periodSelector}>
                <TouchableOpacity 
                  style={[styles.periodBtn, period === 'AM' && styles.periodBtnActive]} 
                  onPress={() => setPeriod('AM')}
                >
                  <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>صباحاً</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.periodBtn, period === 'PM' && styles.periodBtnActive]} 
                  onPress={() => setPeriod('PM')}
                >
                  <Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>مساءً</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.timeInputs}>
                <TextInput
                  style={styles.timeInput}
                  value={minute}
                  onChangeText={(val) => setMinute(val.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="00"
                />
                <Text style={styles.timeSeparator}>:</Text>
                <TextInput
                  style={styles.timeInput}
                  value={hour}
                  onChangeText={(val) => setHour(val.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="08"
                />
              </View>
            </View>
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

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="bell-ring-outline" size={24} color={COLORS.secondary} />
            <Text style={styles.infoText}>
              سيصل تنبيه للمريض قبل 5 دقائق من الموعد، وعند الموعد تماماً. في حال عدم التأكيد، سيستمر التنبيه كل 5 دقائق.
            </Text>
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
  inputGroup: { marginBottom: 25 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'right' },
  input: { borderWidth: 1, borderRadius: 15, padding: 15, fontSize: 16, textAlign: 'right' },
  timePickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeInputs: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 15, padding: 10, borderWidth: 1, borderColor: '#eee' },
  timeInput: { width: 50, fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: COLORS.primary },
  timeSeparator: { fontSize: 24, fontWeight: 'bold', color: '#ccc', marginHorizontal: 5 },
  periodSelector: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 12, padding: 4 },
  periodBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  periodBtnActive: { backgroundColor: 'white', elevation: 2 },
  periodText: { fontSize: 14, color: '#888' },
  periodTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  infoCard: { flexDirection: 'row-reverse', backgroundColor: COLORS.secondary + '10', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  infoText: { flex: 1, marginRight: 10, fontSize: 13, color: COLORS.secondary, textAlign: 'right', lineHeight: 20 },
  submitButton: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 15, marginTop: 30, marginBottom: 40, elevation: 5 },
  submitButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
