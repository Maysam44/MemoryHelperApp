import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';

const { width } = Dimensions.get('window');

// Function to get current date in Arabic
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

  useEffect(() => {
    // Update time every minute
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
            const data = userDocSnap.data();
            setPatientData(data.patient);
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

  const handleLongPressLogo = () => {
    Alert.alert(
      "العودة لوضع مقدم الرعاية",
      "هل أنت متأكد أنك تريد الخروج من وضع المريض؟",
      [
        { text: "إلغاء", style: "cancel" },
        { text: "نعم، عودة", onPress: () => router.replace('/caregiver/dashboard') }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: dynamicColors.backgroundLight }]}>
        <ActivityIndicator size="large" color={dynamicColors.primary} />
        <Text style={{ marginTop: 20, color: dynamicColors.textMuted, fontSize: SIZES.body }}>نجهز لك عالمك الجميل...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header with Logo and App Name (Now at the Top) */}
      <View style={styles.topHeader}>
        <View style={styles.headerContent}>
          <View style={styles.appNameContainer}>
            <Text style={[styles.appNamePart1, { color: COLORS.secondary }]}>رفيق</Text>
            <Text style={[styles.appNamePart2, { color: COLORS.primary }]}>الذاكرة</Text>
          </View>
          <TouchableOpacity 
            delayLongPress={2000}
            onLongPress={handleLongPressLogo}
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

      {/* Reality Orientation Header (Now Below the Logo) */}
      <View style={[styles.realityHeader, { backgroundColor: dynamicColors.primary }]}>
        <Text style={styles.dateText}>{getArabicDate()}</Text>
        <Text style={styles.timeText}>الساعة الآن: {currentTime}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View style={[styles.avatarContainer, { borderColor: dynamicColors.primary }]}>
            <MaterialCommunityIcons name="account-heart" size={90} color={dynamicColors.primary} />
          </View>
          <Text style={[styles.greeting, { color: dynamicColors.textDark }]}>
            مرحباً بك، {patientData?.name || 'صديقي'}!
          </Text>
          <Text style={[styles.subGreeting, { color: dynamicColors.textMuted }]}>
            نحن سعداء جداً برؤيتك اليوم.
          </Text>
        </View>

        {/* Main Action Card */}
        <TouchableOpacity 
          style={[styles.mainCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border }]}
          onPress={() => router.push('/patient/memory-bank')}
          activeOpacity={0.9}
        >
          <View style={[styles.iconCircle, { backgroundColor: dynamicColors.primary + '15' }]}>
            <MaterialCommunityIcons name="brain" size={60} color={dynamicColors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: dynamicColors.textDark }]}>بنك الذكريات</Text>
          <Text style={[styles.cardSubtitle, { color: dynamicColors.textMuted }]}>
            اضغط هنا لرؤية صور وأسماء أحبائك وأصدقائك الذين يشتاقون إليك.
          </Text>
          <View style={[styles.actionButton, { backgroundColor: dynamicColors.primary }]}>
            <Text style={styles.actionButtonText}>استعراض الذكريات</Text>
            <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.textLight} />
          </View>
        </TouchableOpacity>

        {/* Tip Section */}
        <View style={[styles.infoCard, { backgroundColor: '#FFF9C4', borderColor: '#FBC02D' }]}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={30} color="#F9A825" />
          <Text style={[styles.infoText, { color: '#5D4037' }]}>
            نصيحة: تصفح الصور يومياً يساعدك على تذكر أجمل اللحظات.
          </Text>
        </View>
      </ScrollView>

      {/* Floating AI Chat Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: COLORS.secondary }]}
        onPress={() => router.push('/patient/ai-chat')}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="chat-processing" size={32} color="white" />
        <View style={styles.fabBadge}>
          <Text style={styles.fabBadgeText}>AI</Text>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  realityHeader: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  dateText: {
    color: 'white',
    fontSize: SIZES.body,
    fontWeight: FONTS.bold,
  },
  timeText: {
    color: 'white',
    fontSize: SIZES.caption,
    marginTop: 2,
  },
  topHeader: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.base,
    backgroundColor: 'white',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appNameContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  appNamePart1: {
    fontSize: SIZES.h2,
    fontWeight: FONTS.bold,
    marginRight: 4,
  },
  appNamePart2: {
    fontSize: SIZES.h2,
    fontWeight: FONTS.bold,
  },
  logoContainer: {
    width: 60,
    height: 60,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  scrollContent: { 
    padding: SIZES.padding, 
    alignItems: 'center',
    paddingBottom: 100,
  },
  welcomeSection: {
    alignItems: 'center',
    marginVertical: SIZES.padding,
  },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.base,
    elevation: 4,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  greeting: {
    fontSize: SIZES.h1,
    fontWeight: FONTS.bold,
    textAlign: 'center',
  },
  subGreeting: {
    fontSize: SIZES.h3,
    textAlign: 'center',
    marginTop: 4,
  },
  mainCard: {
    width: '100%',
    padding: SIZES.padding * 1.5,
    borderRadius: SIZES.radius * 2,
    borderWidth: 1,
    marginTop: SIZES.padding,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.padding,
  },
  cardTitle: {
    fontSize: SIZES.h1,
    fontWeight: FONTS.bold,
    marginBottom: SIZES.base,
  },
  cardSubtitle: {
    fontSize: SIZES.body,
    textAlign: 'center',
    marginBottom: SIZES.padding * 1.5,
    lineHeight: 28,
  },
  actionButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding * 2,
    paddingVertical: SIZES.padding,
    borderRadius: SIZES.radius,
  },
  actionButtonText: {
    color: 'white',
    fontSize: SIZES.h2,
    fontWeight: FONTS.bold,
    marginLeft: 10,
  },
  infoCard: {
    width: '100%',
    flexDirection: 'row-reverse',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginTop: SIZES.padding * 2,
    alignItems: 'center',
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: SIZES.body,
    marginRight: 12,
    textAlign: 'right',
    fontWeight: FONTS.medium,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
  },
  fabBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: 'white',
  },
  fabBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  }
});
