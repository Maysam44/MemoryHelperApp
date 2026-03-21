import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Image, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';
import { auth, db } from '../../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

interface Medicine {
  id: string;
  name: string;
  time: string;
  description: string;
  dosage: string;
  frequency: string;
  image?: string;
}

export default function MedicineRemindersScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMedicineIndex, setCurrentMedicineIndex] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    fetchMedicines();
  }, []);

  useEffect(() => {
    // تشغيل التوجيه الصوتي عند تحميل الدواء الحالي
    if (medicines.length > 0 && !isLoading) {
      speakCurrentMedicine(medicines[currentMedicineIndex]);
    }
  }, [currentMedicineIndex, medicines, isLoading]);

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
        // ترتيب الأدوية حسب الوقت
        fetchedMedicines.sort((a, b) => a.time.localeCompare(b.time));
        setMedicines(fetchedMedicines);
      }
    } catch (error) {
      console.error('Error fetching medicines:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // التوجيه الصوتي التلقائي
  const speakCurrentMedicine = async (medicine: Medicine) => {
    try {
      const message = `حان وقت دواء ${medicine.name}. الجرعة: ${medicine.dosage}. اضغط على الزر الأخضر الكبير عندما تأخذ الدواء.`;
      await Speech.speak(message, {
        language: 'ar-SA',
        rate: 0.85,
        pitch: 1,
      });
    } catch (error) {
      console.error("Speech error:", error);
    }
  };

  // Haptic Feedback
  const triggerHaptic = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Light);
    } catch (error) {
      console.error("Haptic error:", error);
    }
  };

  const handleMedicineTaken = async () => {
    triggerHaptic();
    setShowConfirmation(true);
    
    try {
      await Speech.speak('تم تسجيل تناول الدواء. شكراً لك!', {
        language: 'ar-SA',
        rate: 0.85,
      });
    } catch (error) {
      console.error("Speech error:", error);
    }

    // الانتقال للدواء التالي بعد 2 ثانية
    setTimeout(() => {
      setShowConfirmation(false);
      if (currentMedicineIndex < medicines.length - 1) {
        setCurrentMedicineIndex(currentMedicineIndex + 1);
      } else {
        // إذا انتهت جميع الأدوية
        Alert.alert('تم!', 'لقد أخذت جميع أدويتك اليوم. ممتاز!');
        router.back();
      }
    }, 2000);
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: dynamicColors.backgroundLight }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 20, color: dynamicColors.textMuted, fontSize: 18 }}>جاري تحميل أدويتك...</Text>
      </View>
    );
  }

  if (medicines.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
        <Stack.Screen options={{ title: 'مواعيد أدويتي', headerTitleAlign: 'center' }} />
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="pill" size={120} color="#ccc" />
          <Text style={[styles.emptyText, { color: dynamicColors.textMuted }]}>لا توجد أدوية مجدولة حالياً</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentMedicine = medicines[currentMedicineIndex];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
      <Stack.Screen options={{ title: 'مواعيد أدويتي', headerTitleAlign: 'center' }} />
      
      <View style={styles.progressContainer}>
        <Text style={[styles.progressText, { color: dynamicColors.textDark }]}>
          الدواء {currentMedicineIndex + 1} من {medicines.length}
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${((currentMedicineIndex + 1) / medicines.length) * 100}%`,
                backgroundColor: COLORS.primary
              }
            ]} 
          />
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* عرض الدواء الحالي فقط بحجم عملاق */}
        <View style={[styles.giantMedicineCard, { backgroundColor: '#55E6C1' }]}>
          {/* أيقونة علبة الدواء الكبيرة */}
          <View style={styles.giantMedicineIconContainer}>
            <MaterialCommunityIcons name="pill-multiple" size={100} color="white" />
          </View>

          {/* اسم الدواء بحجم كبير جداً */}
          <Text style={styles.giantMedicineName}>{currentMedicine.name}</Text>

          {/* الجرعة */}
          <View style={styles.giantDosageContainer}>
            <Text style={styles.giantDosageLabel}>الجرعة:</Text>
            <Text style={styles.giantDosageValue}>{currentMedicine.dosage}</Text>
          </View>

          {/* الوقت */}
          <View style={styles.giantTimeContainer}>
            <MaterialCommunityIcons name="clock-outline" size={40} color="white" />
            <Text style={styles.giantTimeText}>{currentMedicine.time}</Text>
          </View>

          {/* الوصف */}
          {currentMedicine.description && (
            <Text style={styles.giantDescription}>{currentMedicine.description}</Text>
          )}
        </View>

        {/* زر "تم الأخذ" الضخم */}
        <TouchableOpacity 
          style={[styles.giantConfirmButton, { backgroundColor: COLORS.primary }]}
          onPress={handleMedicineTaken}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="check-circle" size={60} color="white" />
          <Text style={styles.giantConfirmButtonText}>تم الأخذ</Text>
        </TouchableOpacity>

        {/* قائمة الأدوية الأخرى الصغيرة */}
        <View style={styles.otherMedicinesContainer}>
          <Text style={[styles.otherMedicinesTitle, { color: dynamicColors.textDark }]}>الأدوية الأخرى اليوم:</Text>
          <FlatList
            data={medicines.filter((_, index) => index !== currentMedicineIndex)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[styles.smallMedicineCard, { backgroundColor: dynamicColors.card }]}>
                <MaterialCommunityIcons name="pill" size={30} color={COLORS.primary} />
                <View style={styles.smallMedicineInfo}>
                  <Text style={[styles.smallMedicineName, { color: dynamicColors.textDark }]}>{item.name}</Text>
                  <Text style={[styles.smallMedicineTime, { color: dynamicColors.textMuted }]}>{item.time}</Text>
                </View>
              </View>
            )}
            scrollEnabled={false}
          />
        </View>
      </View>

      {/* مودال التأكيد */}
      <Modal visible={showConfirmation} transparent animationType="fade">
        <View style={styles.confirmationOverlay}>
          <View style={styles.confirmationContent}>
            <MaterialCommunityIcons name="check-circle" size={100} color="#55E6C1" />
            <Text style={styles.confirmationTitle}>ممتاز!</Text>
            <Text style={styles.confirmationSubtitle}>تم تسجيل تناول الدواء</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  progressContainer: { paddingHorizontal: 20, paddingVertical: 15 },
  progressText: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  progressBar: { height: 12, backgroundColor: '#eee', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },
  mainContent: { flex: 1, paddingHorizontal: 15, paddingVertical: 20, justifyContent: 'space-between' },
  giantMedicineCard: {
    borderRadius: 35,
    padding: 30,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    minHeight: 350,
    justifyContent: 'center',
  },
  giantMedicineIconContainer: { marginBottom: 25 },
  giantMedicineName: { fontSize: 36, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 25 },
  giantDosageContainer: { alignItems: 'center', marginBottom: 20 },
  giantDosageLabel: { fontSize: 18, color: 'rgba(255,255,255,0.8)', marginBottom: 5 },
  giantDosageValue: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  giantTimeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  giantTimeText: { fontSize: 28, fontWeight: 'bold', color: 'white', marginLeft: 10 },
  giantDescription: { fontSize: 16, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 15 },
  giantConfirmButton: {
    borderRadius: 30,
    paddingVertical: 30,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    minHeight: 140,
    marginVertical: 20,
  },
  giantConfirmButtonText: { fontSize: 28, fontWeight: 'bold', color: 'white', marginTop: 15 },
  otherMedicinesContainer: { marginTop: 20 },
  otherMedicinesTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  smallMedicineCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 15,
    borderRadius: 20,
    marginBottom: 10,
    elevation: 2,
  },
  smallMedicineInfo: { flex: 1, marginRight: 15, alignItems: 'flex-end' },
  smallMedicineName: { fontSize: 16, fontWeight: 'bold' },
  smallMedicineTime: { fontSize: 14, marginTop: 4 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 20, marginTop: 20, textAlign: 'center' },
  confirmationOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  confirmationContent: { backgroundColor: 'white', padding: 40, borderRadius: 40, alignItems: 'center' },
  confirmationTitle: { fontSize: 32, fontWeight: 'bold', color: '#55E6C1', marginTop: 20 },
  confirmationSubtitle: { fontSize: 18, color: '#666', marginTop: 10 },
});
