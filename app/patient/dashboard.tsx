import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView, TouchableOpacity, Dimensions, Alert, Modal } from 'react-native';
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
  const [patientData, setPatientData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
    }, 60000);

    const fetchPatientData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setPatientData(userDocSnap.data().patient);
          }
        }
      } catch (error) {
        console.error("Error fetching patient data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPatientData();
    return () => clearInterval(timer);
  }, []);

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.topHeader}>
        <View style={styles.headerContent}>
          <View style={styles.appNameContainer}>
            <Text style={[styles.appNamePart1, { color: COLORS.secondary }]}>رفيق</Text>
            <Text style={[styles.appNamePart2, { color: COLORS.primary }]}>الذاكرة</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setShowSwitchModal(true)}
            activeOpacity={0.8} 
            style={styles.logoContainer}
          >
            <Image 
              source={require('../images/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
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
            مرحباً بك، {patientData?.name || 'صديقي'}!
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

      {/* مودال التنقل الإبداعي - حماية بلمسة مطولة أو رمز */}
      <Modal
        visible={showSwitchModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSwitchModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowSwitchModal(false)}
        >
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="lock-outline" size={50} color={COLORS.primary} />
            <Text style={styles.modalTitle}>منطقة خاصة</Text>
            <Text style={styles.modalSubtitle}>هل أنت مقدم الرعاية وتود العودة للوحة التحكم؟</Text>
            <TouchableOpacity 
              style={[styles.modalBtn, { backgroundColor: COLORS.primary }]}
              onPress={handleSwitchToCaregiver}
            >
              <Text style={styles.modalBtnText}>نعم، عودة للوحة التحكم</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modalBtn}
              onPress={() => setShowSwitchModal(false)}
            >
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
  topHeader: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'white' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appNameContainer: { flexDirection: 'row-reverse', alignItems: 'center' },
  appNamePart1: { fontSize: 24, fontWeight: 'bold', marginRight: 4 },
  appNamePart2: { fontSize: 24, fontWeight: 'bold' },
  logoContainer: { width: 50, height: 50 },
  logo: { width: '100%', height: '100%' },
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
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 15, color: COLORS.textDark },
  modalSubtitle: { fontSize: 16, color: COLORS.textMuted, textAlign: 'center', marginVertical: 15, lineHeight: 24 },
  modalBtn: { width: '100%', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  modalBtnText: { fontSize: 16, fontWeight: 'bold', color: 'white' },
});
