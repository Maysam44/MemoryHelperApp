import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { auth, db } from '../../firebaseConfig';

export default function CaregiverDashboard() {
  const router = useRouter();
  const [caregiverName, setCaregiverName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    getDoc(userDocRef).then(docSnap => {
      if (docSnap.exists()) {
        setCaregiverName(docSnap.data().caregiver.name);
      }
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

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
          <TouchableOpacity onPress={() => router.push('/caregiver/settings')} style={{ marginRight: 15 }}>
            <MaterialCommunityIcons name="cog-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        )
      }} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.welcomeTitle}>أهلاً بك، {caregiverName || 'مقدم الرعاية'}</Text>
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

        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>نصيحة اليوم</Text>
          <View style={styles.tipCard}>
            <MaterialCommunityIcons name="lightbulb-on" size={24} color="#F9CA24" />
            <Text style={styles.tipText}>التواصل الصوتي المستمر يشعر المريض بالأمان ويقلل من حالات القلق والتوتر.</Text>
          </View>
        </View>
      </ScrollView>

      {/* الطريقة الإبداعية للتنقل: سحب للأعلى أو زر "تبديل العالم" */}
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
  statsContainer: { marginTop: 30 },
  statsTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 15, textAlign: 'right' },
  tipCard: {
    backgroundColor: '#FFFBEB',
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  tipText: { flex: 1, marginRight: 15, fontSize: 14, color: '#92400E', textAlign: 'right', lineHeight: 22 },
  switchContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
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
});
