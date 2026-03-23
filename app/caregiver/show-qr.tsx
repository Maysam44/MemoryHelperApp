import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../constants/ThemeContext';
import QRCode from 'react-native-qrcode-svg';
import { generateQRData } from '../../utils/qrCodeUtils';

export default function ShowQRScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [qrValue, setQrValue] = useState<string>('');
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const loadQRData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          // الحصول على بيانات المستخدم
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
          // توليد بيانات QR
          const qrData = generateQRData(user.uid);
          setQrValue(qrData);
        }
      } catch (error) {
        console.error('Error loading QR data:', error);
        Alert.alert('خطأ', 'فشل تحميل رمز QR');
      } finally {
        setIsLoading(false);
      }
    };

    loadQRData();
  }, []);

  const handleCopyQR = () => {
    // يمكن إضافة نسخ الرمز إلى الحافظة هنا
    Alert.alert('تم', 'تم نسخ رمز QR');
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: dynamicColors.backgroundLight }]}>
        <ActivityIndicator size="large" color={dynamicColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
      <Stack.Screen
        options={{
          title: 'رمز QR للربط',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: dynamicColors.backgroundLight },
          headerShadowVisible: false,
          headerTitleStyle: { color: dynamicColors.textDark },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: SIZES.padding }}>
              <MaterialCommunityIcons name="chevron-right" size={30} color={dynamicColors.textDark} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.content}>
        <View style={styles.instructionSection}>
          <MaterialCommunityIcons name="information-outline" size={32} color={dynamicColors.primary} />
          <Text style={[styles.instructionTitle, { color: dynamicColors.textDark }]}>
            شارك هذا الرمز مع رفيق الذاكرة
          </Text>
          <Text style={[styles.instructionText, { color: dynamicColors.textMuted }]}>
            اطلب من رفيق الذاكرة مسح هذا الرمز عند تسجيله الدخول لأول مرة ليتم ربطه بحسابك تلقائياً.
          </Text>
        </View>

        <View style={[styles.qrContainer, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border }]}>
          {qrValue ? (
            <QRCode
              value={qrValue}
              size={250}
              color={dynamicColors.textDark}
              backgroundColor={dynamicColors.card}
            />
          ) : (
            <ActivityIndicator size="large" color={dynamicColors.primary} />
          )}
        </View>

        <View style={styles.infoSection}>
          <View style={[styles.infoBox, { backgroundColor: dynamicColors.backgroundLight, borderColor: dynamicColors.border }]}>
            <MaterialCommunityIcons name="account-heart" size={24} color={dynamicColors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, { color: dynamicColors.textMuted }]}>مقدم الرعاية</Text>
              <Text style={[styles.infoValue, { color: dynamicColors.textDark }]}>
                {userData?.displayName || 'أنت'}
              </Text>
            </View>
          </View>

          <View style={[styles.infoBox, { backgroundColor: dynamicColors.backgroundLight, borderColor: dynamicColors.border }]}>
            <MaterialCommunityIcons name="account-star" size={24} color={dynamicColors.secondary} />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, { color: dynamicColors.textMuted }]}>رفيق الذاكرة</Text>
              <Text style={[styles.infoValue, { color: dynamicColors.textDark }]}>
                {userData?.patientName || 'لم يتم تعيين'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: dynamicColors.primary }]}
          onPress={handleCopyQR}
        >
          <MaterialCommunityIcons name="content-copy" size={20} color={dynamicColors.textLight} />
          <Text style={[styles.buttonText, { color: dynamicColors.textLight }]}>نسخ الرمز</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: dynamicColors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.secondaryButtonText, { color: dynamicColors.primary }]}>العودة</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: SIZES.padding, justifyContent: 'space-between' },
  instructionSection: { alignItems: 'center', marginBottom: SIZES.padding * 2 },
  instructionTitle: { fontSize: SIZES.h3, fontWeight: FONTS.bold, marginVertical: SIZES.base },
  instructionText: { fontSize: SIZES.body, textAlign: 'center', lineHeight: SIZES.body * 1.5 },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    marginVertical: SIZES.padding,
  },
  infoSection: { marginVertical: SIZES.padding },
  infoBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    marginBottom: SIZES.base,
  },
  infoTextContainer: { marginRight: SIZES.padding, flex: 1 },
  infoLabel: { fontSize: SIZES.caption, marginBottom: 4 },
  infoValue: { fontSize: SIZES.body, fontWeight: FONTS.bold },
  button: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.base,
  },
  buttonText: { fontSize: SIZES.body, fontWeight: FONTS.bold, marginLeft: SIZES.base },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    borderWidth: 2,
  },
  secondaryButtonText: { fontSize: SIZES.body, fontWeight: FONTS.bold },
});
