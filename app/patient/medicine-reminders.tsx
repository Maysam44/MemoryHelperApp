import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Image, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';
import { auth, db } from '../../firebaseConfig';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');
const CREAM_WHITE = '#FFFBF0';

interface Medicine {
  id: string;
  name: string;
  time: string;
  description: string;
  dosage: string;
  frequency: string;
  image?: string;
  taken?: boolean;
  takenAt?: string;
}

// إعداد الإشعارات
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function MedicineRemindersScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMedicineIndex, setCurrentMedicineIndex] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [notificationTimers, setNotificationTimers] = useState<{ [key: string]: NodeJS.Timeout[] }>({});

  useEffect(() => {
    fetchMedicines();
    return () => {
      // تنظيف المؤقتات عند الخروج
      Object.values(notificationTimers).forEach(timers => {
        timers.forEach(timer => clearTimeout(timer));
      });
    };
  }, []);

  useEffect(() => {
    // تشغيل التوجيه الصوتي عند تحميل الدواء الحالي
    if (medicines.length > 0 && !isLoading) {
      const currentMedicine = medicines[currentMedicineIndex];
      if (!currentMedicine.taken) {
        speakCurrentMedicine(currentMedicine);
        scheduleNotifications(currentMedicine);
      }
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
          const data = doc.data();
          fetchedMedicines.push({ 
            id: doc.id, 
            ...data,
            taken: data.taken || false,
          } as Medicine);
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

  // جدولة الإشعارات الذكية
  const scheduleNotifications = async (medicine: Medicine) => {
    try {
      const [hours, minutes] = medicine.time.split(':').map(Number);
      const now = new Date();
      const medicineTime = new Date();
      medicineTime.setHours(hours, minutes, 0);

      const timers: NodeJS.Timeout[] = [];

      // إشعار قبل 5 دقائق
      const fiveMinutesBefore = new Date(medicineTime.getTime() - 5 * 60000);
      if (fiveMinutesBefore > now) {
        const delay = fiveMinutesBefore.getTime() - now.getTime();
        const timer = setTimeout(async () => {
          await sendNotification(`تنبيه: سيحين موعد دواء ${medicine.name} بعد 5 دقائق`);
        }, delay);
        timers.push(timer);
      }

      // إشعار عند الموعد المحدد
      if (medicineTime > now) {
        const delay = medicineTime.getTime() - now.getTime();
        const timer = setTimeout(async () => {
          await sendNotification(`حان موعد دواء ${medicine.name} الآن!`);
          // تكرار الإشعار كل 5 دقائق حتى يؤكد المريض تناول الدواء
          repeatNotification(medicine, timers);
        }, delay);
        timers.push(timer);
      }

      setNotificationTimers(prev => ({
        ...prev,
        [medicine.id]: timers
      }));
    } catch (error) {
      console.error("Notification scheduling error:", error);
    }
  };

  // تكرار الإشعار كل 5 دقائق
  const repeatNotification = (medicine: Medicine, timers: NodeJS.Timeout[]) => {
    const repeatTimer = setInterval(async () => {
      // التحقق من عدم تناول الدواء بعد
      const currentMedicine = medicines.find(m => m.id === medicine.id);
      if (currentMedicine && !currentMedicine.taken) {
        await sendNotification(`تذكير: لم تأخذ دواء ${medicine.name} بعد. اضغط على الزر الأخضر.`);
      } else {
        clearInterval(repeatTimer);
      }
    }, 5 * 60000); // كل 5 دقائق

    timers.push(repeatTimer as any);
  };

  // إرسال الإشعار
  const sendNotification = async (message: string) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'رفيق الذاكرة',
          body: message,
          sound: true,
        },
        trigger: null, // إرسال فوري
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  // Haptic Feedback
  const triggerHaptic = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Haptic error:", error);
    }
  };

  const handleMedicineTaken = async () => {
    triggerHaptic();
    const currentMedicine = medicines[currentMedicineIndex];
    
    try {
      // تحديث قاعدة البيانات
      const medicineRef = doc(db, `users/${auth.currentUser?.uid}/medicines`, currentMedicine.id);
      await updateDoc(medicineRef, {
        taken: true,
        takenAt: new Date().toISOString(),
      });

      // تحديث الحالة المحلية
      const updatedMedicines = [...medicines];
      updatedMedicines[currentMedicineIndex].taken = true;
      setMedicines(updatedMedicines);

      setShowConfirmation(true);
      
      await Speech.speak('تم تسجيل تناول الدواء. شكراً لك!', {
        language: 'ar-SA',
        rate: 0.85,
      });

      // الانتقال للدواء التالي غير المأخوذ بعد 2 ثانية
      setTimeout(() => {
        setShowConfirmation(false);
        const nextIndex = updatedMedicines.findIndex((m, idx) => idx > currentMedicineIndex && !m.taken);
        
        if (nextIndex !== -1) {
          setCurrentMedicineIndex(nextIndex);
        } else {
          // إذا انتهت جميع الأدوية
          Alert.alert('تم!', 'لقد أخذت جميع أدويتك اليوم. ممتاز!');
          router.back();
        }
      }, 2000);
    } catch (error) {
      console.error("Error updating medicine:", error);
      Alert.alert('خطأ', 'حدث خطأ أثناء تسجيل الدواء');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: CREAM_WHITE }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 20, color: '#666', fontSize: 18 }}>جاري تحميل أدويتك...</Text>
      </View>
    );
  }

  // تصفية الأدوية غير المأخوذة
  const unfinishedMedicines = medicines.filter(m => !m.taken);

  if (unfinishedMedicines.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: CREAM_WHITE }]}>
        <Stack.Screen options={{ title: 'مواعيد أدويتي', headerTitleAlign: 'center' }} />
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="check-circle" size={120} color="#55E6C1" />
          <Text style={[styles.emptyText, { color: '#333' }]}>ممتاز!</Text>
          <Text style={[styles.emptySubText, { color: '#666' }]}>لقد أخذت جميع أدويتك اليوم</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentMedicine = unfinishedMedicines[0];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: CREAM_WHITE }]}>
      <Stack.Screen options={{ title: 'مواعيد أدويتي', headerTitleAlign: 'center' }} />
      
      <View style={styles.progressContainer}>
        <Text style={[styles.progressText, { color: '#333' }]}>
          الدواء {medicines.findIndex(m => m.id === currentMedicine.id) + 1} من {medicines.length}
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${((medicines.findIndex(m => m.id === currentMedicine.id) + 1) / medicines.length) * 100}%`,
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
        {unfinishedMedicines.length > 1 && (
          <View style={styles.otherMedicinesContainer}>
            <Text style={[styles.otherMedicinesTitle, { color: '#333' }]}>الأدوية الأخرى اليوم:</Text>
            <FlatList
              data={unfinishedMedicines.slice(1)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.smallMedicineCard, { backgroundColor: 'white' }]}>
                  <MaterialCommunityIcons name="pill" size={30} color={COLORS.primary} />
                  <View style={styles.smallMedicineInfo}>
                    <Text style={[styles.smallMedicineName, { color: '#333' }]}>{item.name}</Text>
                    <Text style={[styles.smallMedicineTime, { color: '#666' }]}>{item.time} • {item.dosage}</Text>
                  </View>
                </View>
              )}
              scrollEnabled={false}
            />
          </View>
        )}
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
    minHeight: 320,
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
  emptyText: { fontSize: 28, fontWeight: 'bold', marginTop: 20, textAlign: 'center' },
  emptySubText: { fontSize: 18, marginTop: 10, textAlign: 'center' },
  confirmationOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  confirmationContent: { backgroundColor: 'white', padding: 40, borderRadius: 40, alignItems: 'center' },
  confirmationTitle: { fontSize: 32, fontWeight: 'bold', color: '#55E6C1', marginTop: 20 },
  confirmationSubtitle: { fontSize: 18, color: '#666', marginTop: 10 },
});
