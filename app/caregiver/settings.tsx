import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { SIZES, FONTS } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../constants/ThemeContext';

const SettingItem = ({ icon, title, value, onPress, type = 'link', itemColor, isDarkMode }: any) => {
  const { dynamicColors } = useTheme();
  const currentItemColor = itemColor || dynamicColors.textDark;

  return (
    <TouchableOpacity 
      style={[styles.settingItem, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border }]} 
      onPress={type === 'switch' ? undefined : onPress} 
      disabled={type === 'switch'}
      activeOpacity={type === 'switch' ? 1 : 0.7}
    >
      <View style={styles.settingItemLeft}>
        {type === 'link' && <MaterialCommunityIcons name="chevron-left" size={24} color={dynamicColors.textMuted} />}
        {type === 'switch' && (
          <TouchableOpacity onPress={onPress} style={{ marginRight: SIZES.base }}>
            {value}
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.settingItemRight}>
        <View style={[styles.iconWrapper, { backgroundColor: currentItemColor + '15' }]}>
          <MaterialCommunityIcons name={icon} size={22} color={currentItemColor} />
        </View>
        <Text style={[styles.settingTitle, { color: currentItemColor }]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function SettingsScreen() {
  const router = useRouter();
  const { isDarkMode, toggleDarkMode, dynamicColors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      "تسجيل الخروج",
      "هل أنت متأكد أنك تريد تسجيل الخروج؟",
      [
        { text: "إلغاء", style: "cancel" },
        { 
          text: "خروج", 
          style: "destructive", 
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/auth/caregiver-signup');
            } catch (error) {
              Alert.alert("خطأ", "فشل تسجيل الخروج.");
            }
          } 
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={dynamicColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
      <Stack.Screen options={{ 
        title: 'الإعدادات', 
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: dynamicColors.backgroundLight },
        headerShadowVisible: false,
        headerTitleStyle: { color: dynamicColors.textDark },
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: SIZES.padding }}>
            <MaterialCommunityIcons name="chevron-right" size={30} color={dynamicColors.textDark} />
          </TouchableOpacity>
        )
      }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: dynamicColors.textMuted }]}>الحساب والملف الشخصي</Text>
          <SettingItem 
            icon="account-outline" 
            title="تعديل بياناتي" 
            onPress={() => router.push('/caregiver/edit-profile')} 
            isDarkMode={isDarkMode}
            itemColor={dynamicColors.textDark}
          />
          <SettingItem 
            icon="email-outline" 
            title={auth.currentUser?.email || "البريد الإلكتروني"} 
            onPress={() => router.push('/caregiver/edit-email')} 
            isDarkMode={isDarkMode}
            itemColor={dynamicColors.textDark}
          />
          <SettingItem 
            icon="lock-reset" 
            title="تغيير كلمة المرور" 
            onPress={() => router.push('/caregiver/change-password')} 
            isDarkMode={isDarkMode}
            itemColor={dynamicColors.textDark}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: dynamicColors.textMuted }]}>بيانات المريض</Text>
          <SettingItem 
            icon="account-heart-outline" 
            title={`تعديل بيانات ${userData?.patientName || 'المريض'}`} 
            onPress={() => router.push('/caregiver/edit-patient')} 
            isDarkMode={isDarkMode}
            itemColor={dynamicColors.textDark}
          />
          <SettingItem 
            icon="chart-line" 
            title={`المرحلة الحالية: ${userData?.patientStage === 'early' ? 'مبكرة' : userData?.patientStage === 'moderate' ? 'متوسطة' : 'متأخرة'}`} 
            onPress={() => {}} 
            isDarkMode={isDarkMode}
            itemColor={dynamicColors.textDark}
          />
          <SettingItem 
            icon="qrcode" 
            title="رمز QR للربط" 
            onPress={() => router.push('/caregiver/show-qr')} 
            isDarkMode={isDarkMode}
            itemColor={dynamicColors.primary}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: dynamicColors.textMuted }]}>المظهر والتفضيلات</Text>
          <SettingItem 
            icon="weather-night" 
            title="الوضع الليلي" 
            type="switch"
            itemColor={dynamicColors.primary}
            isDarkMode={isDarkMode}
            value={
              <Switch 
                value={isDarkMode} 
                onValueChange={toggleDarkMode} 
                trackColor={{ false: dynamicColors.border, true: dynamicColors.primary }}
                thumbColor={Platform.OS === 'android' ? dynamicColors.textLight : dynamicColors.textLight}
              />
            }
          />
          <SettingItem 
            icon="bell-outline" 
            title="إعدادات التنبيهات" 
            onPress={() => router.push('/caregiver/notification-settings')} 
            isDarkMode={isDarkMode}
            itemColor={dynamicColors.textDark}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: dynamicColors.textMuted }]}>النظام</Text>
          <SettingItem 
            icon="information-outline" 
            title="عن التطبيق" 
            onPress={() => Alert.alert("عن التطبيق", "رفيق الذاكرة - مساعدك الذكي لرعاية أحبائك.")} 
            isDarkMode={isDarkMode}
            itemColor={dynamicColors.textDark}
          />
          <SettingItem 
            icon="logout" 
            title="تسجيل الخروج" 
            itemColor={dynamicColors.error}
            onPress={handleLogout} 
            isDarkMode={isDarkMode}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: dynamicColors.textMuted }]}>نسخة التطبيق 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: SIZES.padding },
  section: { marginBottom: SIZES.padding * 1.5 },
  sectionHeader: { 
    fontSize: SIZES.caption, 
    fontWeight: FONTS.bold, 
    marginBottom: SIZES.base,
    textAlign: 'right',
    paddingRight: SIZES.base
  },
  settingItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    padding: SIZES.padding * 0.75,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.base,
    borderWidth: 1,
  },
  settingItemLeft: { flexDirection: 'row', alignItems: 'center' },
  settingItemRight: { flexDirection: 'row-reverse', alignItems: 'center' },
  iconWrapper: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginLeft: SIZES.base
  },
  settingTitle: { fontSize: SIZES.body, fontWeight: FONTS.medium },
  footer: { alignItems: 'center', marginTop: SIZES.padding, marginBottom: SIZES.padding * 2 },
  versionText: { fontSize: 12 }
});