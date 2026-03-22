import React, { useEffect, useState } from 'react';
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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
    }, 60000);

    const fetchData = async () => {
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
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    return () => clearInterval(timer);
  }, []);

  const handleProfilePress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 400; // تأخير أطول قليلاً ليناسب كبار السن
    if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
      // Double tap detected - Secret Switch Trigger
      setShowSwitchModal(true);
    } else {
      // Single tap - Show Patient Info
      setShowProfileModal(true);
    }
    setLastTap(now);
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

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: dynamicColors.backgroundLight }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 20, color: dynamicColors.textMuted }}>نجهز لك عالمك الجميل...</Text>
      </View>
    );
  }

  const patient = userData?.patient;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={handleProfilePress} style={styles.profileBtn}>
          {patient?.profileImage ? (
            <Image source={{ uri: patient.profileImage }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, { backgroundColor: COLORS.primary + '20' }]}>
              <MaterialCommunityIcons name="account" size={30} color={COLORS.primary} />
            </View>
          )}
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={styles.appNameContainer}>
            <Text style={[styles.appNamePart1, { color: COLORS.secondary }]}>رفيق</Text>
            <Text style={[styles.appNamePart2, { color: COLORS.primary }]}>الذاكرة</Text>
          </View>
          <Image 
            source={require('../images/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={{ width: 50 }} />
      </View>

      <View style={[styles.realityHeader, { backgroundColor: COLORS.primary }]}>
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
          <PatientBox title="بنك الذكريات" subtitle="شاهد صور أحبائك" icon="brain" color="#6C5CE7" onPress={() => router.push('/patient/memory-bank')} />
          <PatientBox title="رسائل أحبابي" subtitle="استمع لأصواتهم الحنونة" icon="microphone" color="#FF7675" onPress={() => router.push('/patient/voice-memories')} />
          <PatientBox title="أدويتي" subtitle="مواعيد دوائك المهمة" icon="pill" color="#55E6C1" onPress={() => router.push('/patient/medicine-reminders')} />
          <PatientBox title="أماكني الآمنة" subtitle="أين أنت الآن؟" icon="map-marker-radius" color="#F9CA24" onPress={() => router.push('/patient/safe-zones')} />
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

      {/* Patient Info Modal */}
      <Modal visible={showProfileModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowProfileModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalAvatarContainer}>
              {patient?.profileImage ? (
                <Image source={{ uri: patient.profileImage }} style={styles.modalAvatar} />
              ) : (
                <View style={[styles.modalAvatar, { backgroundColor: COLORS.primary + '10' }]}>
                  <MaterialCommunityIcons name="account" size={60} color={COLORS.primary} />
                </View>
              )}
            </View>
            <Text style={styles.modalName}>{patient?.name}</Text>
            <Text style={styles.modalSub}>{patient?.job || 'صديقنا العزيز'}</Text>
            
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoVal}>{patient?.age} سنة</Text>
                <Text style={styles.infoLab}>العمر:</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoVal}>{patient?.likes || 'المشي، القهوة'}</Text>
                <Text style={styles.infoLab}>أحب:</Text>
              </View>
              {patient?.additionalInfo && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoVal, { textAlign: 'right', flex: 1 }]}>{patient.additionalInfo}</Text>
                  <Text style={[styles.infoLab, { marginLeft: 10 }]}>ملاحظة:</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowProfileModal(false)}>
              <Text style={styles.closeBtnText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Secret Switch Modal */}
      <Modal visible={showSwitchModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSwitchModal(false)}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="shield-account-outline" size={50} color={COLORS.primary} />
            <Text style={styles.modalTitle}>تأكيد الهوية</Text>
            <Text style={styles.modalSubtitle}>هل أنت مقدم الرعاية وتود العودة للوحة التحكم؟</Text>
            <TouchableOpacity 
              style={[styles.modalBtn, { backgroundColor: COLORS.primary }]}
              onPress={() => { setShowSwitchModal(false); router.replace('/caregiver/dashboard'); }}
            >
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
  topHeader: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: 'white', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  profileBtn: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden' },
  headerAvatar: { width: '100%', height: '100%', borderWidth: 2, borderColor: COLORS.primary + '40', borderRadius: 25 },
  headerCenter: { flexDirection: 'row-reverse', alignItems: 'center' },
  appNameContainer: { flexDirection: 'row-reverse', alignItems: 'center', marginRight: 10 },
  appNamePart1: { fontSize: 22, fontWeight: 'bold', marginLeft: 4 },
  appNamePart2: { fontSize: 22, fontWeight: 'bold' },
  logo: { width: 45, height: 45 },
  realityHeader: { paddingVertical: 15, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  dateText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  timeText: { color: 'white', fontSize: 14, marginTop: 4 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  welcomeSection: { alignItems: 'center', marginBottom: 30 },
  greeting: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  subGreeting: { fontSize: 18, textAlign: 'center', marginTop: 8 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  box: { backgroundColor: 'white', width: (width - 60) / 2, padding: 20, borderRadius: 25, alignItems: 'center', marginBottom: 20, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, borderBottomWidth: 5 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  boxTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  boxSubtitle: { fontSize: 12, textAlign: 'center', marginTop: 5 },
  aiCard: { marginTop: 10, padding: 25, borderRadius: 30, flexDirection: 'row-reverse', alignItems: 'center', elevation: 8, shadowColor: COLORS.secondary, shadowOpacity: 0.3, shadowRadius: 15 },
  aiIconContainer: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  aiTextContainer: { flex: 1, alignItems: 'flex-end' },
  aiTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  aiSubtitle: { color: 'white', fontSize: 14, opacity: 0.9, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', width: '85%', padding: 30, borderRadius: 30, alignItems: 'center' },
  modalAvatarContainer: { marginTop: -70, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  modalAvatar: { width: 140, height: 140, borderRadius: 70, borderWidth: 5, borderColor: 'white', overflow: 'hidden' },
  modalName: { fontSize: 24, fontWeight: 'bold', marginTop: 15, color: COLORS.textDark },
  modalSub: { fontSize: 16, color: COLORS.textMuted, marginBottom: 20 },
  infoSection: { width: '100%', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 20 },
  infoRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 15 },
  infoLab: { fontSize: 16, color: COLORS.textMuted, fontWeight: 'bold' },
  infoVal: { fontSize: 16, color: COLORS.textDark, textAlign: 'right', flex: 1, marginRight: 10 },
  closeBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 40, borderRadius: 20, backgroundColor: '#f0f0f0' },
  closeBtnText: { color: COLORS.textDark, fontWeight: 'bold' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 15, color: COLORS.textDark },
  modalSubtitle: { fontSize: 16, color: COLORS.textMuted, textAlign: 'center', marginVertical: 15, lineHeight: 24 },
  modalBtn: { width: '100%', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  modalBtnText: { fontSize: 16, fontWeight: 'bold', color: 'white' },
});
