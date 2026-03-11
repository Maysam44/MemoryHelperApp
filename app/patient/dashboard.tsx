import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';

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
        headerShown: false, // Hide header for patient dashboard for simplicity
      }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topBar}>
          <View style={styles.dateTimeContainer}>
            <Text style={[styles.dateText, { color: dynamicColors.textMuted }]}>{currentDate}</Text>
            <Text style={[styles.timeText, { color: dynamicColors.textMuted }]}>{currentTime}</Text>
          </View>
        </View>

        <View style={styles.appHeaderContainer}>
          <View style={styles.logoAndNameWrapper}>
            <Image source={require('../../app/images/logo.png')} style={styles.logo} />
            <View style={styles.appNameContainer}>
              <Text style={[styles.appNamePart1, { color: COLORS.secondary }]}>رفيق</Text>
              <Text style={[styles.appNamePart2, { color: COLORS.primary }]}>الذاكرة</Text>
            </View>
          </View>
        </View>

        <View style={styles.header}>
          <Text style={[styles.greeting, { color: dynamicColors.textDark }]}>مرحباً بك، {patientData?.name || 'المريض'}!</Text>
          {caregiverData?.profileImage ? (
            <Image source={{ uri: caregiverData.profileImage }} style={styles.caregiverImage} />
          ) : (
            <View style={[styles.caregiverImagePlaceholder, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border }]}>
              <MaterialCommunityIcons name="account-circle-outline" size={50} color={dynamicColors.textMuted} />
            </View>
          )}
          <Text style={[styles.caregiverName, { color: dynamicColors.textMuted }]}>مقدم الرعاية: {caregiverData?.name || 'غير معروف'}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border }]}>
          <Text style={[styles.cardTitle, { color: dynamicColors.textDark }]}>معلوماتك</Text>
          <Text style={[styles.cardText, { color: dynamicColors.textMuted }]}>العمر: {patientData?.age || 'غير محدد'}</Text>
          <Text style={[styles.cardText, { color: dynamicColors.textMuted }]}>المرحلة: {patientData?.stage === 'early' ? 'مبكرة' : patientData?.stage === 'moderate' ? 'متوسطة' : 'متأخرة'}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.memoryBankButton, { backgroundColor: dynamicColors.primary }]} 
          onPress={() => router.push('/patient/memory-bank')}
        >
          <MaterialCommunityIcons name="brain" size={30} color={dynamicColors.textLight} />
          <Text style={[styles.memoryBankButtonText, { color: dynamicColors.textLight }]}>بنك الذكريات</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.memoryBankButton, { backgroundColor: dynamicColors.secondary }]} 
          onPress={() => router.push('/patient/ai-chat')}
        >
          <MaterialCommunityIcons name="chat-outline" size={30} color={dynamicColors.textLight} />
          <Text style={[styles.memoryBankButtonText, { color: dynamicColors.textLight }]}>الدردشة مع المساعد</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: SIZES.padding, alignItems: 'center' },
  topBar: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: SIZES.padding,
  },
  dateTimeContainer: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: SIZES.caption,
    fontWeight: FONTS.medium,
  },
  timeText: {
    fontSize: SIZES.body,
    fontWeight: FONTS.bold,
    marginTop: 4,
  },
  appHeaderContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: SIZES.padding * 2,
  },
  logoAndNameWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 50,
    height: 50,
    marginLeft: SIZES.base,
  },
  appNameContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  appNamePart1: {
    fontSize: SIZES.h2,
    fontWeight: FONTS.bold,
    marginRight: SIZES.base / 2,
  },
  appNamePart2: {
    fontSize: SIZES.h2,
    fontWeight: FONTS.bold,
  },
  header: {
    alignItems: 'center',
    marginBottom: SIZES.padding * 2,
    width: '100%',
  },
  greeting: {
    fontSize: SIZES.h1,
    fontWeight: FONTS.bold,
    marginBottom: SIZES.base,
    textAlign: 'center',
  },
  caregiverImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: SIZES.base,
  },
  caregiverImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.base,
    borderWidth: 1,
  },
  caregiverName: {
    fontSize: SIZES.body,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    marginBottom: SIZES.padding * 2,
    alignItems: 'flex-end',
  },
  cardTitle: {
    fontSize: SIZES.h2,
    fontWeight: FONTS.bold,
    marginBottom: SIZES.base,
  },
  cardText: {
    fontSize: SIZES.body,
    marginBottom: SIZES.base / 2,
  },
  memoryBankButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    width: '100%',
  },
  memoryBankButtonText: {
    fontSize: SIZES.h3,
    fontWeight: FONTS.bold,
    marginLeft: SIZES.base,
  },
});