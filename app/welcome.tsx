//npx expo start -c

import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function OnboardingScreen() {
  const router = useRouter();

  const handleStart = (role: 'caregiver' | 'patient') => {
    // تم تأجيل الأذونات الإجبارية، ننتقل مباشرة لشاشة الخصوصية أو التسجيل
    router.push('/permissions/privacy');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <Image 
          source={require('./images/logo.png')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
        <View style={styles.appNameContainer}>
          <Text style={[styles.appNamePart, { color: COLORS.secondary }]}>رفيق </Text>
          <Text style={[styles.appNamePart, { color: COLORS.primary }]}>الذاكرة</Text>
        </View>
        <Text style={styles.subtitle}>
          مساعدك الرقمي لتذكّر الأشخاص، المواعيد، واللحظات الجميلة.
        </Text>
      </View>

      <View style={styles.selectionContainer}>
        <Text style={styles.selectionTitle}>كيف تود البدء؟</Text>
        
        <TouchableOpacity 
          style={styles.roleButton} 
          onPress={() => handleStart('caregiver')}
        >
          <View style={styles.roleIconContainer}>
            <MaterialCommunityIcons name="account-heart" size={40} color={COLORS.primary} />
          </View>
          <View style={styles.roleTextContainer}>
            <Text style={styles.roleTitle}>أنا مقدم رعاية</Text>
            <Text style={styles.roleDescription}>سأقوم بإدارة الذكريات والمواعيد لأحبائي.</Text>
          </View>
          <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.roleButton, styles.patientButton]} 
          onPress={() => handleStart('patient')}
        >
          <View style={[styles.roleIconContainer, styles.patientIconContainer]}>
            <MaterialCommunityIcons name="account-star" size={40} color={COLORS.secondary} />
          </View>
          <View style={styles.roleTextContainer}>
            <Text style={styles.roleTitle}>أنا رفيق الذاكرة</Text>
            <Text style={styles.roleDescription}>أريد رؤية ذكرياتي ومواعيدي اليومية.</Text>
          </View>
          <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>بالبدء، أنت توافق على شروط الاستخدام والخصوصية.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.backgroundLight, 
    padding: SIZES.padding 
  },
  header: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginTop: SIZES.padding
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: SIZES.base,
  },
  appNameContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: SIZES.base,
  },
  appNamePart: {
    fontSize: SIZES.h1,
    fontWeight: FONTS.bold,
  },
  subtitle: { 
    fontSize: SIZES.body, 
    textAlign: 'center', 
    color: COLORS.textMuted, 
    paddingHorizontal: SIZES.padding,
    lineHeight: SIZES.body * 1.4
  },
  selectionContainer: {
    flex: 1.5,
    justifyContent: 'center',
  },
  selectionTitle: {
    fontSize: SIZES.h3,
    fontWeight: FONTS.bold,
    color: COLORS.textDark,
    marginBottom: SIZES.padding,
    textAlign: 'right'
  },
  roleButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.padding,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 }
  },
  patientButton: {
    borderColor: COLORS.secondary,
  },
  roleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SIZES.padding
  },
  patientIconContainer: {
    backgroundColor: '#E8F5E9',
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: SIZES.h3,
    fontWeight: FONTS.bold,
    color: COLORS.textDark,
    textAlign: 'right'
  },
  roleDescription: {
    fontSize: SIZES.caption,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: 4
  },
  footer: {
    paddingVertical: SIZES.padding,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center'
  }
});