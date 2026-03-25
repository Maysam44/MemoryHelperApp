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
      console.log('=== QR Scan Started ===');
      
      // فك تشفير بيانات QR
      const qrParsed = parseQRData(data);
      console.log('QR Parsed:', qrParsed);

      if (!qrParsed || !qrParsed.caregiverId) {
        Alert.alert('خطأ', 'رمز QR غير صحيح. يرجى المحاولة مرة أخرى.');
        setIsScanning(true);
        setIsProcessing(false);
        return;
      }

      const caregiverId = qrParsed.caregiverId;
      console.log('Caregiver ID:', caregiverId);

      // الخطوة 1: التحقق من وجود مقدم الرعاية
      console.log('Step 1: Fetching caregiver data...');
      const caregiverDocRef = doc(db, 'users', caregiverId);
      const caregiverDocSnap = await getDoc(caregiverDocRef);

      if (!caregiverDocSnap.exists()) {
        Alert.alert('خطأ', 'مقدم الرعاية غير موجود. يرجى التحقق من الرمز.');
        setIsScanning(true);
        setIsProcessing(false);
        return;
      }

      const caregiverData = caregiverDocSnap.data() || {};
      console.log('Caregiver Data:', caregiverData);

      // الخطوة 2: التحقق من بيانات المريض
      console.log('Step 2: Checking patient data...');
      const patientData = caregiverData.patient || {};
      const patientName = patientData.name || caregiverData.patientName;

      if (!patientName) {
        Alert.alert('خطأ', 'مقدم الرعاية لم يقم بتعيين مريض بعد.');
        setIsScanning(true);
        setIsProcessing(false);
        return;
      }

      console.log('Patient Name:', patientName);

      // الخطوة 3: تسجيل الدخول المجهول
      console.log('Step 3: Authenticating user...');
      let currentUser = auth.currentUser;
      
      if (!currentUser) {
        try {
          const anonResult = await signInAnonymously(auth);
          currentUser = anonResult.user;
          console.log('Anonymous user created:', currentUser.uid);
        } catch (authError: any) {
          console.error('Auth Error:', authError);
          Alert.alert(
            'خطأ في المصادقة',
            `فشل تسجيل الدخول. الكود: ${authError?.code || 'UNKNOWN'}\n\nالرسالة: ${authError?.message || 'خطأ غير معروف'}`
          );
          setIsScanning(true);
          setIsProcessing(false);
          return;
        }
      } else {
        console.log('Using existing user:', currentUser.uid);
      }

      // الخطوة 4: حفظ بيانات المريض
      console.log('Step 4: Saving patient document...');
      const patientDocRef = doc(db, 'users', currentUser.uid);

      try {
        const patientDocSnap = await getDoc(patientDocRef);

        if (patientDocSnap.exists()) {
          console.log('Updating existing patient document...');
          await updateDoc(patientDocRef, {
            caregiverId: caregiverId,
            role: 'patient',
            linkedAt: new Date().toISOString(),
          });
        } else {
          console.log('Creating new patient document...');
          await setDoc(patientDocRef, {
            caregiverId: caregiverId,
            role: 'patient',
            linkedAt: new Date().toISOString(),
            displayName: patientName || 'المريض',
          });
        }
        console.log('Patient document saved successfully');
      } catch (firestoreError: any) {
        console.error('Firestore Error:', firestoreError);
        Alert.alert(
          'خطأ في حفظ البيانات',
          `فشل حفظ بيانات المريض. الكود: ${firestoreError?.code || 'UNKNOWN'}\n\nالرسالة: ${firestoreError?.message || 'خطأ غير معروف'}`
        );
        setIsScanning(true);
        setIsProcessing(false);
        return;
      }

      // الخطوة 5: تحديث بيانات مقدم الرعاية
      console.log('Step 5: Updating caregiver document...');
      try {
        await updateDoc(caregiverDocRef, {
          patientId: currentUser.uid,
        });
        console.log('Caregiver document updated successfully');
      } catch (updateError: any) {
        console.error('Update Error:', updateError);
        // لا نوقف العملية هنا لأن المريض تم ربطه بنجاح
        console.log('Warning: Could not update caregiver document, but patient linking succeeded');
      }

      console.log('=== QR Scan Completed Successfully ===');

      Alert.alert('نجح!', 'تم ربطك بنجاح مع مقدم الرعاية.', [
        {
          text: 'متابعة',
          onPress: () => {
            router.replace('/patient/dashboard');
          },
        },
      ]);
    } catch (error: any) {
      console.error('=== CRITICAL ERROR ===');
      console.error('Error:', error);
      console.error('Error Code:', error?.code);
      console.error('Error Message:', error?.message);
      console.error('Full Stack:', error?.stack);

      let errorTitle = 'خطأ في المعالجة';
      let errorMessage = `حدث خطأ غير متوقع. الكود: ${error?.code || 'UNKNOWN'}\n\nالتفاصيل: ${error?.message || 'لا توجد تفاصيل متاحة'}`;

      Alert.alert(errorTitle, errorMessage);
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
