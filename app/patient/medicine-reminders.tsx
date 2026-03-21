import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';
import { auth, db } from '../../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

interface Medicine {
  id: string;
  name: string;
  time: string;
  description: string;
  dosage: string;
  frequency: string;
}

export default function MedicineRemindersScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      console.error('Error fetching medicines:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const MedicineCard = ({ medicine }: { medicine: Medicine }) => (
    <View style={[styles.medicineCard, { backgroundColor: 'white', borderColor: '#eee' }]}>
      <View style={styles.medicineHeader}>
        <View style={[styles.timeCircle, { backgroundColor: COLORS.primary + '15' }]}>
          <MaterialCommunityIcons name="clock-outline" size={30} color={COLORS.primary} />
          <Text style={[styles.timeText, { color: COLORS.primary }]}>{medicine.time}</Text>
        </View>
        <View style={styles.medicineInfo}>
          <Text style={[styles.medicineName, { color: COLORS.textDark }]}>{medicine.name}</Text>
          <Text style={[styles.medicineDosage, { color: COLORS.textMuted }]}>{medicine.dosage} • {medicine.frequency}</Text>
          {medicine.description && (
            <Text style={[styles.medicineDescription, { color: COLORS.textMuted }]}>{medicine.description}</Text>
          )}
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8F9FD' }]}>
      <Stack.Screen options={{ title: 'مواعيد أدويتي', headerTitleAlign: 'center' }} />
      <FlatList
        data={medicines}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MedicineCard medicine={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="pill" size={100} color="#ccc" />
            <Text style={styles.emptyText}>لا توجد أدوية مجدولة حالياً</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20 },
  medicineCard: { padding: 20, borderRadius: 25, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1 },
  medicineHeader: { flexDirection: 'row-reverse', alignItems: 'center' },
  timeCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginLeft: 20 },
  timeText: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  medicineInfo: { flex: 1, alignItems: 'flex-end' },
  medicineName: { fontSize: 22, fontWeight: 'bold' },
  medicineDosage: { fontSize: 16, marginTop: 4 },
  medicineDescription: { fontSize: 14, marginTop: 8, textAlign: 'right' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, color: '#999', marginTop: 20 },
});
