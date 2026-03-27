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
      
      // ===== الخطوة 1: فك تشفير بيانات QR =====
      let qrParsed;
      try {
        qrParsed = parseQRData(data);
        console.log('✓ Step 1 Success: QR Parsed', qrParsed);
      } catch (err: any) {
        console.error('✗ Step 1 Failed: QR Parse Error', err);
        Alert.alert('خطأ في الخطوة 1', `فشل فك تشفير الرمز: ${err?.message || 'خطأ غير معروف'}`);
        setIsScanning(true);
        setIsProcessing(false);
        return;
      }

      if (!qrParsed || !qrParsed.caregiverId) {
        Alert.alert('خطأ', 'رمز QR غير صحيح. يرجى المحاولة مرة أخرى.');
        setIsScanning(true);
        setIsProcessing(false);
        return;
      }

      const caregiverId = qrParsed.caregiverId;
      console.log('Caregiver ID:', caregiverId);

      // ===== الخطوة 2: جلب بيانات مقدم الرعاية =====
      let caregiverDocSnap;
      try {
        const caregiverDocRef = doc(db, 'users', caregiverId);
        caregiverDocSnap = await getDoc(caregiverDocRef);
        console.log('✓ Step 2 Success: Caregiver document fetched');
      } catch (err: any) {
        console.error('✗ Step 2 Failed: Fetch Caregiver Error', err);
        Alert.alert('خطأ في الخطوة 2', `فشل جلب بيانات مقدم الرعاية: ${err?.code || err?.message || 'خطأ غير معروف'}`);
        setIsScanning(true);
        setIsProcessing(false);
        return;
      }

      if (!caregiverDocSnap.exists()) {
        Alert.alert('خطأ', 'مقدم الرعاية غير موجود. يرجى التحقق من الرمز.');
        setIsScanning(true);
        setIsProcessing(false);
        return;
      }

      // ===== الخطوة 3: استخراج بيانات المريض =====
      let caregiverData;
      let patientName;
      try {
        caregiverData = caregiverDocSnap.data() || {};
        console.log('Caregiver Data:', caregiverData);
        
        const patientData = caregiverData.patient || {};
        patientName = patientData.name || caregiverData.patientName;
        console.log('✓ Step 3 Success: Patient name extracted', patientName);
      } catch (err: any) {
        console.error('✗ Step 3 Failed: Extract Patient Data Error', err);
        Alert.alert('خطأ في الخطوة 3', `فشل استخراج بيانات المريض: ${err?.message || 'خطأ غير معروف'}`);
        setIsScanning(true);
        setIsProcessing(false);
        return;
      }

      if (!patientName) {
        Alert.alert('خطأ', 'مقدم الرعاية لم يقم بتعيين مريض بعد.');
        setIsScanning(true);
        setIsProcessing(false);
        return;
      }

      // ===== الخطوة 4: تسجيل الدخول المجهول =====
      let currentUser;
      try {
        currentUser = auth.currentUser;
        if (!currentUser) {
          const anonResult = await signInAnonymously(auth);
          currentUser = anonResult.user;
          console.log('✓ Step 4 Success: Anonymous user created', currentUser.uid);
        } else {
          console.log('✓ Step 4 Success: Using existing user', currentUser.uid);
        }
      } catch (err: any) {
        console.error('✗ Step 4 Failed: Auth Error', err);
        Alert.alert('خطأ في الخطوة 4', `فشل تسجيل الدخول: ${err?.code || err?.message || 'خطأ غير معروف'}`);
        setIsScanning(true);
        setIsProcessing(false);
        return;
      }

      // ===== الخطوة 5: حفظ بيانات المريض =====
      try {
        const patientDocRef = doc(db, 'users', currentUser.uid);
        const patientDocSnap = await getDoc(patientDocRef);

        // تجهيز بيانات المريض من وثيقة مقدم الرعاية لضمان المزامنة
        const patientDataToSync = {
          caregiverId: caregiverId,
          role: 'patient',
          linkedAt: new Date().toISOString(),
          // نسخ الكائن بالكامل إذا وجد
          patient: caregiverData.patient || {
            name: patientName || 'المريض',
            age: caregiverData.patientAge || null,
            stage: caregiverData.patientStage || null
          },
          // للحفاظ على التوافق مع الحقول القديمة
          patientName: patientName || caregiverData.patientName || 'المريض',
          patientAge: caregiverData.patientAge || (caregiverData.patient ? caregiverData.patient.age : null),
          patientStage: caregiverData.patientStage || (caregiverData.patient ? caregiverData.patient.stage : null),
          displayName: patientName || 'المريض',
        };

        if (patientDocSnap.exists()) {
          await updateDoc(patientDocRef, patientDataToSync);
          console.log('✓ Step 5a Success: Patient document updated with full data');
        } else {
          await setDoc(patientDocRef, patientDataToSync);
          console.log('✓ Step 5b Success: Patient document created with full data');
        }
      } catch (err: any) {
        console.error('✗ Step 5 Failed: Save Patient Error', err);
        Alert.alert('خطأ في الخطوة 5', `فشل حفظ بيانات المريض: ${err?.code || err?.message || 'خطأ غير معروف'}`);
        setIsScanning(true);
        setIsProcessing(false);
        return;
      }

      // ===== الخطوة 6: تحديث بيانات مقدم الرعاية =====
      try {
        const caregiverDocRef = doc(db, 'users', caregiverId);
        await updateDoc(caregiverDocRef, {
          patientId: currentUser.uid,
        });
        console.log('✓ Step 6 Success: Caregiver document updated');
      } catch (err: any) {
        console.error('⚠ Step 6 Warning: Update Caregiver Error (non-critical)', err);
        // لا نوقف العملية هنا لأن المريض تم ربطه بنجاح
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
      console.error('=== UNEXPECTED ERROR ===');
      console.error('Error:', error);
      console.error('Error Code:', error?.code);
      console.error('Error Message:', error?.message);
      console.error('Full Stack:', error?.stack);

      Alert.alert(
        'خطأ غير متوقع',
        `حدث خطأ غير متوقع.\n\nالكود: ${error?.code || 'UNKNOWN'}\n\nالرسالة: ${error?.message || 'لا توجد تفاصيل'}`
      );
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
