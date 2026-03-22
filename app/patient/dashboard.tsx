import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView, TouchableOpacity, Dimensions, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';
import { useNotifications } from '../hooks/use-notifications';

const { width } = Dimensions.get('window');

const getArabicDate = () => {
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Intl.DateTimeFormat('ar-EG', options).format(new Date());
};

export default function PatientDashboard() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const { scheduleMedicineReminder } = useNotifications(); // لتفعيل الهوك وجدولة الرسائل التحفيزية
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
  const [showSwitchModal, setShowSwitchModal] = useState(false);

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

  const PatientBox = ({ title, icon, color, onPress, subtitle }: any) => (
    <TouchableOpacity 
      style={[styles.box, { borderBottomColor: color }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name={icon} size={45} color={color} />
      </View>
      <Text style={[styles.boxTitle, { color: dynamicColors.textDark }]}>{title}</Text>
      <Text style={[styles.boxSubtitle, { color: dynamicColors.textMuted }]}>{subtitle}</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: dynamicColors.backgroundLight }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const patient = userData?.patient;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8F9FD' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.topHeader}>
        <TouchableOpacity 
          onLongPress={() => router.replace('/caregiver/dashboard')} 
          style={styles.profileBtn}
          delayLongPress={2000} // ضغطة مطولة ثانيتين للعودة مباشرة
        >
          {patient?.profileImage ? (
            <Image source={{ uri: patient.profileImage }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, { backgroundColor: COLORS.primary + '20' }]}>
              <MaterialCommunityIcons name="account" size={30} color={COLORS.primary} />
            </View>
          )}
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.appName}>رفيق الذاكرة</Text>
        </View>
        
        <TouchableOpacity onPress={() => Alert.alert('مرحباً', 'هذا تطبيق رفيقك الذكي لمساعدتك دائماً.')}>
          <MaterialCommunityIcons name="help-circle-outline" size={32} color={COLORS.primary} />
        </TouchableOpacity>
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
        </View>

        <View style={styles.grid}>
          <PatientBox title="بنك الذكريات" subtitle="شاهد صور أحبائك" icon="brain" color="#6C5CE7" onPress={() => router.push('/patient/memory-bank')} />
          <PatientBox title="رسائل أحبابي" subtitle="استمع لأصواتهم" icon="microphone" color="#FF7675" onPress={() => router.push('/patient/voice-memories')} />
          <PatientBox title="أدويتي" subtitle="مواعيد دوائك" icon="pill" color="#55E6C1" onPress={() => router.push('/patient/medicine-reminders')} />
          <PatientBox title="أماكني" subtitle="أين أنت الآن؟" icon="map-marker-radius" color="#F9CA24" onPress={() => router.push('/patient/safe-zones')} />
          <PatientBox title="مفكرتي" subtitle="سجل ملاحظاتك" icon="notebook-edit" color="#A29BFE" onPress={() => router.push('/patient/my-notes')} />
          <PatientBox title="رفيقك الذكي" subtitle="تحدث معي دائماً" icon="chat-processing" color="#00CEC9" onPress={() => router.push('/patient/ai-chat')} />
        </View>
      </ScrollView>

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
  topHeader: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: 'white', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#eee' },
  profileBtn: { width: 55, height: 55, borderRadius: 27.5, overflow: 'hidden' },
  headerAvatar: { width: '100%', height: '100%', borderWidth: 2, borderColor: COLORS.primary + '40', borderRadius: 27.5 },
  headerCenter: { alignItems: 'center' },
  appName: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  realityHeader: { paddingVertical: 15, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  dateText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  timeText: { color: 'white', fontSize: 16, marginTop: 4 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  welcomeSection: { alignItems: 'center', marginBottom: 25 },
  greeting: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  box: { backgroundColor: 'white', width: (width - 60) / 2, padding: 25, borderRadius: 30, alignItems: 'center', marginBottom: 20, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, borderBottomWidth: 6 },
  iconCircle: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  boxTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  boxSubtitle: { fontSize: 13, textAlign: 'center', marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', width: '85%', padding: 30, borderRadius: 30, alignItems: 'center' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 15, color: COLORS.textDark },
  modalSubtitle: { fontSize: 18, color: COLORS.textMuted, textAlign: 'center', marginVertical: 20, lineHeight: 26 },
  modalBtn: { width: '100%', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  modalBtnText: { fontSize: 18, fontWeight: 'bold', color: 'white' },
});
