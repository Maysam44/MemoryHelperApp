// app/layout.tsx

import { Stack } from 'expo-router';
import { ThemeProvider } from '../constants/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="permissions/images" />
        <Stack.Screen name="permissions/microphone" />
        <Stack.Screen name="permissions/notifications" />
        <Stack.Screen name="permissions/privacy" />
        <Stack.Screen name="auth/caregiver-welcome" />
        <Stack.Screen name="auth/caregiver-signup" options={{ headerShown: true, title: 'إنشاء حساب مقدم الرعاية' }} />
        <Stack.Screen name="setup/caregiver-profile" options={{ headerShown: true, title: 'الخطوة 1: من أنت؟', headerBackVisible: false }} />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="caregiver" />
        <Stack.Screen name="patient" />
        <Stack.Screen name="patient/medicine-reminders" />
        <Stack.Screen name="patient/safe-zones" />
        <Stack.Screen name="patient/ai-chat" />

      </Stack>
    </ThemeProvider>
  );
}
