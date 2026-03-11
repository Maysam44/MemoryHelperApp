import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../../firebaseConfig';
import { EmailAuthProvider, reauthenticateWithCredential, updateEmail } from 'firebase/auth';
import { SIZES, FONTS } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../constants/ThemeContext';

export default function EditEmailScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const [currentEmail, setCurrentEmail] = useState(auth.currentUser?.email || '');
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdateEmail = async () => {
    if (!newEmail.trim() || !password.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال البريد الإلكتروني الجديد وكلمة المرور الحالية.');
      return;
    }

    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const credential = EmailAuthProvider.credential(user.email!, password);
        await reauthenticateWithCredential(user, credential);
        await updateEmail(user, newEmail.trim());
        Alert.alert('نجاح', 'تم تحديث البريد الإلكتروني بنجاح.');
        router.back();
      }
    } catch (error: any) {
      console.error('Error updating email:', error);
      if (error.code === 'auth/wrong-password') {
        Alert.alert('خطأ', 'كلمة المرور الحالية غير صحيحة.');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('خطأ', 'صيغة البريد الإلكتروني الجديد غير صحيحة.');
      } else if (error.code === 'auth/email-already-in-use') {
        Alert.alert('خطأ', 'البريد الإلكتروني الجديد مستخدم بالفعل.');
      } else {
        Alert.alert('خطأ', 'فشل تحديث البريد الإلكتروني. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
      <Stack.Screen options={{
        title: 'تعديل البريد الإلكتروني',
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
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>البريد الإلكتروني الحالي</Text>
            <TextInput
              style={[styles.input, { backgroundColor: dynamicColors.backgroundLight, color: dynamicColors.textMuted }]} // Make it look disabled
              value={currentEmail}
              editable={false}
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>البريد الإلكتروني الجديد</Text>
            <TextInput
              style={[styles.input, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border, color: dynamicColors.textDark }]}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="أدخل البريد الإلكتروني الجديد"
              placeholderTextColor={dynamicColors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>كلمة المرور الحالية</Text>
            <View style={[styles.passwordInputContainer, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: dynamicColors.textDark }]}
                value={password}
                onChangeText={setPassword}
                placeholder="أدخل كلمة المرور الحالية"
                placeholderTextColor={dynamicColors.textMuted}
                secureTextEntry={!showPassword}
                textAlign="right"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <MaterialCommunityIcons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={24} 
                  color={dynamicColors.textMuted} 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: dynamicColors.primary }, isSaving && { opacity: 0.7 }]} 
            onPress={handleUpdateEmail}
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
  input: { padding: SIZES.padding, borderRadius: SIZES.radius, borderWidth: 1, textAlign: 'right', fontSize: SIZES.body },
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
  saveButtonText: { color: 'white', fontSize: SIZES.h3, fontWeight: FONTS.bold }
});