import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../../firebaseConfig';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { SIZES, FONTS } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../constants/ThemeContext';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('خطأ', 'كلمة المرور الجديدة وتأكيدها غير متطابقين.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('خطأ', 'يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل.');
      return;
    }

    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (user && user.email) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        Alert.alert('نجاح', 'تم تغيير كلمة المرور بنجاح.');
        router.back();
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        Alert.alert('خطأ', 'كلمة المرور الحالية غير صحيحة.');
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert('خطأ', 'لأسباب أمنية، يرجى تسجيل الدخول مرة أخرى ثم حاول تغيير كلمة المرور.');
      } else {
        Alert.alert('خطأ', 'فشل تغيير كلمة المرور. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
      <Stack.Screen options={{
        title: 'تغيير كلمة المرور',
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: dynamicColors.backgroundLight },
        headerTitleStyle: { color: dynamicColors.textDark },
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: SIZES.padding }}>
            <MaterialCommunityIcons name="chevron-right" size={30} color={dynamicColors.textDark} />
          </TouchableOpacity>
        )
      }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>كلمة المرور الحالية</Text>
            <View style={[styles.passwordInputContainer, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: dynamicColors.textDark }]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="أدخل كلمة المرور الحالية"
                placeholderTextColor={dynamicColors.textMuted}
                secureTextEntry={!showCurrentPassword}
                textAlign="right"
              />
              <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={styles.eyeIcon}>
                <MaterialCommunityIcons 
                  name={showCurrentPassword ? "eye-off" : "eye"} 
                  size={24} 
                  color={dynamicColors.textMuted} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>كلمة المرور الجديدة</Text>
            <View style={[styles.passwordInputContainer, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: dynamicColors.textDark }]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="أدخل كلمة المرور الجديدة"
                placeholderTextColor={dynamicColors.textMuted}
                secureTextEntry={!showNewPassword}
                textAlign="right"
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                <MaterialCommunityIcons 
                  name={showNewPassword ? "eye-off" : "eye"} 
                  size={24} 
                  color={dynamicColors.textMuted} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>تأكيد كلمة المرور الجديدة</Text>
            <View style={[styles.passwordInputContainer, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: dynamicColors.textDark }]}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                placeholder="أكد كلمة المرور الجديدة"
                placeholderTextColor={dynamicColors.textMuted}
                secureTextEntry={!showConfirmNewPassword}
                textAlign="right"
              />
              <TouchableOpacity onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)} style={styles.eyeIcon}>
                <MaterialCommunityIcons 
                  name={showConfirmNewPassword ? "eye-off" : "eye"} 
                  size={24} 
                  color={dynamicColors.textMuted} 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: dynamicColors.primary }, isSaving && { opacity: 0.7 }]} 
            onPress={handleChangePassword}
            disabled={isSaving}
          >
            {isSaving ? <ActivityIndicator color={dynamicColors.textLight} /> : <Text style={[styles.saveButtonText, { color: dynamicColors.textLight }]}>حفظ التغييرات</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SIZES.padding },
  inputGroup: { marginBottom: SIZES.padding },
  label: { fontSize: SIZES.body, fontWeight: FONTS.bold, marginBottom: SIZES.base, textAlign: 'right' },
  passwordInputContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    borderWidth: 1,
    paddingRight: SIZES.padding / 2, // Adjust padding for eye icon
  },
  passwordInput: {
    flex: 1,
    padding: SIZES.padding,
    textAlign: 'right',
    fontSize: SIZES.body,
  },
  eyeIcon: {
    padding: SIZES.padding / 2,
  },
  saveButton: { padding: SIZES.padding, borderRadius: SIZES.radius, alignItems: 'center', marginTop: SIZES.padding },
  saveButtonText: { fontSize: SIZES.h3, fontWeight: FONTS.bold }
});