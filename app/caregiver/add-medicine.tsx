import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { doc, setDoc, collection, updateDoc } from 'firebase/firestore';
import { useNotifications } from '../hooks/use-notifications';
import { COLORS } from '../../constants/theme';

export default function AddMedicineScreen() {
  const router = useRouter();
  const { scheduleMedicineReminder } = useNotifications();

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [description, setDescription] = useState('');
  const [timesCount, setTimesCount] = useState(1);
  const [doseTimes, setDoseTimes] = useState([{ hour: '08', minute: '00', period: 'AM' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTimesCountChange = (count: number) => {
    setTimesCount(count);
    const newDoseTimes = [...doseTimes];
    while (newDoseTimes.length < count) newDoseTimes.push({ hour: '08', minute: '00', period: 'AM' });
    while (newDoseTimes.length > count) newDoseTimes.pop();
    setDoseTimes(newDoseTimes);
  };

  const handleAddMedicine = async () => {
    if (!name.trim()) return Alert.alert('خطأ', 'يرجى إدخال اسم الدواء');
    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const medicineId = Date.now().toString();

      // ✅ parseInt لكل من hour و minute عشان يكونوا numbers صحيحة
      const doses = doseTimes.map(d => {
        let h = parseInt(d.hour, 10);
        const m = parseInt(d.minute, 10); // ✅ كان ناقص هذا السطر

        if (d.period === 'PM' && h < 12) h += 12;
        if (d.period === 'AM' && h === 12) h = 0;

        const time24 = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

        return {
          time: time24,
          displayTime: `${d.hour}:${d.minute} ${d.period === 'AM' ? 'صباحاً' : 'مساءً'}`,
          status: 'pending',
          lastTakenDate: null,
          description,
        };
      });

      const newMedicine = {
        id: medicineId,
        name,
        dosage,
        description,
        doses,
        createdAt: new Date().toISOString(),
      };

      const medRef = doc(collection(db, 'users', user.uid, 'medicines'), medicineId);
      await setDoc(medRef, newMedicine);

      // ✅ scheduleMedicineReminder الآن تاخذ (medicineId, name, doses) وترجع doses مع notificationId
      const scheduledDoses = await scheduleMedicineReminder(medicineId, name, doses);

      // ✅ تحقق إن الـ doses رجعت صحيحة قبل الحفظ
      if (!scheduledDoses || scheduledDoses.length === 0) {
        throw new Error('فشل في جدولة الإشعارات');
      }

      await updateDoc(medRef, { doses: scheduledDoses });

      Alert.alert('تم بنجاح ✅', 'تمت إضافة الدواء مع إعداد التنبيهات');
      router.back();
    } catch (err) {
      console.error(err);
      Alert.alert('خطأ', 'حدث خطأ أثناء حفظ الدواء');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FD' }}>
      <Stack.Screen options={{ title: 'إضافة دواء', headerTitleAlign: 'center' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم الدواء *</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>عدد الجرعات في اليوم *</Text>
            <View style={{ flexDirection: 'row', marginBottom: 15 }}>
              {[1, 2, 3].map(n => (
                <TouchableOpacity key={n} onPress={() => handleTimesCountChange(n)} style={[styles.timesBtn, timesCount === n && styles.timesBtnActive]}>
                  <Text style={[styles.timesBtnText, timesCount === n && { color: 'white' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {doseTimes.map((dose, index) => (
            <View key={index} style={{ marginBottom: 15 }}>
              <Text style={styles.label}>جرعة {index + 1}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  value={dose.hour}
                  onChangeText={val => setDoseTimes(prev => { const c = [...prev]; c[index] = { ...c[index], hour: val }; return c; })}
                  style={styles.timeInput}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={{ fontSize: 24 }}>:</Text>
                <TextInput
                  value={dose.minute}
                  onChangeText={val => setDoseTimes(prev => { const c = [...prev]; c[index] = { ...c[index], minute: val }; return c; })}
                  style={styles.timeInput}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <TouchableOpacity onPress={() => setDoseTimes(prev => { const c = [...prev]; c[index] = { ...c[index], period: 'AM' }; return c; })}>
                  <Text style={[styles.periodText, dose.period === 'AM' && styles.periodActive]}>صباحاً</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDoseTimes(prev => { const c = [...prev]; c[index] = { ...c[index], period: 'PM' }; return c; })}>
                  <Text style={[styles.periodText, dose.period === 'PM' && styles.periodActive]}>مساءً</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>الجرعة</Text>
            <TextInput value={dosage} onChangeText={setDosage} style={styles.input} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>وصف إضافي</Text>
            <TextInput value={description} onChangeText={setDescription} style={[styles.input, { height: 80 }]} multiline />
          </View>

          <TouchableOpacity
            onPress={handleAddMedicine}
            style={[styles.submitButton, { opacity: isSubmitting ? 0.7 : 1 }]}
            disabled={isSubmitting}
          >
            <MaterialCommunityIcons name="check" size={24} color="white" style={{ marginLeft: 10 }} />
            <Text style={styles.submitButtonText}>{isSubmitting ? 'جارٍ الحفظ...' : 'حفظ الدواء'}</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 5, textAlign: 'right' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 15, padding: 12, fontSize: 16, backgroundColor: 'white', textAlign: 'right' },
  timesBtn: { marginRight: 10, backgroundColor: '#ddd', padding: 10, borderRadius: 10 },
  timesBtnActive: { backgroundColor: '#4CAF50' },
  timesBtnText: { fontWeight: 'bold' },
  timeInput: { width: 50, borderWidth: 1, borderColor: '#ddd', padding: 5, fontSize: 18, textAlign: 'center', marginRight: 5 },
  periodText: { marginHorizontal: 5, fontWeight: 'bold', color: '#888' },
  periodActive: { color: '#4CAF50' },
  submitButton: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, padding: 15, borderRadius: 15, marginTop: 20, marginBottom: 40 },
  submitButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});