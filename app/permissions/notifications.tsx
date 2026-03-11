import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import * as Notifications from 'expo-notifications';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function NotificationsPermissionScreen() {
  const router = useRouter();

  const handleRequestPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      // لا نعطل المستخدم
    }
    router.push('/permissions/privacy');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        headerShown: true, 
        title: '', 
        headerTransparent: true,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-right" size={30} color={COLORS.textDark} />
          </TouchableOpacity>
        )
      }} />
      
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <MaterialCommunityIcons name="bell-ring-outline" size={80} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>تفعيل الإشعارات</Text>
        <Text style={styles.subtitle}>
          نرسل تذكيرات لطيفة في الوقت المناسب لمساعدتك على تذكر المواعيد والأدوية.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleRequestPermission}>
          <Text style={styles.buttonText}>تفعيل الإشعارات</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={() => router.push('/permissions/privacy')}>
          <Text style={styles.skipText}>تخطي الآن</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight, padding: SIZES.padding },
  backButton: { marginRight: SIZES.base },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconWrapper: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.padding,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  title: { fontSize: SIZES.h2, fontWeight: FONTS.bold, color: COLORS.textDark, marginBottom: SIZES.base * 2 },
  subtitle: { fontSize: SIZES.body, textAlign: 'center', color: COLORS.textMuted, paddingHorizontal: SIZES.padding, lineHeight: SIZES.body * 1.4 },
  footer: { paddingBottom: SIZES.padding },
  button: { backgroundColor: COLORS.primary, padding: SIZES.padding, borderRadius: SIZES.radius, alignItems: 'center', marginBottom: SIZES.base },
  buttonText: { color: COLORS.textLight, fontSize: SIZES.h3, fontWeight: FONTS.bold },
  skipButton: { padding: SIZES.base, alignItems: 'center' },
  skipText: { color: COLORS.textMuted, fontSize: SIZES.caption, fontWeight: FONTS.medium },
});