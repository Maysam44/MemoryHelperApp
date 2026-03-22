import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ScrollView, Image, Modal, Alert } from 'react-native';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { auth, db } from '../../firebaseConfig';

export default function CaregiverDashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [lastTap, setLastTap] = useState(0);

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

  const handleProfilePress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
      // Double tap detected - Switch to Patient
      router.replace('/patient/dashboard');
    } else {
      // Single tap - Show Profile Info
      setShowProfileModal(true);
    }
    setLastTap(now);
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

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: 'لوحة التحكم', 
        headerTitleAlign: 'center',
        headerRight: () => (
          <TouchableOpacity onPress={handleProfilePress} style={styles.profileHeaderBtn}>
            {userData?.caregiver?.profileImage ? (
              <Image source={{ uri: userData.caregiver.profileImage }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, { backgroundColor: COLORS.primary + '20' }]}>
                <MaterialCommunityIcons name="account" size={24} color={COLORS.primary} />
              </View>
            )}
          </TouchableOpacity>
        ),
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.push('/caregiver/settings')} style={{ marginLeft: 15 }}>
            <MaterialCommunityIcons name="cog-outline" size={24} color={COLORS.textMuted} />
          </TouchableOpacity>
        )
      }} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.welcomeTitle}>أهلاً بك، {userData?.caregiver?.name || 'مقدم الرعاية'}</Text>
          <Text style={styles.welcomeSubtitle}>ماذا تود أن تفعل اليوم لمساعدة مريضك؟</Text>
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

        <View style={styles.noteCard}>
          <View style={styles.noteHeader}>
            <MaterialCommunityIcons name="information-outline" size={20} color={COLORS.secondary} />
            <Text style={styles.noteTitle}>تلميحة ذكية</Text>
          </View>
          <Text style={styles.noteText}>
            للعودة من وضع المريض، اضغط مرتين متتاليتين على صورة المريض في الزاوية العلوية.
          </Text>
        </View>
      </ScrollView>

      {/* Profile Info Modal */}
      <Modal visible={showProfileModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowProfileModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalAvatarContainer}>
              {userData?.caregiver?.profileImage ? (
                <Image source={{ uri: userData.caregiver.profileImage }} style={styles.modalAvatar} />
              ) : (
                <View style={[styles.modalAvatar, { backgroundColor: COLORS.primary + '10' }]}>
                  <MaterialCommunityIcons name="account" size={60} color={COLORS.primary} />
                </View>
              )}
            </View>
            <Text style={styles.modalName}>{userData?.caregiver?.name}</Text>
            <Text style={styles.modalSub}>{userData?.caregiver?.relationship}</Text>
            
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoVal}>{userData?.patient?.name}</Text>
                <Text style={styles.infoLab}>المريض:</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoVal}>{userData?.patient?.age} سنة</Text>
                <Text style={styles.infoLab}>العمر:</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowProfileModal(false)}>
              <Text style={styles.closeBtnText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileHeaderBtn: { marginRight: 15 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: COLORS.primary + '40', justifyContent: 'center', alignItems: 'center' },
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
  iconContainer: { width: 60, height: 60, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  boxTextContainer: { flex: 1, alignItems: 'flex-end' },
  boxTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark },
  boxSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  noteCard: { marginTop: 30, backgroundColor: COLORS.secondary + '10', padding: 20, borderRadius: 20, borderLeftWidth: 4, borderLeftColor: COLORS.secondary },
  noteHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 8 },
  noteTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.secondary, marginRight: 8 },
  noteText: { fontSize: 14, color: COLORS.textDark, textAlign: 'right', lineHeight: 22 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', width: '85%', borderRadius: 30, padding: 25, alignItems: 'center' },
  modalAvatarContainer: { marginTop: -60, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  modalAvatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: 'white', overflow: 'hidden' },
  modalName: { fontSize: 22, fontWeight: 'bold', color: COLORS.textDark, marginTop: 15 },
  modalSub: { fontSize: 14, color: COLORS.textMuted, marginBottom: 20 },
  infoSection: { width: '100%', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoLab: { fontSize: 16, color: COLORS.textMuted },
  infoVal: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  closeBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 40, borderRadius: 20, backgroundColor: '#f0f0f0' },
  closeBtnText: { color: COLORS.textDark, fontWeight: 'bold' },
  switchContainer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  switchButton: { backgroundColor: 'white', padding: 15, borderRadius: 30, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', elevation: 10, shadowColor: COLORS.primary, shadowOpacity: 0.2, shadowRadius: 15, borderWidth: 1, borderColor: COLORS.primary + '20' },
  switchIconBg: { backgroundColor: COLORS.primary, width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' },
  switchText: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, flex: 1, textAlign: 'right', marginRight: 15 },
});
