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
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showPatientInfo, setShowPatientInfo] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  
  // للنقر المزدوج على صورة المريض
  const lastTapPatient = useRef(0);
  // للضغط المطول على الهيدير (Hidden Gesture)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressStart = useRef(0);

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

  // التوجيه الصوتي التلقائي (Auto-Voice Guidance)
  const speakWelcome = async (data: any) => {
    try {
      const patientName = data?.patient?.name || data?.patientName || 'صديقي';
      const message = `مرحباً ${patientName}! أنا رفيقك الذكي. اضغط على أي زر كبير لتبدأ رحلتك معي.`;
      await Speech.speak(message, {
        language: 'ar-SA',
        rate: 0.85,
        pitch: 1,
      });
    } catch (error) {
      console.error("Speech error:", error);
    }
  };

  // Haptic Feedback عند الضغط على أي زر
  const triggerHaptic = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Light);
    } catch (error) {
      console.error("Haptic error:", error);
    }
  };

  const handlePatientAvatarPress = () => {
    triggerHaptic();
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapPatient.current < DOUBLE_TAP_DELAY) {
      // نقرة مزدوجة للعودة لمقدم الرعاية
      setShowSwitchModal(true);
    } else {
      // نقرة واحدة لعرض المعلومات
      setShowPatientInfo(true);
    }
    lastTapPatient.current = now;
  };

  // Hidden Gesture: الضغط المطول على الهيدير (5 ثوانٍ)
  const handleHeaderLongPress = () => {
    longPressStart.current = Date.now();
    longPressTimer.current = setTimeout(() => {
      triggerHaptic();
      setShowEmergencyModal(true);
    }, 5000);
  };

  const handleHeaderPressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Giant UI Button Component
  const GiantPatientBox = ({ title, icon, color, onPress, subtitle }: any) => (
    <TouchableOpacity 
      style={[styles.giantBox, { borderBottomColor: color, backgroundColor: color + '08' }]} 
      onPress={() => {
        triggerHaptic();
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.giantIconCircle, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={60} color="white" />
      </View>
      <Text style={[styles.giantBoxTitle, { color: dynamicColors.textDark }]}>{title}</Text>
      <Text style={[styles.giantBoxSubtitle, { color: dynamicColors.textMuted }]}>{subtitle}</Text>
    </TouchableOpacity>
  );

  const handleSwitchToCaregiver = () => {
    triggerHaptic();
    setShowSwitchModal(false);
    router.replace('/caregiver/dashboard');
  };

  const handleEmergencyCall = async () => {
    triggerHaptic();
    try {
      await Speech.speak('سيتم الاتصال بمقدم الرعاية الآن', {
        language: 'ar-SA',
        rate: 0.85,
      });
      // هنا يمكن إضافة منطق الاتصال الفعلي
      setShowEmergencyModal(false);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: dynamicColors.backgroundLight }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 20, color: dynamicColors.textMuted, fontSize: 18 }}>نجهز لك عالمك الجميل...</Text>
      </View>
    );
  }

  const patient = userData?.patient || { name: userData?.patientName, profileImage: null };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* الهيدير مع الضغط المطول المخفي */}
      <Pressable 
        onLongPress={handleHeaderLongPress}
        onPressOut={handleHeaderPressOut}
        style={styles.topHeader}
      >
        <View style={styles.headerContent}>
          <View style={styles.emptySpace} />

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
      </Pressable>

      <View style={[styles.realityHeader, { backgroundColor: dynamicColors.primary }]}>
        <Text style={styles.dateText}>{getArabicDate()}</Text>
        <Text style={styles.timeText}>الساعة الآن: {currentTime}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <Text style={[styles.giantGreeting, { color: dynamicColors.textDark }]}>
            مرحباً، {patient?.name || 'صديقي'}!
          </Text>
          <Text style={[styles.giantSubGreeting, { color: dynamicColors.textMuted }]}>
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
      </ScrollView>

      {/* مودال معلومات المريض */}
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
            <Text style={styles.infoModalSub}>العمر: {patient.age || 'غير محدد'}</Text>
            {patient.likes && (
              <Text style={styles.infoModalDetail}>يحب: {patient.likes}</Text>
            )}
            <TouchableOpacity style={[styles.giantModalBtn, { backgroundColor: COLORS.primary }]} onPress={() => setShowPatientInfo(false)}>
              <Text style={styles.giantModalBtnText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* مودال التنقل (نقرة مزدوجة) */}
      <Modal visible={showSwitchModal} transparent animationType="fade" onRequestClose={() => setShowSwitchModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSwitchModal(false)}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="shield-account-outline" size={60} color={COLORS.primary} />
            <Text style={styles.giantModalTitle}>تأكيد الهوية</Text>
            <Text style={styles.giantModalSubtitle}>هل أنت مقدم الرعاية؟</Text>
            <TouchableOpacity style={[styles.giantModalBtn, { backgroundColor: COLORS.primary }]} onPress={handleSwitchToCaregiver}>
              <Text style={styles.giantModalBtnText}>نعم، عودة للوحة التحكم</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.giantModalBtn} onPress={() => setShowSwitchModal(false)}>
              <Text style={[styles.giantModalBtnText, { color: COLORS.textMuted }]}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* مودال الطوارئ (الضغط المطول على الهيدير) */}
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
    backgroundColor: 'white',
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
  },
  giantAiIconContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginLeft: 20 },
  giantAiTextContainer: { flex: 1, alignItems: 'flex-end' },
  giantAiTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  giantAiSubtitle: { color: 'white', fontSize: 18, opacity: 0.95, marginTop: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', width: '85%', padding: 35, borderRadius: 35, alignItems: 'center' },
  infoModalContent: { backgroundColor: 'white', width: '80%', padding: 30, borderRadius: 30, alignItems: 'center' },
  modalImageContainer: { marginBottom: 20 },
  infoModalImage: { width: 140, height: 140, borderRadius: 70 },
  infoModalImagePlaceholder: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  infoModalName: { fontSize: 26, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 8 },
  infoModalSub: { fontSize: 18, color: COLORS.textMuted, marginBottom: 12 },
  infoModalDetail: { fontSize: 16, color: COLORS.textDark, textAlign: 'center', marginBottom: 20 },
  giantModalTitle: { fontSize: 26, fontWeight: 'bold', marginTop: 20, color: COLORS.textDark },
  giantModalSubtitle: { fontSize: 18, color: COLORS.textMuted, textAlign: 'center', marginVertical: 20, lineHeight: 28 },
  giantModalBtn: { width: '100%', padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 15 },
  giantModalBtnText: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  emergencyModalContent: { backgroundColor: 'white', width: '90%', padding: 40, borderRadius: 40, alignItems: 'center' },
  emergencyIconContainer: { marginBottom: 25 },
  emergencyTitle: { fontSize: 28, fontWeight: 'bold', color: '#FF0000', marginBottom: 10 },
  emergencySubtitle: { fontSize: 20, color: COLORS.textMuted, textAlign: 'center', marginBottom: 30 },
  emergencyBtn: { width: '100%', padding: 25, borderRadius: 25, alignItems: 'center', marginTop: 15, flexDirection: 'row', justifyContent: 'center' },
  emergencyBtnText: { fontSize: 20, fontWeight: 'bold', color: 'white', marginLeft: 15 },
});
