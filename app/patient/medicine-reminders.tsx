import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Image, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { collection, query, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

export default function MedicineRemindersScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // جلب اسم المستخدم
    getDoc(doc(db, "users", user.uid)).then(snap => {
      if (snap.exists()) setUserName(snap.data().patient?.name || '');
    });

    const q = query(collection(db, "users", user.uid, "medicines"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // منطق اليوم: تصفير حالة الأدوية يومياً
      const today = new Date().toDateString();
      const updatedMeds = meds.map(med => {
        if (med.lastTakenDate !== today) {
          return { ...med, status: 'pending' };
        }
        return med;
      });
      
      setMedicines(updatedMeds.sort((a, b) => a.time.localeCompare(b.time)));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleTakeMedicine = async (medicine: any) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const today = new Date().toDateString();
      const medRef = doc(db, "users", user.uid, "medicines", medicine.id);
      
      await updateDoc(medRef, {
        status: 'taken',
        lastTakenDate: today
      });

      Alert.alert('أحسنت!', 'تم تسجيل أخذ الدواء بنجاح. بارك الله في صحتك.');
    } catch (error) {
      console.error("Error updating medicine status:", error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const pendingMeds = medicines.filter(m => m.status === 'pending');
  const takenMeds = medicines.filter(m => m.status === 'taken');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8F9FD' }]}>
      <Stack.Screen options={{ 
        title: 'مواعيد أدويتي', 
        headerTitleAlign: 'center',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 15 }}>
            <MaterialCommunityIcons name="arrow-right" size={32} color={COLORS.primary} />
          </TouchableOpacity>
        )
      }} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* قسم الأدوية الحالية - تصميم عملاق */}
        {pendingMeds.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>أدوية يجب أخذها الآن:</Text>
            {pendingMeds.map((med) => (
              <View key={med.id} style={styles.giantCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.timeBadge}>
                    <MaterialCommunityIcons name="clock-outline" size={24} color="white" />
                    <Text style={styles.timeBadgeText}>{med.displayTime || med.time}</Text>
                  </View>
                  <Text style={styles.medName}>{med.name}</Text>
                </View>
                
                <View style={styles.cardBody}>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>الجرعة المطلوبة:</Text>
                    <Text style={styles.infoValue}>{med.dosage || 'حسب تعليمات الطبيب'}</Text>
                  </View>
                  {med.description && (
                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>ملاحظة مهمة:</Text>
                      <Text style={styles.infoValue}>{med.description}</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity 
                  style={styles.confirmBtn}
                  onPress={() => handleTakeMedicine(med)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="check-circle-outline" size={40} color="white" />
                  <Text style={styles.confirmBtnText}>لقد شربت الدواء</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="check-decagram" size={100} color="#4CAF50" />
            <Text style={styles.emptyTitle}>ممتاز يا {userName}!</Text>
            <Text style={styles.emptySub}>لقد أخذت جميع أدويتك المجدولة حتى الآن.</Text>
          </View>
        )}

        {/* قسم الأدوية التي تم أخذها */}
        {takenMeds.length > 0 && (
          <View style={[styles.section, { marginTop: 30 }]}>
            <Text style={[styles.sectionTitle, { color: '#666' }]}>أدوية تم أخذها اليوم:</Text>
            {takenMeds.map((med) => (
              <View key={med.id} style={styles.takenCard}>
                <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
                <Text style={styles.takenText}>{med.name}</Text>
                <Text style={styles.takenTime}>{med.displayTime || med.time}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  section: { width: '100%' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, marginBottom: 15, textAlign: 'right' },
  giantCard: { backgroundColor: 'white', borderRadius: 35, elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, overflow: 'hidden', marginBottom: 25, borderWidth: 2, borderColor: COLORS.secondary + '30' },
  cardHeader: { backgroundColor: COLORS.secondary, padding: 25, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  medName: { color: 'white', fontSize: 28, fontWeight: 'bold', flex: 1, textAlign: 'right', marginRight: 15 },
  timeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  timeBadgeText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 5 },
  cardBody: { padding: 25 },
  infoBox: { marginBottom: 15, alignItems: 'flex-end' },
  infoLabel: { fontSize: 16, color: '#888', marginBottom: 5 },
  infoValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.textDark, textAlign: 'right' },
  confirmBtn: { backgroundColor: '#4CAF50', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', padding: 25 },
  confirmBtnText: { color: 'white', fontSize: 24, fontWeight: 'bold', marginRight: 15 },
  takenCard: { backgroundColor: '#f0f0f0', padding: 15, borderRadius: 20, flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10, opacity: 0.8 },
  takenText: { flex: 1, textAlign: 'right', marginRight: 10, fontSize: 18, color: '#666', fontWeight: 'bold' },
  takenTime: { fontSize: 14, color: '#999' },
  emptyState: { alignItems: 'center', marginTop: 50, padding: 30, backgroundColor: 'white', borderRadius: 30 },
  emptyTitle: { fontSize: 26, fontWeight: 'bold', color: '#333', marginTop: 20 },
  emptySub: { fontSize: 18, color: '#666', textAlign: 'center', marginTop: 10, lineHeight: 26 },
});
