import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SIZES, FONTS } from '../constants/theme';

export default function LoadingScreen() {
  const router = useRouter();

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        // تأخير بسيط لضمان رؤية المستخدم للهوية البصرية
        await new Promise(resolve => setTimeout(resolve, 2000));

        const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
        
        // التحقق من حالة تسجيل الدخول أولاً لضمان استمرارية الحساب
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            // مستخدم مسجل دخوله -> اذهب مباشرة إلى لوحة التحكم
            router.replace('/caregiver/dashboard');
          } else if (hasOnboarded !== 'true') {
            // مستخدم جديد تماماً -> اذهب لشاشة الترحيب
            router.replace('/welcome');
          } else {
            // مستخدم قديم لكن غير مسجل دخوله -> اذهب لشاشة الدخول
            router.replace('/auth/caregiver-signup');
          }
        });
        
        return () => unsubscribe();

      } catch (e) {
        console.warn(e);
        router.replace('/welcome');
      }
    };

    checkUserStatus();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('./images/logo.png')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
        <View style={styles.appNameContainer}>
          <Text style={[styles.appNamePart, { color: COLORS.secondary }]}>رفيق </Text>
          <Text style={[styles.appNamePart, { color: COLORS.primary }]}>الذاكرة</Text>
        </View>
      </View>
      
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>نجهز لك ذكرياتك...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'space-around', 
    alignItems: 'center', 
    backgroundColor: COLORS.backgroundLight,
    paddingVertical: SIZES.padding * 2
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 180,
    height: 180,
    marginBottom: SIZES.padding,
  },
  appNameContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  appNamePart: {
    fontSize: SIZES.h1,
    fontWeight: FONTS.bold,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SIZES.padding,
    fontSize: SIZES.body,
    color: COLORS.textMuted,
    fontWeight: FONTS.medium,
  }
});