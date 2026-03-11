import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CaregiverSignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('خطأ', 'الرجاء إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        router.replace('/caregiver/dashboard');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        router.replace('/setup/initial-setup');
      }
    } catch (error: any) {
      console.error(error);
      let message = 'حدث خطأ ما، حاول مرة أخرى.';
      if (error.code === 'auth/email-already-in-use') message = 'هذا البريد مستخدم بالفعل.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      if (error.code === 'auth/user-not-found') message = 'لا يوجد حساب بهذا البريد.';
      Alert.alert('فشل العملية', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Image 
              source={require('../images/logo.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View style={styles.appNameContainer}>
              <Text style={[styles.appNamePart, { color: COLORS.secondary }]}>رفيق </Text>
              <Text style={[styles.appNamePart, { color: COLORS.primary }]}>الذاكرة</Text>
            </View>
            <Text style={styles.title}>{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'أهلاً بك مجدداً في رحلة العناية بأحبائك.' : 'ابدأ الآن بتنظيم ذكريات ومواعيد عائلتك.'}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="البريد الإلكتروني" 
                value={email} 
                onChangeText={setEmail} 
                autoCapitalize="none"
                keyboardType="email-address"
                textAlign="right"
              />
            </View>

            <View style={styles.inputContainer}>
              <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                <MaterialCommunityIcons 
                  name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color={COLORS.textMuted} 
                  style={styles.inputIcon} 
                />
              </TouchableOpacity>
              <TextInput 
                style={styles.input} 
                placeholder="كلمة المرور" 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry={!isPasswordVisible} 
                textAlign="right"
              />
              <MaterialCommunityIcons name="lock-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            </View>

            <TouchableOpacity 
              style={[styles.button, isLoading && styles.disabledButton]} 
              onPress={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.textLight} />
              ) : (
                <Text style={styles.buttonText}>{isLogin ? 'دخول' : 'إنشاء الحساب'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.switchButton} 
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={styles.switchText}>
                {isLogin ? 'ليس لديك حساب؟ سجل الآن' : 'لديك حساب بالفعل؟ سجل دخولك'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  scrollContent: { padding: SIZES.padding, alignItems: 'center', justifyContent: 'center', minHeight: '100%' },
  header: { alignItems: 'center', marginBottom: SIZES.padding * 2 },
  logoImage: { width: 100, height: 100, marginBottom: SIZES.base },
  appNameContainer: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: SIZES.base },
  appNamePart: { fontSize: SIZES.h2, fontWeight: FONTS.bold },
  title: { fontSize: SIZES.h2, fontWeight: FONTS.bold, color: COLORS.textDark, marginBottom: SIZES.base },
  subtitle: { fontSize: SIZES.body, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: SIZES.padding },
  form: { width: '100%' },
  inputContainer: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    backgroundColor: COLORS.card, 
    borderRadius: SIZES.radius, 
    marginBottom: SIZES.padding, 
    paddingHorizontal: SIZES.padding,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  inputIcon: { marginHorizontal: SIZES.base / 2 },
  input: { flex: 1, paddingVertical: SIZES.padding, fontSize: SIZES.body, color: COLORS.textDark },
  button: { backgroundColor: COLORS.primary, padding: SIZES.padding, borderRadius: SIZES.radius, alignItems: 'center', marginTop: SIZES.base, elevation: 2 },
  disabledButton: { opacity: 0.7 },
  buttonText: { color: COLORS.textLight, fontSize: SIZES.h3, fontWeight: FONTS.bold },
  switchButton: { marginTop: SIZES.padding, alignItems: 'center' },
  switchText: { color: COLORS.primary, fontSize: SIZES.body, fontWeight: FONTS.medium },
});