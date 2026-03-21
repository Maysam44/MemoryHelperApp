import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView, TouchableOpacity, Dimensions, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';

const { width, height } = Dimensions.get('window');
const CREAM_WHITE = '#FFFBF0'; // لون أبيض مصفر مريح للعين

const getArabicDate = () => {
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Intl.DateTimeFormat('ar-EG', options).format(new Date());
};

export default function PatientDashboard() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
  const [showPatientInfo, setShowPatientInfo] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showEmergencyInfo, setShowEmergencyInfo] = useState(false);
  
  // للضغط المطول على الهيدير (Hidden Gesture) - 5 ثوانٍ على المكان الفارغ
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressStart = useRef(0);
  const doubleTapCount = useRef(0);
  const doubleTapTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
    }, 60000);

    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserData(userDocSnap.data());
            // تشغيل التوجيه الصوتي التلقائي
            await speakWelcome(userDocSnap.data());
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
    return () => clearInterval(timer);
  }, []);

  // التوجيه الصوتي التلقائي
  const speakWelcome = async (data: any) => {
    try {
      const patientName = data?.patient?.name || data?.patientName || 'صديقي';
      const message = `مرحباً ${patientName}! أنا رفيقك الذكي. اختر ما تريد فعله من الأزرار الكبيرة أمامك.`;
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
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Haptic error:", error);
    }
  };

  const handlePatientAvatarPress = () => {
    triggerHaptic();
    setShowPatientInfo(true);
  };

  // Hidden Gesture: الضغط المطول على المكان الفارغ (5 ثوانٍ)
  const handleEmptySpaceLongPress = () => {
    longPressStart.current = Date.now();
    longPressTimer.current = setTimeout(() => {
      triggerHaptic();
      setShowEmergencyModal(true);
    }, 5000);
  };

  const handleEmptySpacePressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Giant UI Button Component
  const GiantPatientBox = ({ title, icon, color, onPress, subtitle }: any) => (
    <TouchableOpacity 
      style={[styles.giantBox, { backgroundColor: CREAM_WHITE, borderBottomColor: color }]} 
      onPress={() => {
        triggerHaptic();
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.giantIconCircle, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={60} color="white" />
      </View>
      <Text style={[styles.giantBoxTitle, { color: '#333' }]}>{title}</Text>
      <Text style={[styles.giantBoxSubtitle, { color: '#666' }]}>{subtitle}</Text>
    </TouchableOpacity>
  );

  const handleEmergencyCall = async () => {
    triggerHaptic();
    try {
      const caregiverPhone = userData?.caregiverPhone || userData?.phone;
      if (caregiverPhone) {
        await Speech.speak(`سيتم الاتصال برقم ${caregiverPhone}`, {
          language: 'ar-SA',
          rate: 0.85,
        });
        // هنا يمكن إضافة منطق الاتصال الفعلي
      }
      setShowEmergencyModal(false);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: CREAM_WHITE }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 20, color: '#666', fontSize: 18 }}>نجهز لك عالمك الجميل...</Text>
      </View>
    );
  }

  const patient = userData?.patient || { name: userData?.patientName, profileImage: null };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: CREAM_WHITE }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* الهيدير مع الضغط المطول المخفي على المكان الفارغ */}
      <View style={styles.topHeader}>
        <View style={styles.headerContent}>
          <Pressable 
            onLongPress={handleEmptySpaceLongPress}
            onPressOut={handleEmptySpacePressOut}
            style={styles.emptySpace}
          />

          <View style={styles.headerCenter}>
            <Image 
              source={require('../images/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.appNameContainer}>
              <Text style={[styles.appNamePart1, { color: COLORS.secondary }]}>رفيق</Text>
              <Text style={[styles.appNamePart2, { color: COLORS.primary }]}>الذاكرة</Text>
            </View>
          </View>

          <TouchableOpacity onPress={handlePatientAvatarPress} style={styles.headerAvatar}>
            {patient.profileImage ? (
              <Image source={{ uri: patient.profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                <MaterialCommunityIcons name="account" size={32} color="white" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.realityHeader, { backgroundColor: COLORS.primary }]}>
        <Text style={styles.dateText}>{getArabicDate()}</Text>
        <Text style={styles.timeText}>الساعة الآن: {currentTime}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <Text style={[styles.giantGreeting, { color: '#333' }]}>
            مرحباً، {patient?.name || 'صديقي'}!
          </Text>
          <Text style={[styles.giantSubGreeting, { color: '#666' }]}>
            اختر ما تريد فعله
          </Text>
        </View>

        <View style={styles.giantGrid}>
          <GiantPatientBox 
            title="بنك الذكريات" 
            subtitle="شاهد صور أحبائك"
            icon="brain" 
            color="#6C5CE7" 
            onPress={() => router.push('/patient/memory-bank')} 
          />
          <GiantPatientBox 
            title="رسائل أحبابي" 
            subtitle="استمع لأصواتهم"
            icon="microphone" 
            color="#FF7675" 
            onPress={() => router.push('/patient/voice-memories')} 
          />
          <GiantPatientBox 
            title="أدويتي" 
            subtitle="مواعيد دوائك"
            icon="pill" 
            color="#55E6C1" 
            onPress={() => router.push('/patient/medicine-reminders')} 
          />
          <GiantPatientBox 
            title="أماكني الآمنة" 
            subtitle="أين أنت الآن؟"
            icon="map-marker-radius" 
            color="#F9CA24" 
            onPress={() => router.push('/patient/safe-zones')} 
          />
        </View>

        <TouchableOpacity 
          style={[styles.giantAiCard, { backgroundColor: COLORS.secondary }]}
          onPress={() => {
            triggerHaptic();
            router.push('/patient/ai-chat');
          }}
          activeOpacity={0.85}
        >
          <View style={styles.giantAiIconContainer}>
            <MaterialCommunityIcons name="chat-processing" size={50} color="white" />
          </View>
          <View style={styles.giantAiTextContainer}>
            <Text style={styles.giantAiTitle}>تحدث مع رفيقك الذكي</Text>
            <Text style={styles.giantAiSubtitle}>أنا هنا لأسمعك دائماً</Text>
          </View>
          <MaterialCommunityIcons name="chevron-left" size={40} color="white" />
        </TouchableOpacity>

        {/* زر النجدة تحت المساعد الذكي */}
        <TouchableOpacity 
          style={styles.emergencyButtonContainer}
          onPress={() => setShowEmergencyInfo(true)}
        >
          <View style={styles.emergencyButtonContent}>
            <MaterialCommunityIcons name="alert-circle" size={50} color="#FF0000" />
            <View style={styles.emergencyButtonText}>
              <Text style={styles.emergencyButtonTitle}>زر النجدة</Text>
              <Text style={styles.emergencyButtonSubtitle}>اضغط هنا إذا احتجت مساعدة</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* معلومات استخدام زر النجدة */}
        <View style={styles.emergencyInfoBox}>
          <MaterialCommunityIcons name="information-outline" size={24} color={COLORS.primary} />
          <Text style={styles.emergencyInfoText}>
            اضغط على زر النجدة الأحمر إذا شعرت بالارتباك أو احتجت مساعدة فوراً. سيتم الاتصال بمقدم الرعاية الخاص بك مباشرة.
          </Text>
        </View>
      </ScrollView>

      {/* مودال معلومات المريض الموسعة */}
      <Modal visible={showPatientInfo} transparent animationType="fade" onRequestClose={() => setShowPatientInfo(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPatientInfo(false)}>
          <View style={styles.infoModalContent}>
            <View style={styles.modalImageContainer}>
              {patient.profileImage ? (
                <Image source={{ uri: patient.profileImage }} style={styles.infoModalImage} />
              ) : (
                <View style={[styles.infoModalImage, styles.infoModalImagePlaceholder]}>
                  <MaterialCommunityIcons name="account" size={80} color="white" />
                </View>
              )}
            </View>
            <Text style={styles.infoModalName}>{patient.name}</Text>
            
            {/* معلومات موسعة */}
            <View style={styles.infoDetailsContainer}>
              {patient.age && (
                <View style={styles.infoDetailRow}>
                  <MaterialCommunityIcons name="cake" size={50} color={COLORS.primary} />
                  <Text style={styles.infoDetailText}>العمر: {patient.age} سنة</Text>
                </View>
              )}
              {patient.likes && (
                <View style={styles.infoDetailRow}>
                  <MaterialCommunityIcons name="heart" size={20} color="#FF7675" />
                  <Text style={styles.infoDetailText}>يحب: {patient.likes}</Text>
                </View>
              )}
              {patient.medicalCondition && (
                <View style={styles.infoDetailRow}>
                  <MaterialCommunityIcons name="hospital-box" size={20} color="#55E6C1" />
                  <Text style={styles.infoDetailText}>الحالة: {patient.medicalCondition}</Text>
                </View>
              )}
              {patient.emergencyContact && (
                <View style={styles.infoDetailRow}>
                  <MaterialCommunityIcons name="phone" size={20} color="#6C5CE7" />
                  <Text style={styles.infoDetailText}>الاتصال: {patient.emergencyContact}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={[styles.giantModalBtn, { backgroundColor: COLORS.primary }]} onPress={() => setShowPatientInfo(false)}>
              <Text style={styles.giantModalBtnText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* مودال الطوارئ */}
      <Modal visible={showEmergencyModal} transparent animationType="fade" onRequestClose={() => setShowEmergencyModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowEmergencyModal(false)}>
          <View style={styles.emergencyModalContent}>
            <View style={styles.emergencyIconContainer}>
              <MaterialCommunityIcons name="alert-circle" size={80} color="#FF0000" />
            </View>
            <Text style={styles.emergencyTitle}>هل تحتاج مساعدة؟</Text>
            <Text style={styles.emergencySubtitle}>سأتصل بمقدم الرعاية الآن</Text>
            <TouchableOpacity style={[styles.emergencyBtn, { backgroundColor: '#FF0000' }]} onPress={handleEmergencyCall}>
              <MaterialCommunityIcons name="phone" size={40} color="white" />
              <Text style={styles.emergencyBtnText}>اتصل الآن</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.emergencyBtn, { backgroundColor: '#CCCCCC' }]} onPress={() => setShowEmergencyModal(false)}>
              <Text style={[styles.emergencyBtnText, { color: '#333' }]}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* مودال معلومات زر النجدة */}
      <Modal visible={showEmergencyInfo} transparent animationType="fade" onRequestClose={() => setShowEmergencyInfo(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowEmergencyInfo(false)}>
          <View style={styles.infoModalContent}>
            <MaterialCommunityIcons name="alert-circle" size={60} color="#FF0000" />
            <Text style={styles.infoModalName}>كيفية استخدام زر النجدة</Text>
            
            <View style={styles.instructionsContainer}>
              <View style={styles.instructionStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.instructionText}>اضغط على الزر الأحمر أعلاه</Text>
              </View>
              
              <View style={styles.instructionStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.instructionText}>سيظهر لك زر "اتصل الآن" أحمر كبير</Text>
              </View>
              
              <View style={styles.instructionStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.instructionText}>اضغط على الزر الأحمر للاتصال بمقدم الرعاية</Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.giantModalBtn, { backgroundColor: COLORS.primary }]} onPress={() => setShowEmergencyInfo(false)}>
              <Text style={styles.giantModalBtnText}>فهمت</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topHeader: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'white', position: 'relative' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emptySpace: { width: 50, height: 50 },
  headerCenter: { flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  appNameContainer: { flexDirection: 'row-reverse', alignItems: 'center', marginLeft: 10 },
  appNamePart1: { fontSize: 22, fontWeight: 'bold', marginRight: 4 },
  appNamePart2: { fontSize: 22, fontWeight: 'bold' },
  logo: { width: 40, height: 40 },
  realityHeader: { paddingVertical: 15, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  dateText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  timeText: { color: 'white', fontSize: 16, marginTop: 4 },
  scrollContent: { padding: 15, paddingBottom: 40 },
  welcomeSection: { alignItems: 'center', marginBottom: 30 },
  giantGreeting: { fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
  giantSubGreeting: { fontSize: 22, textAlign: 'center', marginTop: 8 },
  giantGrid: { flexDirection: 'column', justifyContent: 'space-between' },
  giantBox: {
    width: '100%',
    padding: 25,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderBottomWidth: 6,
    minHeight: 180,
    justifyContent: 'center',
  },
  giantIconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  giantBoxTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  giantBoxSubtitle: { fontSize: 16, textAlign: 'center', marginTop: 8 },
  giantAiCard: {
    marginTop: 15,
    padding: 30,
    borderRadius: 35,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    elevation: 10,
    shadowColor: COLORS.secondary,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    minHeight: 150,
    marginBottom: 20,
  },
  giantAiIconContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginLeft: 20 },
  giantAiTextContainer: { flex: 1, alignItems: 'flex-end' },
  giantAiTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  giantAiSubtitle: { color: 'white', fontSize: 18, opacity: 0.95, marginTop: 5 },
  emergencyButtonContainer: {
    backgroundColor: '#FFE5E5',
    borderRadius: 30,
    padding: 20,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#FF0000',
    elevation: 6,
  },
  emergencyButtonContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  emergencyButtonText: {
    flex: 1,
    marginRight: 20,
    alignItems: 'flex-end',
  },
  emergencyButtonTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF0000',
  },
  emergencyButtonSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  emergencyInfoBox: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 30,
  },
  emergencyInfoText: {
    fontSize: 14,
    color: '#333',
    marginRight: 15,
    flex: 1,
    textAlign: 'right',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  infoModalContent: { backgroundColor: 'white', width: '85%', padding: 30, borderRadius: 30, alignItems: 'center' },
  modalImageContainer: { marginBottom: 20 },
  infoModalImage: { width: 140, height: 140, borderRadius: 70 },
  infoModalImagePlaceholder: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  infoModalName: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  infoDetailsContainer: { width: '100%', marginBottom: 20 },
  infoDetailRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoDetailText: {
    fontSize: 16,
    color: '#333',
    marginRight: 15,
    flex: 1,
    textAlign: 'right',
  },
  giantModalBtn: { width: '100%', padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 15 },
  giantModalBtnText: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  emergencyModalContent: { backgroundColor: 'white', width: '90%', padding: 40, borderRadius: 40, alignItems: 'center' },
  emergencyIconContainer: { marginBottom: 25 },
  emergencyTitle: { fontSize: 28, fontWeight: 'bold', color: '#FF0000', marginBottom: 10 },
  emergencySubtitle: { fontSize: 20, color: '#666', textAlign: 'center', marginBottom: 30 },
  emergencyBtn: { width: '100%', padding: 25, borderRadius: 25, alignItems: 'center', marginTop: 15, flexDirection: 'row', justifyContent: 'center' },
  emergencyBtnText: { fontSize: 20, fontWeight: 'bold', color: 'white', marginLeft: 15 },
  instructionsContainer: { width: '100%', marginVertical: 20 },
  instructionStep: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepNumber: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  stepNumberText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  instructionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
});
