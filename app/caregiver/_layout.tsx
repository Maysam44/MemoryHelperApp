import { Stack, useRouter } from 'expo-router';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CaregiverLayout() {
  const router = useRouter();

  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: COLORS.backgroundLight },
      headerShadowVisible: false,
      headerTitleAlign: 'center',
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          <Image 
            source={require('../images/logo.png')} 
            style={styles.headerLogo} 
            resizeMode="contain" 
          />
          <View style={styles.appNameContainer}>
            <Text style={[styles.appNamePart, { color: COLORS.secondary }]}>رفيق </Text>
            <Text style={[styles.appNamePart, { color: COLORS.primary }]}>الذاكرة</Text>
          </View>
        </View>
      ),
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => router.push('/caregiver/settings')} 
          style={styles.settingsButton}
        >
          <MaterialCommunityIcons name="cog-outline" size={28} color={COLORS.textDark} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={{ width: 40 }} /> // للموازنة فقط
      ),
    }}>
      <Stack.Screen
        name="dashboard"
        options={{
          title: 'لوحة التحكم',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'الإعدادات',
          headerTitle: 'الإعدادات',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialCommunityIcons name="chevron-right" size={30} color={COLORS.textDark} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="add-memory"
        options={{
          title: 'إضافة ذكرى',
          headerTitle: 'إضافة ذكرى جديدة',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialCommunityIcons name="chevron-right" size={30} color={COLORS.textDark} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="edit-memory"
        options={{
          title: 'تعديل ذكرى',
          headerTitle: 'تعديل البيانات',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialCommunityIcons name="chevron-right" size={30} color={COLORS.textDark} />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerTitleContainer: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  headerLogo: { 
    width: 35, 
    height: 35, 
    marginLeft: 8 
  },
  appNameContainer: { 
    flexDirection: 'row-reverse' 
  },
  appNamePart: { 
    fontSize: SIZES.h3, 
    fontWeight: FONTS.bold 
  },
  settingsButton: { 
    marginLeft: SIZES.padding 
  },
  backButton: { 
    marginLeft: SIZES.padding 
  }
});