import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const PrivacyPoint = ({ icon, title, text }: { icon: string, title: string, text: string }) => (
  <View style={styles.pointContainer}>
    <View style={styles.pointIconWrapper}>
      <MaterialCommunityIcons name={icon as any} size={24} color={COLORS.secondary} />
    </View>
    <View style={styles.pointTextWrapper}>
      <Text style={styles.pointTitle}>{title}</Text>
      <Text style={styles.pointText}>{text}</Text>
    </View>
  </View>
);

export default function PrivacyScreen() {
  const router = useRouter();

  const handleUnderstand = async () => {
    try {
      await AsyncStorage.setItem('hasOnboarded', 'true');
      router.replace('/auth/caregiver-signup'); 
    } catch (e) {
      console.warn("Failed to save onboarding status: ", e);
      router.replace('/auth/caregiver-signup');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name="shield-check" size={80} color={COLORS.secondary} />
          </View>
          <Text style={styles.title}>الخصوصية والأمان</Text>
          <Text style={styles.subtitle}>
            نحن نأخذ خصوصيتك وخصوصية أحبائك على محمل الجد.
          </Text>
        </View>
        
        <View style={styles.pointsWrapper}>
          <PrivacyPoint 
            icon="lock-outline" 
            title="بياناتك مشفرة" 
            text="جميع الصور والذكريات مخزنة بشكل آمن ولا يمكن لأحد غيرك الوصول إليها." 
          />
          <PrivacyPoint 
            icon="account-off-outline" 
            title="لا مشاركة للبيانات" 
            text="لا نقوم ببيع أو مشاركة بياناتك مع أي جهات خارجية أو شركات إعلانية." 
          />
          <PrivacyPoint 
            icon="delete-outline" 
            title="تحكم كامل" 
            text="يمكنك حذف حسابك وجميع بياناتك المرتبطة به في أي وقت بضغطة زر." 
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleUnderstand}>
          <Text style={styles.buttonText}>فهمت وموافق</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  scrollContent: { padding: SIZES.padding, paddingBottom: 100 },
  header: { alignItems: 'center', marginBottom: SIZES.padding * 2 },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.padding,
  },
  title: { fontSize: SIZES.h2, fontWeight: FONTS.bold, color: COLORS.textDark, marginBottom: SIZES.base },
  subtitle: { fontSize: SIZES.body, textAlign: 'center', color: COLORS.textMuted, paddingHorizontal: SIZES.padding, lineHeight: SIZES.body * 1.4 },
  pointsWrapper: { width: '100%' },
  pointContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.padding,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pointIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F8E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SIZES.padding,
  },
  pointTextWrapper: { flex: 1 },
  pointTitle: { fontSize: SIZES.body, fontWeight: FONTS.bold, color: COLORS.textDark, textAlign: 'right', marginBottom: 4 },
  pointText: { fontSize: SIZES.caption, color: COLORS.textMuted, textAlign: 'right', lineHeight: SIZES.caption * 1.4 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SIZES.padding, backgroundColor: COLORS.backgroundLight },
  button: { backgroundColor: COLORS.secondary, padding: SIZES.padding, borderRadius: SIZES.radius, alignItems: 'center' },
  buttonText: { color: COLORS.textLight, fontSize: SIZES.h3, fontWeight: FONTS.bold },
});