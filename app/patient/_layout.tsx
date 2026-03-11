import { Stack } from 'expo-router';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES } from '../../constants/theme';

export default function PatientLayout() {
  const { dynamicColors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: dynamicColors.backgroundLight },
        headerTintColor: dynamicColors.textDark,
        headerTitleStyle: { fontSize: SIZES.h3 },
        headerTitleAlign: 'center',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="memory-bank" options={{ title: 'بنك الذكريات' }} />
    </Stack>
  );
}