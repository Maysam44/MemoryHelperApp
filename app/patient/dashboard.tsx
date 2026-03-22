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
  const { scheduleMotivationMessages } = useNotifications(); 
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
  const [showProfileInfo, setShowProfileInfo] = useState(false);

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
    
    // جدولة الرسائل التحفيزية "مرة واحدة فقط" عند فتح لوحة التحكم
    // الدالة داخل الهوك تتحقق أصلاً إذا كانت مجدولة مسبقاً
    scheduleMotivationMessages();

    return () => clearInterval(timer);
  }, []);

  const handleProfilePress = () => {
    setShowProfileInfo(true);
  };

  const handleLongPress = () => {
    Alert.alert(
      'تأكيد الانتقال',
      'هل أنت مقدم الرعاية وتود الانتقال إلى لوحة التحكم؟',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'نعم، انتقل',
          onPress: () => router.replace('/caregiver/dashboard'),
        },
      ]
    );
  };

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
          onPress={handleProfilePress}
          onLongPress={handleLongPress} 
          style={styles.profileBtn}
          delayLongPress={2000} 
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

      {/* Profile Info Modal */}
      <Modal visible={showProfileInfo} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>بياناتي الشخصية</Text>
              <TouchableOpacity onPress={() => setShowProfileInfo(false)}>
                <MaterialCommunityIcons name="close" size={28} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.infoAvatarContainer}>
                {patient?.profileImage ? (
                  <Image source={{ uri: patient.profileImage }} style={styles.infoAvatar} />
                ) : (
                  <View style={[styles.infoAvatar, { backgroundColor: COLORS.primary + '10' }]}>
                    <MaterialCommunityIcons name="account" size={60} color={COLORS.primary} />
                  </View>
                )}
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>الاسم:</Text>
                <Text style={styles.infoValue}>{patient?.name}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>العمر:</Text>
                <Text style={styles.infoValue}>{patient?.age} سنة</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>الوظيفة:</Text>
                <Text style={styles.infoValue}>{patient?.job || 'غير محدد'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>الأشياء التي أحبها:</Text>
                <Text style={styles.infoValue}>{patient?.likes || 'غير محدد'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>معلومات إضافية:</Text>
                <Text style={styles.infoValue}>{patient?.additionalInfo || 'لا يوجد'}</Text>
              </View>

              <View style={styles.switchTip}>
                <MaterialCommunityIcons name="information" size={20} color={COLORS.primary} />
                <Text style={styles.tipText}>للعودة لصفحة مقدم الرعاية، اضغط مطولاً على صورتك لمدة ثانيتين.</Text>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.closeBtn, { backgroundColor: COLORS.primary }]} 
              onPress={() => setShowProfileInfo(false)}
            >
              <Text style={styles.closeBtnText}>رجوع</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  modalContent: { backgroundColor: 'white', width: '90%', maxHeight: '80%', padding: 25, borderRadius: 30 },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textDark },
  infoAvatarContainer: { alignItems: 'center', marginBottom: 20 },
  infoAvatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primary + '20' },
  infoRow: { marginBottom: 15, alignItems: 'flex-end' },
  infoLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 },
  infoValue: { fontSize: 18, color: COLORS.textDark, textAlign: 'right' },
  switchTip: { flexDirection: 'row-reverse', backgroundColor: COLORS.primary + '10', padding: 12, borderRadius: 12, marginTop: 10, alignItems: 'center' },
  tipText: { flex: 1, marginRight: 8, fontSize: 14, color: COLORS.primary, textAlign: 'right' },
  closeBtn: { marginTop: 20, padding: 15, borderRadius: 15, alignItems: 'center' },
  closeBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
