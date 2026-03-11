//app\auth\caregiver-welcome.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, FONTS } from '../../constants/theme';

export default function CaregiverWelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.content}>
        <Text style={styles.icon}>🤝</Text> 
        <Text style={styles.title}>أهلاً بك، مقدم الرعاية!</Text>
        <Text style={styles.subtitle}>
          أنت على وشك إنشاء 'حساب العائلة' الذي سيحفظ كل الذكريات والمواعيد بأمان.
          {"\n\n"}
          هذا الحساب خاص بك لإدارة كل شيء.
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/auth/caregiver-signup')}>
        <Text style={styles.buttonText}>متابعة لإنشاء الحساب</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// سنستخدم نفس نمط شاشات الأذونات
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
    justifyContent: 'space-between',
    padding: SIZES.padding,
    paddingBottom: SIZES.padding * 2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 80,
    marginBottom: SIZES.padding,
  },
  title: {
    fontSize: SIZES.h2,
    fontWeight: FONTS.bold,
    color: COLORS.textDark,
    marginBottom: SIZES.base * 2,
  },
  subtitle: {
    fontSize: SIZES.body,
    textAlign: 'center',
    color: COLORS.textMuted,
    paddingHorizontal: SIZES.padding,
    lineHeight: SIZES.body * 1.5, // لزيادة التباعد بين الأسطر
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.textLight,
    fontSize: SIZES.h3,
    fontWeight: FONTS.bold,
  },
});
