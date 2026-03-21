import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView, TouchableOpacity, Dimensions, Modal, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';

const { width } = Dimensions.get('window');

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
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [modalType, setModalType] = useState<'patient' | 'caregiver'>('patient');
  
  // نظام العودة السري
  const [tapCount, setTapCount] = useState(0);
  
  // للنقر المزدوج
  const lastTapPatient = useRef(0);
  const lastTapCaregiver = useRef(0);

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

  const handleSecretTap = () => {
    const newCount = tapCount + 1;
    if (newCount >= 5) {
      setTapCount(0);
      setShowSwitchModal(true);
    } else {
      setTapCount(newCount);
      setTimeout(() => setTapCount(0), 2000);
    }
  };

  const handlePatientAvatarPress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapPatient.current < DOUBLE_TAP_DELAY) {
      // نقرة مزدوجة للانتقال
      setShowSwitchModal(true);
    } else {
      // نقرة واحدة للمعلومات
      setModalType('patient');
      setShowInfoModal(true);
    }
    lastTapPatient.current = now;
  };

  const handleCaregiverAvatarPress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapCaregiver.current < DOUBLE_TAP_DELAY) {
      // نقرة مزدوجة للانتقال
      setShowSwitchModal(true);
    } else {
      // نقرة واحدة للمعلومات
      setModalType('caregiver');
      setShowInfoModal(true);
    }
    lastTapCaregiver.current = now;
  };

  const PatientBox = ({ title, icon, color, onPress, subtitle }: any) => (
    <TouchableOpacity 
      style={[styles.box, { borderBottomColor: color }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name={icon} size={40} color={color} />
      </View>
      <Text style={[styles.boxTitle, { color: dynamicColors.textDark }]}>{title}</Text>
      <Text style={[styles.boxSubtitle, { color: dynamicColors.textMuted }]}>{subtitle}</Text>
    </TouchableOpacity>
  );

  const handleSwitchToCaregiver = () => {
    setShowSwitchModal(false);
    router.replace('/caregiver/dashboard');
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: dynamicColors.backgroundLight }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 20, color: dynamicColors.textMuted }}>نجهز لك عالمك الجميل...</Text>
      </View>
    );
  }

  const patient = userData?.patient || { name: userData?.patientName, profileImage: null };
  const caregiver = userData?.caregiver || { name: userData?.name, relationship: userData?.relationship, profileImage: userData?.profileImage };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.topHeader}>
        <Pressable style={styles.secretArea} onPress={handleSecretTap} />
        
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleCaregiverAvatarPress} style={styles.headerAvatar}>
            {caregiver.profileImage ? (
              <Image source={{ uri: caregiver.profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholder, { backgroundColor: COLORS.secondary }]}>
                <MaterialCommunityIcons name="account-heart" size={24} color="white" />
              </View>
            )}
          </TouchableOpacity>

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
              <View style={[styles.avatarImage, styles.avatarPlaceholder, { backgroundColor: COLORS.primary }]}>
                <MaterialCommunityIcons name="account" size={24} color="white" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.realityHeader, { backgroundColor: dynamicColors.primary }]}>
        <Text style={styles.dateText}>{getArabicDate()}</Text>
        <Text style={styles.timeText}>الساعة الآن: {currentTime}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <Text style={[styles.greeting, { color: dynamicColors.textDark }]}>
            مرحباً بك، {patient?.name || 'صديقي'}!
          </Text>
          <Text style={[styles.subGreeting, { color: dynamicColors.textMuted }]}>
            كيف يمكنني مساعدتك اليوم؟
          </Text>
        </View>

        <View style={styles.grid}>
          <PatientBox 
            title="بنك الذكريات" 
            subtitle="شاهد صور أحبائك"
            icon="brain" 
            color="#6C5CE7" 
            onPress={() => router.push('/patient/memory-bank')} 
          />
          <PatientBox 
            title="رسائل أحبابي" 
            subtitle="استمع لأصواتهم الحنونة"
            icon="microphone" 
            color="#FF7675" 
            onPress={() => router.push('/patient/voice-memories')} 
          />
          <PatientBox 
            title="أدويتي" 
            subtitle="مواعيد دوائك المهمة"
            icon="pill" 
            color="#55E6C1" 
            onPress={() => router.push('/patient/medicine-reminders')} 
          />
          <PatientBox 
            title="أماكني الآمنة" 
            subtitle="أين أنت الآن؟"
            icon="map-marker-radius" 
            color="#F9CA24" 
            onPress={() => router.push('/patient/safe-zones')} 
          />
        </View>

        <TouchableOpacity 
          style={[styles.aiCard, { backgroundColor: COLORS.secondary }]}
          onPress={() => router.push('/patient/ai-chat')}
          activeOpacity={0.9}
        >
          <View style={styles.aiIconContainer}>
            <MaterialCommunityIcons name="chat-processing" size={40} color="white" />
          </View>
          <View style={styles.aiTextContainer}>
            <Text style={styles.aiTitle}>تحدث مع رفيقك الذكي</Text>
            <Text style={styles.aiSubtitle}>أنا هنا لأسمعك وأسلي وقتك دائماً</Text>
          </View>
          <MaterialCommunityIcons name="chevron-left" size={30} color="white" />
        </TouchableOpacity>
      </ScrollView>

      {/* مودال المعلومات */}
      <Modal visible={showInfoModal} transparent animationType="fade" onRequestClose={() => setShowInfoModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowInfoModal(false)}>
          <View style={styles.infoModalContent}>
            <View style={styles.modalImageContainer}>
              {(modalType === 'patient' ? patient.profileImage : caregiver.profileImage) ? (
                <Image source={{ uri: modalType === 'patient' ? patient.profileImage : caregiver.profileImage }} style={styles.infoModalImage} />
              ) : (
                <View style={[styles.infoModalImage, styles.infoModalImagePlaceholder, { backgroundColor: modalType === 'patient' ? COLORS.primary : COLORS.secondary }]}>
                  <MaterialCommunityIcons name={modalType === 'patient' ? "account" : "account-heart"} size={60} color="white" />
                </View>
              )}
            </View>
            <Text style={styles.infoModalName}>{modalType === 'patient' ? patient.name : caregiver.name}</Text>
            <Text style={styles.infoModalSub}>
              {modalType === 'patient' ? `العمر: ${patient.age || 'غير محدد'}` : `العلاقة: ${caregiver.relationship || 'مقدم الرعاية'}`}
            </Text>
            {modalType === 'patient' && patient.likes && (
              <Text style={styles.infoModalDetail}>يحب: {patient.likes}</Text>
            )}
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.primary }]} onPress={() => setShowInfoModal(false)}>
              <Text style={styles.modalBtnText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* مودال التنقل السري */}
      <Modal visible={showSwitchModal} transparent animationType="fade" onRequestClose={() => setShowSwitchModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSwitchModal(false)}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="shield-account-outline" size={50} color={COLORS.primary} />
            <Text style={styles.modalTitle}>تأكيد الهوية</Text>
            <Text style={styles.modalSubtitle}>هل أنت مقدم الرعاية وتود العودة للوحة التحكم؟</Text>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.primary }]} onPress={handleSwitchToCaregiver}>
              <Text style={styles.modalBtnText}>نعم، عودة للوحة التحكم</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowSwitchModal(false)}>
              <Text style={[styles.modalBtnText, { color: COLORS.textMuted }]}>إلغاء</Text>
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
  secretArea: { position: 'absolute', top: 0, left: 0, right: 0, height: 60, zIndex: 10 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  appNameContainer: { flexDirection: 'row-reverse', alignItems: 'center', marginLeft: 10 },
  appNamePart1: { fontSize: 20, fontWeight: 'bold', marginRight: 4 },
  appNamePart2: { fontSize: 20, fontWeight: 'bold' },
  logo: { width: 35, height: 35 },
  realityHeader: { paddingVertical: 15, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  dateText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  timeText: { color: 'white', fontSize: 14, marginTop: 4 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  welcomeSection: { alignItems: 'center', marginBottom: 30 },
  greeting: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  subGreeting: { fontSize: 18, textAlign: 'center', marginTop: 8 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  box: {
    backgroundColor: 'white',
    width: (width - 60) / 2,
    padding: 20,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderBottomWidth: 5,
  },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  boxTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  boxSubtitle: { fontSize: 12, textAlign: 'center', marginTop: 5 },
  aiCard: {
    marginTop: 10,
    padding: 25,
    borderRadius: 30,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.secondary,
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  aiIconContainer: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  aiTextContainer: { flex: 1, alignItems: 'flex-end' },
  aiTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  aiSubtitle: { color: 'white', fontSize: 14, opacity: 0.9, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', width: '85%', padding: 30, borderRadius: 30, alignItems: 'center' },
  infoModalContent: { backgroundColor: 'white', width: '80%', padding: 25, borderRadius: 25, alignItems: 'center' },
  infoModalImage: { width: 120, height: 120, borderRadius: 60, marginBottom: 15 },
  infoModalImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  infoModalName: { fontSize: 22, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 5 },
  infoModalSub: { fontSize: 16, color: COLORS.textMuted, marginBottom: 10 },
  infoModalDetail: { fontSize: 14, color: COLORS.textDark, textAlign: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 15, color: COLORS.textDark },
  modalSubtitle: { fontSize: 16, color: COLORS.textMuted, textAlign: 'center', marginVertical: 15, lineHeight: 24 },
  modalBtn: { width: '100%', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  modalBtnText: { fontSize: 16, fontWeight: 'bold', color: 'white' },
});
