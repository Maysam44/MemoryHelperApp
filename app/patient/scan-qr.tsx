import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../constants/ThemeContext';
import { parseQRData } from '../../utils/qrCodeUtils';

export default function ScanQRScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (!isScanning || isProcessing) return;

    setIsScanning(false);
    setIsProcessing(true);

    try {
      // فك تشفير بيانات QR
      const qrParsed = parseQRData(data);

      if (!qrParsed || !qrParsed.caregiverId) {
        Alert.alert('خطأ', 'رمز QR غير صحيح. يرجى المحاولة مرة أخرى.');
        setIsScanning(true);
        setIsProcessing(false);
        return;
      }

      const caregiverId = qrParsed.caregiverId;
      console.log('Caregiver ID from QR:', caregiverId);

      // التحقق من وجود مقدم الرعاية
      const caregiverDocRef = doc(db, 'users', caregiverId);
      const caregiverDocSnap = await getDoc(caregiverDocRef);

      if (!caregiverDocSnap.exists()) {
        Alert.alert('خطأ', 'مقدم الرعاية غير موجود. يرجى التحقق من الرمز.');
        setIsScanning(true);
        setIsProcessing(false);
        return;
      }

      const caregiverData = caregiverDocSnap.data() || {};
      console.log('Caregiver Data:', JSON.stringify(caregiverData, null, 2));

      // التحقق من أن مقدم الرعاية لديه بيانات مريض معينة (بأكثر من احتمال للهيكلية)
      const patientData = caregiverData.patient || {};
      const patientName = patientData.name || caregiverData.patientName;

      if (!patientName) {
        console.log('No patient name found. Patient data:', JSON.stringify(patientData));
        Alert.alert('خطأ', 'مقدم الرعاية لم يقم بتعيين مريض بعد.');
        setIsScanning(true);
        setIsProcessing(false);
        return;
      }

      console.log('Patient name found:', patientName);

      // تسجيل الدخول بشكل مجهول أولاً (إذا لم يكن المستخدم مسجلاً)
      let currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('No current user, signing in anonymously...');
        const anonResult = await signInAnonymously(auth);
        currentUser = anonResult.user;
        console.log('Anonymous user created:', currentUser.uid);
      } else {
        console.log('Current user exists:', currentUser.uid);
      }

      // حفظ معرف مقدم الرعاية المرتبط في بيانات المريض
      const patientDocRef = doc(db, 'users', currentUser.uid);
      const patientDocSnap = await getDoc(patientDocRef);

      console.log('Patient doc exists:', patientDocSnap.exists());

      if (patientDocSnap.exists()) {
        // تحديث المستند الموجود
        console.log('Updating existing patient document...');
        await updateDoc(patientDocRef, {
          caregiverId: caregiverId,
          role: 'patient',
          linkedAt: new Date().toISOString(),
        });
      } else {
        // إنشاء مستند جديد
        console.log('Creating new patient document...');
        await setDoc(patientDocRef, {
          caregiverId: caregiverId,
          role: 'patient',
          linkedAt: new Date().toISOString(),
          displayName: patientName || 'المريض',
        });
      }

      console.log('Patient document saved successfully');

      // تحديث بيانات مقدم الرعاية بإضافة معرف المريض
      console.log('Updating caregiver document with patient ID...');
      await updateDoc(caregiverDocRef, {
        patientId: currentUser.uid,
      });

      console.log('Caregiver document updated successfully');

      Alert.alert('نجح!', 'تم ربطك بنجاح مع مقدم الرعاية.', [
        {
          text: 'متابعة',
          onPress: () => {
            // توجيه المريض لصفحة لوحة التحكم الخاصة به
            router.replace('/patient/dashboard');
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error scanning QR:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      console.error('Full error:', JSON.stringify(error));

      let errorMessage = 'حدث خطأ أثناء معالجة الرمز. يرجى المحاولة مرة أخرى.';

      if (error?.code === 'auth/operation-not-allowed') {
        errorMessage = 'التسجيل المجهول غير مفعل. يرجى الاتصال بالدعم الفني.';
      } else if (error?.code === 'permission-denied') {
        errorMessage = 'ليس لديك الصلاحية لربط هذا الحساب. اتصل بمقدم الرعاية.';
      } else if (error?.message?.includes('Cannot read property') || error?.message?.includes('Cannot read')) {
        errorMessage = 'بيانات مقدم الرعاية غير كاملة. يرجى مراجعة الإعدادات.';
      } else if (error?.code === 'PERMISSION_DENIED') {
        errorMessage = 'خطأ في الصلاحيات. تأكد من أن قاعدة البيانات تسمح بالكتابة.';
      }

      Alert.alert('خطأ', errorMessage);
      setIsScanning(true);
      setIsProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.centered, { backgroundColor: dynamicColors.backgroundLight }]}>
        <ActivityIndicator size="large" color={dynamicColors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="camera-off" size={64} color={dynamicColors.textMuted} />
          <Text style={[styles.permissionTitle, { color: dynamicColors.textDark }]}>
            نحتاج إلى إذن الكاميرا
          </Text>
          <Text style={[styles.permissionText, { color: dynamicColors.textMuted }]}>
            يرجى السماح بالوصول إلى الكاميرا لمسح رمز QR
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: dynamicColors.primary }]}
            onPress={requestPermission}
          >
            <Text style={[styles.permissionButtonText, { color: dynamicColors.textLight }]}>
              منح الإذن
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: dynamicColors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.cancelButtonText, { color: dynamicColors.primary }]}>
              العودة
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'مسح رمز QR',
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

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        onBarcodeScanned={isProcessing ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlayLeft} />
            <View style={[styles.scanFrame, { borderColor: dynamicColors.primary }]} />
            <View style={styles.overlayRight} />
          </View>
          <View style={styles.overlayBottom}>
            <Text style={[styles.instructionText, { color: dynamicColors.textLight }]}>
              وجّه الكاميرا نحو رمز QR
            </Text>
          </View>
        </View>
      </CameraView>

      {isProcessing && (
        <View style={[styles.processingOverlay, { backgroundColor: dynamicColors.backgroundLight + 'E6' }]}>
          <ActivityIndicator size="large" color={dynamicColors.primary} />
          <Text style={[styles.processingText, { color: dynamicColors.textDark }]}>
            جاري معالجة الرمز...
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SIZES.padding },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  overlayMiddle: { flexDirection: 'row', flex: 1.5 },
  overlayLeft: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderRadius: 10,
  },
  overlayRight: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: {
    fontSize: SIZES.body,
    fontWeight: FONTS.bold,
    textAlign: 'center',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    marginTop: SIZES.padding,
    fontSize: SIZES.body,
    fontWeight: FONTS.bold,
  },
  permissionTitle: {
    fontSize: SIZES.h2,
    fontWeight: FONTS.bold,
    marginVertical: SIZES.padding,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: SIZES.body,
    textAlign: 'center',
    marginBottom: SIZES.padding * 2,
    lineHeight: SIZES.body * 1.5,
  },
  permissionButton: {
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.base,
    alignItems: 'center',
  },
  permissionButtonText: {
    fontSize: SIZES.body,
    fontWeight: FONTS.bold,
  },
  cancelButton: {
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    borderWidth: 2,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: SIZES.body,
    fontWeight: FONTS.bold,
  },
});
