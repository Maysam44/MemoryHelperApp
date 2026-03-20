// app/patient/medicine-reminders.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';
import { useNotifications } from '../hooks/use-notifications';
import { auth, db } from '../../firebaseConfig';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

interface Medicine {
  id: string;
  name: string;
  time: string;
  description: string;
  dosage: string;
  frequency: 'يومي' | 'كل يومين' | 'ثلاث مرات يومياً';
  notificationId?: string;
}

export default function MedicineRemindersScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const { scheduleMedicineReminder } = useNotifications();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [medicineName, setMedicineName] = useState('');
  const [medicineTime, setMedicineTime] = useState('08:00');
  const [medicineDosage, setMedicineDosage] = useState('');
  const [medicineDescription, setMedicineDescription] = useState('');
  const [medicineFrequency, setMedicineFrequency] = useState<'يومي' | 'كل يومين' | 'ثلاث مرات يومياً'>('يومي');

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const medicinesRef = collection(db, `users/${user.uid}/medicines`);
        const snapshot = await getDocs(medicinesRef);
        const fetchedMedicines: Medicine[] = [];
        snapshot.forEach((doc) => {
          fetchedMedicines.push({ id: doc.id, ...doc.data() } as Medicine);
        });
        setMedicines(fetchedMedicines);
      }
    } catch (error) {
      console.error('خطأ في جلب الأدوية:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addMedicine = async () => {
    if (!medicineName.trim() || !medicineTime.trim()) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        const medicineId = `${Date.now()}`;
        const newMedicine: Medicine = {
          id: medicineId,
          name: medicineName,
          time: medicineTime,
          dosage: medicineDosage,
          description: medicineDescription,
          frequency: medicineFrequency,
        };

        // حفظ في Firebase
        await setDoc(
          doc(db, `users/${user.uid}/medicines`, medicineId),
          newMedicine
        );

        // جدولة التنبيه
        await scheduleMedicineReminder(
          medicineName,
          medicineTime,
          `${medicineDosage} - ${medicineDescription}`
        );

        // تحديث الحالة المحلية
        setMedicines([...medicines, newMedicine]);

        // إعادة تعيين النموذج
        setMedicineName('');
        setMedicineTime('08:00');
        setMedicineDosage('');
        setMedicineDescription('');
        setMedicineFrequency('يومي');
        setShowModal(false);

        Alert.alert('نجاح', 'تم إضافة الدواء بنجاح وجدولة التنبيه');
      }
    } catch (error) {
      console.error('خطأ في إضافة الدواء:', error);
      Alert.alert('خطأ', 'حدث خطأ في إضافة الدواء');
    }
  };

  const deleteMedicine = async (medicineId: string) => {
    try {
      const user = auth.currentUser;
      if (user) {
        await deleteDoc(doc(db, `users/${user.uid}/medicines`, medicineId));
        setMedicines(medicines.filter((m) => m.id !== medicineId));
        Alert.alert('تم', 'تم حذف الدواء بنجاح');
      }
    } catch (error) {
      console.error('خطأ في حذف الدواء:', error);
      Alert.alert('خطأ', 'حدث خطأ في حذف الدواء');
    }
  };

  const MedicineCard = ({ medicine }: { medicine: Medicine }) => (
    <View
      style={[
        styles.medicineCard,
        { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border },
      ]}
    >
      <View style={styles.medicineHeader}>
        <View style={[styles.timeCircle, { backgroundColor: COLORS.primary + '20' }]}>
          <MaterialCommunityIcons name="clock-outline" size={24} color={COLORS.primary} />
          <Text style={[styles.timeText, { color: COLORS.primary }]}>{medicine.time}</Text>
        </View>
        <View style={styles.medicineInfo}>
          <Text style={[styles.medicineName, { color: dynamicColors.textDark }]}>
            {medicine.name}
          </Text>
          <Text style={[styles.medicineDosage, { color: dynamicColors.textMuted }]}>
            {medicine.dosage} • {medicine.frequency}
          </Text>
          {medicine.description && (
            <Text style={[styles.medicineDescription, { color: dynamicColors.textMuted }]}>
              {medicine.description}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() =>
          Alert.alert('تأكيد', 'هل تريد حذف هذا الدواء؟', [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'حذف', onPress: () => deleteMedicine(medicine.id), style: 'destructive' },
          ])
        }
      >
        <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: dynamicColors.backgroundLight }]}>
        <ActivityIndicator size="large" color={dynamicColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
      <Stack.Screen
        options={{
          title: 'تنبيهات الأدوية',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: dynamicColors.backgroundLight },
          headerTitleStyle: { color: dynamicColors.textDark },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: SIZES.padding }}>
              <MaterialCommunityIcons name="chevron-right" size={30} color={dynamicColors.textDark} />
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        data={medicines}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MedicineCard medicine={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="pill" size={80} color={dynamicColors.textMuted} />
            <Text style={[styles.emptyText, { color: dynamicColors.textMuted }]}>
              لا توجد أدوية مضافة حتى الآن
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: COLORS.secondary }]}
        onPress={() => setShowModal(true)}
      >
        <MaterialCommunityIcons name="plus" size={32} color="white" />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: dynamicColors.backgroundLight }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <MaterialCommunityIcons name="close" size={28} color={dynamicColors.textDark} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: dynamicColors.textDark }]}>إضافة دواء جديد</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: dynamicColors.textDark }]}>اسم الدواء *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: dynamicColors.card,
                    color: dynamicColors.textDark,
                    borderColor: dynamicColors.border,
                  },
                ]}
                placeholder="مثال: الأسبرين"
                placeholderTextColor={dynamicColors.textMuted}
                value={medicineName}
                onChangeText={setMedicineName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: dynamicColors.textDark }]}>الوقت *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: dynamicColors.card,
                    color: dynamicColors.textDark,
                    borderColor: dynamicColors.border,
                  },
                ]}
                placeholder="HH:mm (مثال: 08:00)"
                placeholderTextColor={dynamicColors.textMuted}
                value={medicineTime}
                onChangeText={setMedicineTime}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: dynamicColors.textDark }]}>الجرعة</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: dynamicColors.card,
                    color: dynamicColors.textDark,
                    borderColor: dynamicColors.border,
                  },
                ]}
                placeholder="مثال: حبة واحدة"
                placeholderTextColor={dynamicColors.textMuted}
                value={medicineDosage}
                onChangeText={setMedicineDosage}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: dynamicColors.textDark }]}>وصف إضافي</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: dynamicColors.card,
                    color: dynamicColors.textDark,
                    borderColor: dynamicColors.border,
                  },
                ]}
                placeholder="مثال: مع الطعام"
                placeholderTextColor={dynamicColors.textMuted}
                value={medicineDescription}
                onChangeText={setMedicineDescription}
                multiline
              />
            </View>

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: COLORS.primary }]}
              onPress={addMedicine}
            >
              <MaterialCommunityIcons name="check" size={24} color="white" />
              <Text style={styles.addButtonText}>إضافة الدواء</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: SIZES.padding, paddingBottom: 100 },
  medicineCard: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    marginBottom: SIZES.padding,
    elevation: 2,
  },
  medicineHeader: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  timeCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SIZES.padding,
  },
  timeText: {
    fontSize: SIZES.caption,
    fontWeight: FONTS.bold,
    marginTop: 4,
  },
  medicineInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  medicineName: {
    fontSize: SIZES.h2,
    fontWeight: FONTS.bold,
    marginBottom: SIZES.base / 2,
  },
  medicineDosage: {
    fontSize: SIZES.body,
    marginBottom: SIZES.base / 2,
  },
  medicineDescription: {
    fontSize: SIZES.caption,
  },
  deleteButton: {
    padding: SIZES.base,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.padding * 5,
  },
  emptyText: {
    fontSize: SIZES.body,
    marginTop: SIZES.padding,
    textAlign: 'center',
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.base,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: SIZES.h2,
    fontWeight: FONTS.bold,
  },
  modalContent: {
    padding: SIZES.padding,
    paddingBottom: 100,
  },
  inputGroup: {
    marginBottom: SIZES.padding * 1.5,
  },
  label: {
    fontSize: SIZES.body,
    fontWeight: FONTS.bold,
    marginBottom: SIZES.base,
  },
  input: {
    borderWidth: 1,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.base,
    fontSize: SIZES.body,
    textAlign: 'right',
  },
  addButton: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES.padding,
    borderRadius: SIZES.radius,
    marginTop: SIZES.padding * 2,
  },
  addButtonText: {
    color: 'white',
    fontSize: SIZES.h2,
    fontWeight: FONTS.bold,
    marginLeft: SIZES.base,
  },
});
