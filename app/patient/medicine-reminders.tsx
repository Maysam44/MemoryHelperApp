import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { collection, query, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useNotifications } from '../hooks/use-notifications';
import { COLORS } from '../../constants/theme';

// ✅ إصلاح: تعريف الـ types بشكل صريح
interface Dose {
  time: string;
  displayTime: string;
  status: 'pending' | 'taken';
  lastTakenDate: string | null;
  description: string;
  notificationId: string | null;
  repeatingNotificationId: string | null;
}

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  description: string;
  doses: Dose[];
  createdAt: string;
}

export default function MedicineRemindersScreen() {
  const router = useRouter();
  const { cancelMedicineNotification } = useNotifications();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('');

  const [targetCaregiverId, setTargetCaregiverId] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: () => void;

    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        setUserName(userData?.patient?.name || userData?.patientName || '');
        
        const caregiverId = userData?.caregiverId || user.uid;
        setTargetCaregiverId(caregiverId);

        const q = query(collection(db, 'users', caregiverId, 'medicines'));
        unsubscribe = onSnapshot(q, snapshot => {
          const meds = snapshot.docs.map(d => ({
            id: d.id,
            ...(d.data() as Omit<Medicine, 'id'>),
          })) as Medicine[];

          const today = new Date().toDateString();
          const updatedMeds = meds.map(med => {
            const doses = med.doses ?? [];
            const updatedDoses = doses.map((dose: Dose) => {
              if (dose.lastTakenDate !== today) {
                return { ...dose, status: 'pending' as const };
              }
              return dose;
            });
            return { ...med, doses: updatedDoses };
          });

          setMedicines(updatedMeds);
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Error fetching medicines:', error);
        setIsLoading(false);
      }
    };

    fetchData();
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const handleTakeDose = async (medicineId: string, doseIndex: number) => {
    try {
      const user = auth.currentUser;
      if (!user || !targetCaregiverId) return;

      const medRef = doc(db, 'users', targetCaregiverId, 'medicines', medicineId);
      const snap = await getDoc(medRef);
      if (!snap.exists()) return;

      // ✅ إصلاح: cast صريح للـ data
      const med = snap.data() as Omit<Medicine, 'id'>;
      const today = new Date().toDateString();

      const updatedDoses = med.doses.map((dose: Dose, i: number) => {
        if (i === doseIndex) {
          return { ...dose, status: 'taken' as const, lastTakenDate: today };
        }
        return dose;
      });

      const currentDose = med.doses[doseIndex];
      if (currentDose?.notificationId) {
        await cancelMedicineNotification(
          currentDose.notificationId,
          currentDose.repeatingNotificationId ?? undefined
        );
      }

      await updateDoc(medRef, { doses: updatedDoses });
      Alert.alert('أحسنت! ✅', `تم تسجيل أخذ الجرعة: ${med.doses[doseIndex].displayTime}`);
    } catch (err) {
      console.error(err);
      Alert.alert('خطأ', 'حدث خطأ أثناء تسجيل الجرعة');
    }
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FD' }}>
      <Stack.Screen options={{
        title: 'مواعيد الأدوية',
        headerTitleAlign: 'center',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 15 }}>
            <MaterialCommunityIcons name="arrow-right" size={32} color={COLORS.primary} />
          </TouchableOpacity>
        )
      }} />

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {medicines.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <MaterialCommunityIcons name="check-decagram" size={100} color="#4CAF50" />
            <Text style={{ fontSize: 26, fontWeight: 'bold', marginTop: 20 }}>ممتاز يا {userName}!</Text>
            <Text style={{ fontSize: 18, color: '#666', textAlign: 'center', marginTop: 10 }}>لا توجد أدوية اليوم.</Text>
          </View>
        )}

        {medicines.map((med: Medicine) => (
          <View key={med.id} style={styles.medCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.medName}>{med.name} {med.dosage ? `- ${med.dosage}` : ''}</Text>
            </View>
            {med.doses.map((dose: Dose, index: number) => (
              <View key={index} style={[styles.doseRow, dose.status === 'taken' && { opacity: 0.6 }]}>
                <Text style={styles.doseTime}>{dose.displayTime}</Text>
                {dose.status === 'pending' ? (
                  <TouchableOpacity style={styles.confirmBtn} onPress={() => handleTakeDose(med.id, index)}>
                    <MaterialCommunityIcons name="check-circle-outline" size={28} color="white" />
                    <Text style={styles.confirmBtnText}>أخذت الجرعة</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>✅ تمت الجرعة</Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  medCard: { backgroundColor: 'white', borderRadius: 25, padding: 20, marginBottom: 25, elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15 },
  cardHeader: { backgroundColor: COLORS.secondary, padding: 15, borderRadius: 20, marginBottom: 15 },
  medName: { color: 'white', fontSize: 22, fontWeight: 'bold', textAlign: 'right' },
  doseRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  doseTime: { fontSize: 18, fontWeight: 'bold' },
  confirmBtn: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#4CAF50', padding: 10, borderRadius: 15 },
  confirmBtnText: { color: 'white', fontWeight: 'bold', marginRight: 5 },
});