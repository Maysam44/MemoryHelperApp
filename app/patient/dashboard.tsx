import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function PatientDashboard() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const [patientData, setPatientData] = useState<any>(null);
  const [caregiverData, setCaregiverData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const dateOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
      const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
      setCurrentDate(now.toLocaleDateString('ar-SA', dateOptions));
      setCurrentTime(now.toLocaleTimeString('ar-SA', timeOptions));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchPatientAndCaregiverData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setPatientData(data.patient);
            setCaregiverData({ name: data.name, profileImage: data.profileImage });
          }
        }
      } catch (error) {
        console.error("Error fetching patient/caregiver data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPatientAndCaregiverData();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: dynamicColors.backgroundLight }]}>
        <ActivityIndicator size="large" color={dynamicColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
      <Stack.Screen options={{
        headerShown: false,
      }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Section with Logo and App Name */}
        <View style={styles.headerSection}>
          <View style={styles.logoAndNameWrapper}>
            <Image source={require('../../app/images/logo.png')} style={styles.logo} />
            <View style={styles.appNameContainer}>
              <Text style={[styles.appNamePart1, { color: COLORS.secondary }]}>رفيق</Text>
              <Text style={[styles.appNamePart2, { color: COLORS.primary }]}>الذاكرة</Text>
            </View>
          </View>

          {/* Date and Time Below Logo */}
          <View style={styles.dateTimeContainer}>
            <Text style={[styles.timeText, { color: dynamicColors.textMuted }]}>{currentTime}</Text>
            <Text style={[styles.dateText, { color: dynamicColors.textMuted }]}>{currentDate}</Text>
          </View>
        </View>

        {/* Caregiver Info Card */}
        <View style={[styles.caregiverCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border }]}>
          <View style={styles.caregiverContent}>
            <View style={styles.caregiverTextWrapper}>
              <Text style={[styles.caregiverLabel, { color: dynamicColors.textMuted }]}>مقدم الرعاية</Text>
              <Text style={[styles.caregiverName, { color: dynamicColors.textDark }]}>{caregiverData?.name || 'غير معروف'}</Text>
            </View>
            {caregiverData?.profileImage ? (
              <Image source={{ uri: caregiverData.profileImage }} style={styles.caregiverImage} />
            ) : (
              <View style={[styles.caregiverImagePlaceholder, { backgroundColor: dynamicColors.backgroundLight }]}>
                <MaterialCommunityIcons name="account-circle-outline" size={40} color={dynamicColors.textMuted} />
              </View>
            )}
          </View>
        </View>

        {/* Patient Info Card */}
        <View style={[styles.infoCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border }]}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="cake-variant" size={24} color={dynamicColors.primary} />
              <Text style={[styles.infoLabel, { color: dynamicColors.textMuted }]}>العمر</Text>
              <Text style={[styles.infoValue, { color: dynamicColors.textDark }]}>{patientData?.age || 'غير محدد'}</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="chart-line" size={24} color={dynamicColors.secondary} />
              <Text style={[styles.infoLabel, { color: dynamicColors.textMuted }]}>المرحلة</Text>
              <Text style={[styles.infoValue, { color: dynamicColors.textDark }]}>
                {patientData?.stage === 'early' ? 'مبكرة' : patientData?.stage === 'moderate' ? 'متوسطة' : 'متأخرة'}
              </Text>
            </View>
          </View>
        </View>

        {/* Greeting */}
        <Text style={[styles.greeting, { color: dynamicColors.textDark }]}>
          مرحباً بك، {patientData?.name || 'المريض'}! 👋
        </Text>

        {/* Features Grid */}
        <View style={styles.featuresGrid}>
          <TouchableOpacity 
            style={[styles.featureButton, { backgroundColor: dynamicColors.primary }]} 
            onPress={() => router.push('/patient/memory-bank')}
            activeOpacity={0.8}
          >
            <View style={styles.featureIconWrapper}>
              <MaterialCommunityIcons name="brain" size={32} color={dynamicColors.textLight} />
            </View>
            <Text style={[styles.featureTitle, { color: dynamicColors.textLight }]}>بنك الذكريات</Text>
            <Text style={[styles.featureSubtitle, { color: dynamicColors.textLight }]}>استرجع ذكرياتك</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.featureButton, { backgroundColor: dynamicColors.secondary }]} 
            onPress={() => router.push('/patient/ai-chat')}
            activeOpacity={0.8}
          >
            <View style={styles.featureIconWrapper}>
              <MaterialCommunityIcons name="chat-outline" size={32} color={dynamicColors.textLight} />
            </View>
            <Text style={[styles.featureTitle, { color: dynamicColors.textLight }]}>المساعد الذكي</Text>
            <Text style={[styles.featureSubtitle, { color: dynamicColors.textLight }]}>تحدث معي</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { 
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.padding,
    paddingBottom: SIZES.padding * 3,
    alignItems: 'center',
  },
  
  /* Header Section */
  headerSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: SIZES.padding * 2.5,
  },
  logoAndNameWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.padding,
  },
  logo: {
    width: 60,
    height: 60,
    marginLeft: SIZES.base,
  },
  appNameContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  appNamePart1: {
    fontSize: SIZES.h1,
    fontWeight: FONTS.bold,
    marginRight: SIZES.base,
  },
  appNamePart2: {
    fontSize: SIZES.h1,
    fontWeight: FONTS.bold,
  },
  dateTimeContainer: {
    alignItems: 'center',
  },
  dateText: {
    fontSize: SIZES.caption,
    fontWeight: FONTS.medium,
    marginTop: SIZES.base / 2,
  },
  timeText: {
    fontSize: SIZES.h3,
    fontWeight: FONTS.bold,
  },

  /* Caregiver Card */
  caregiverCard: {
    width: '100%',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    marginBottom: SIZES.padding * 1.5,
  },
  caregiverContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caregiverTextWrapper: {
    flex: 1,
    marginRight: SIZES.padding,
  },
  caregiverLabel: {
    fontSize: SIZES.caption,
    fontWeight: FONTS.medium,
    marginBottom: SIZES.base / 2,
  },
  caregiverName: {
    fontSize: SIZES.h3,
    fontWeight: FONTS.bold,
  },
  caregiverImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  caregiverImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Info Card */
  infoCard: {
    width: '100%',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    marginBottom: SIZES.padding * 2,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: SIZES.caption,
    fontWeight: FONTS.medium,
    marginTop: SIZES.base / 2,
  },
  infoValue: {
    fontSize: SIZES.h3,
    fontWeight: FONTS.bold,
    marginTop: SIZES.base / 2,
  },

  /* Greeting */
  greeting: {
    fontSize: SIZES.h2,
    fontWeight: FONTS.bold,
    marginBottom: SIZES.padding * 2,
    textAlign: 'center',
  },

  /* Features Grid */
  featuresGrid: {
    width: '100%',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: SIZES.padding,
  },
  featureButton: {
    flex: 1,
    paddingVertical: SIZES.padding * 1.5,
    paddingHorizontal: SIZES.padding,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  featureIconWrapper: {
    marginBottom: SIZES.base,
  },
  featureTitle: {
    fontSize: SIZES.h3,
    fontWeight: FONTS.bold,
    marginBottom: SIZES.base / 2,
  },
  featureSubtitle: {
    fontSize: SIZES.caption,
    fontWeight: FONTS.medium,
    opacity: 0.9,
  },
});
