import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ScrollView, Image, Alert, Modal } from 'react-native';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { auth, db } from '../../firebaseConfig';

export default function CaregiverDashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCaregiverInfo, setShowCaregiverInfo] = useState(false);
  
  // للنقر المزدوج على الصورة
  const lastTapCaregiver = useRef(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    getDoc(userDocRef).then(docSnap => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  const handleCaregiverAvatarPress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapCaregiver.current < DOUBLE_TAP_DELAY) {
      // نقرة مزدوجة - الانتقال للمريض
      Alert.alert(
        "الانتقال لعالم المريض",
        "هل تود الانتقال لواجهة المريض الآن؟",
        [
          { text: "إلغاء", style: "cancel" },
          { text: "نعم، انتقال", onPress: () => router.replace('/patient/dashboard') }
        ]
      );
    } else {
      // نقرة واحدة - عرض المعلومات
      setShowCaregiverInfo(true);
    }
    lastTapCaregiver.current = now;
  };

  const AdminBox = ({ title, icon, color, onPress, subtitle }: any) => (
    <TouchableOpacity 
      style={[styles.box, { borderRightColor: color }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name={icon} size={32} color={color} />
      </View>
      <View style={styles.boxTextContainer}>
        <Text style={styles.boxTitle}>{title}</Text>
        <Text style={styles.boxSubtitle}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  const InfoModal = ({ visible, onClose, title, data }: any) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={COLORS.textDark} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <View style={styles.modalImageContainer}>
              {data?.profileImage ? (
                <Image source={{ uri: data.profileImage }} style={styles.modalImage} />
              ) : (
                <View style={[styles.modalImage, styles.modalImagePlaceholder]}>
                  <MaterialCommunityIcons name="account" size={60} color={COLORS.textMuted} />
                </View>
              )}
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>الاسم:</Text>
              <Text style={styles.infoValue}>{data?.name || 'غير محدد'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>العلاقة:</Text>
              <Text style={styles.infoValue}>{data?.relationship || 'غير محدد'}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseBtnText}>إغلاق</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const caregiver = userData?.caregiver || { name: userData?.name, relationship: userData?.relationship, profileImage: userData?.profileImage };
  const patient = userData?.patient || { name: userData?.patientName, age: userData?.patientAge, stage: userData?.patientStage };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: 'لوحة التحكم', 
        headerTitleAlign: 'center',
        headerRight: () => (
          <TouchableOpacity onPress={handleCaregiverAvatarPress} style={styles.headerAvatar}>
            {caregiver.profileImage ? (
              <Image source={{ uri: caregiver.profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                <MaterialCommunityIcons name="account" size={20} color="white" />
              </View>
            )}
          </TouchableOpacity>
        ),
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.push('/caregiver/settings')} style={{ marginLeft: 15 }}>
            <MaterialCommunityIcons name="cog-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        )
      }} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.welcomeTitle}>أهلاً بك، {caregiver.name || 'مقدم الرعاية'}</Text>
          <Text style={styles.welcomeSubtitle}>ماذا تود أن تفعل اليوم لمساعدة {patient.name || 'مريضك'}؟</Text>
        </View>

        <View style={styles.grid}>
          <AdminBox 
            title="بنك الذاكرة" 
            subtitle="إدارة صور وأسماء الأشخاص المهمين"
            icon="brain" 
            color="#6C5CE7" 
            onPress={() => router.push('/caregiver/add-memory')} 
          />
          
          <AdminBox 
            title="تسجيل رسالة" 
            subtitle="أرسل رسالة صوتية حنونة للمريض"
            icon="microphone-plus" 
            color="#FF7675" 
            onPress={() => router.push('/caregiver/add-voice-note')} 
          />
          
          <AdminBox 
            title="الأدوية" 
            subtitle="تنظيم مواعيد وجرعات الدواء"
            icon="pill" 
            color="#55E6C1" 
            onPress={() => router.push('/caregiver/add-medicine')} 
          />

          <AdminBox 
            title="تحديد المنطقة" 
            subtitle="تحديد النطاق الجغرافي الآمن"
            icon="map-marker-radius" 
            color="#F9CA24" 
            onPress={() => router.push('/caregiver/add-safe-zone')} 
          />
        </View>

        <View style={styles.noteContainer}>
          <View style={styles.noteCard}>
            <MaterialCommunityIcons name="information-outline" size={24} color={COLORS.primary} />
            <View style={styles.noteTextContent}>
              <Text style={styles.noteTitle}>تلميح سريع</Text>
              <Text style={styles.noteText}>اضغط مرة واحدة على صورتك بالأعلى لعرض معلوماتك. اضغط مرتين للانتقال السريع لعالم المريض.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.switchContainer}>
        <TouchableOpacity 
          style={styles.switchButton} 
          onPress={() => router.replace('/patient/dashboard')}
          activeOpacity={0.9}
        >
          <View style={styles.switchIconBg}>
            <MaterialCommunityIcons name="heart-pulse" size={28} color="white" />
          </View>
          <Text style={styles.switchText}>انتقل إلى عالم المريض</Text>
          <MaterialCommunityIcons name="arrow-left" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <InfoModal 
        visible={showCaregiverInfo} 
        onClose={() => setShowCaregiverInfo(false)} 
        title="معلومات مقدم الرعاية" 
        data={caregiver}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: SIZES.padding, paddingBottom: 120 },
  header: { marginBottom: 30, alignItems: 'flex-end' },
  welcomeTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textDark },
  welcomeSubtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 5 },
  grid: { gap: 15 },
  box: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderRightWidth: 5,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  boxTextContainer: { flex: 1, alignItems: 'flex-end' },
  boxTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark },
  boxSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  headerAvatar: { marginRight: 15 },
  avatarImage: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: COLORS.primary },
  avatarPlaceholder: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  noteContainer: { marginTop: 30 },
  noteCard: {
    backgroundColor: COLORS.primary + '10',
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  noteTextContent: { flex: 1, marginRight: 15, alignItems: 'flex-end' },
  noteTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 5 },
  noteText: { fontSize: 14, color: COLORS.textDark, textAlign: 'right', lineHeight: 22 },
  switchContainer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  switchButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 30,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  switchIconBg: {
    backgroundColor: COLORS.primary,
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, flex: 1, textAlign: 'right', marginRight: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', width: '90%', borderRadius: 25, padding: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark },
  modalBody: { alignItems: 'center', marginBottom: 20 },
  modalImageContainer: { marginBottom: 20 },
  modalImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: COLORS.primary },
  modalImagePlaceholder: { backgroundColor: COLORS.backgroundLight, justifyContent: 'center', alignItems: 'center' },
  infoRow: { flexDirection: 'row-reverse', width: '100%', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 8 },
  infoLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, width: 80, textAlign: 'right' },
  infoValue: { fontSize: 16, color: COLORS.textDark, flex: 1, textAlign: 'right' },
  modalCloseBtn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 15, alignItems: 'center' },
  modalCloseBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
