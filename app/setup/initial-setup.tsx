import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, FlatList, ActivityIndicator, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

type FormItem = 
  | { type: 'header'; title: string; icon: string }
  | { type: 'image-picker'; label: string; value: string | null; setter: (uri: string) => void }
  | { type: 'input'; label: string; value: string; setter: (text: string) => void; placeholder: string; keyboard?: 'default' | 'number-pad'; multiline?: boolean }
  | { type: 'divider' }
  | { type: 'toggle'; label: string; value: 'early' | 'mid' | 'late' | null; setter: (value: 'early' | 'mid' | 'late') => void };

export default function InitialSetupScreen() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  
  // بيانات مقدم الرعاية
  const [caregiverImage, setCaregiverImage] = useState<string | null>(null);
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverRelationship, setCaregiverRelationship] = useState('');
  
  // بيانات المريض
  const [patientImage, setPatientImage] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientLikes, setPatientLikes] = useState('');
  const [patientJob, setPatientJob] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [memoryStage, setMemoryStage] = useState<'early' | 'mid' | 'late' | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState('');

  const pickImage = async (setter: (uri: string) => void) => {
    Alert.alert(
      'طلب إذن الوصول للمعرض',
      'نحتاج لإذنك للوصول لمعرض الصور لاختيار صورتك.',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'السماح',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('عذراً', 'لم يتم منح إذن الوصول للمعرض. يمكنك تفعيله من إعدادات التطبيق.');
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.5,
            });

            if (!result.canceled) {
              setter(result.assets[0].uri);
            }
          },
        },
      ]
    );
  };

  const formItems: FormItem[] = [
    { type: 'header', title: 'أولاً، معلومات مقدم الرعاية', icon: 'account-heart-outline' },
    { type: 'image-picker', label: 'صورتك الشخصية', value: caregiverImage, setter: setCaregiverImage },
    { type: 'input', label: 'اسمك الكامل', value: caregiverName, setter: setCaregiverName, placeholder: 'مثال: أحمد علي' },
    { type: 'input', label: 'علاقتك بالمريض', value: caregiverRelationship, setter: setCaregiverRelationship, placeholder: 'مثال: اب ، ابن ، ممرض...' },
    
    { type: 'divider' },
    
    { type: 'header', title: 'ثانياً، معلومات الشخص العزيز (المريض)', icon: 'account-star-outline' },
    { type: 'image-picker', label: 'صورة المريض', value: patientImage, setter: setPatientImage },
    { type: 'input', label: 'اسم المريض', value: patientName, setter: setPatientName, placeholder: 'مثال:  محمد' },
    { type: 'input', label: 'ماذا يحب؟', value: patientLikes, setter: setPatientLikes, placeholder: 'مثال: القهوة، المشي، القرآن...' },
    { type: 'input', label: 'وظيفته السابقة/الحالية', value: patientJob, setter: setPatientJob, placeholder: 'مثال:طالب ، معلم متقاعد' },
    { type: 'input', label: 'العمر', value: patientAge, setter: setPatientAge, placeholder: 'مثال:20 ، 75', keyboard: 'number-pad' },
    { type: 'toggle', label: 'مرحلة ضعف الذاكرة', value: memoryStage, setter: setMemoryStage },
    { type: 'input', label: 'معلومات إضافية تهمنا', value: additionalInfo, setter: setAdditionalInfo, placeholder: 'أي ملاحظات أخرى تود إضافتها...', multiline: true },
  ];

  const handleFinishSetup = async () => {
    if (!caregiverName || !caregiverRelationship || !patientName || !patientAge || !memoryStage) {
      Alert.alert('حقول ناقصة', 'الرجاء ملء المعلومات الأساسية للمتابعة (الأسماء، العمر، والمرحلة).');
      return;
    }

    const ageNum = parseInt(patientAge);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
      Alert.alert('عمر غير صالح', 'الرجاء إدخال عمر صحيح للمريض.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('خطأ', 'لم يتم العثور على مستخدم.');
      return;
    }

    setIsSaving(true);
    try {
      const setupData = {
        caregiver: { 
          name: caregiverName, 
          relationship: caregiverRelationship,
          profileImage: caregiverImage 
        },
        patient: { 
          name: patientName, 
          age: ageNum, 
          stage: memoryStage,
          likes: patientLikes,
          job: patientJob,
          profileImage: patientImage,
          additionalInfo: additionalInfo
        },
        createdAt: new Date(),
      };
      await setDoc(doc(db, "users", user.uid), setupData);
      router.replace('/caregiver/dashboard');
    } catch (error) {
      console.error("Error saving setup data: ", error);
      Alert.alert('خطأ في الحفظ', 'حدث خطأ أثناء حفظ البيانات.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderItem = ({ item }: { item: FormItem }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={styles.headerContainer}>
            <MaterialCommunityIcons name={item.icon as any} size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{item.title}</Text>
          </View>
        );
      case 'image-picker':
        return (
          <View style={styles.imagePickerWrapper}>
            <Text style={styles.label}>{item.label}</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage(item.setter)}>
              {item.value ? (
                <Image source={{ uri: item.value }} style={styles.previewImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialCommunityIcons name="camera-plus-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.placeholderText}>اضغط لإضافة صورة</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        );
      case 'input':
        return (
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>{item.label}</Text>
            <TextInput 
              style={[styles.input, item.multiline && styles.multilineInput]} 
              value={item.value} 
              onChangeText={item.setter} 
              placeholder={item.placeholder} 
              keyboardType={item.keyboard || 'default'} 
              placeholderTextColor={COLORS.textMuted}
              multiline={item.multiline}
              numberOfLines={item.multiline ? 3 : 1}
            />
          </View>
        );
      case 'divider':
        return <View style={styles.divider} />;
      case 'toggle':
        return (
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>{item.label}</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity 
                style={[styles.toggleButton, item.value === 'early' && styles.toggleButtonActive]} 
                onPress={() => item.setter('early')}
              >
                <Text style={[styles.toggleText, item.value === 'early' && styles.toggleTextActive]}>مبكرة</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleButton, item.value === 'mid' && styles.toggleButtonActive]} 
                onPress={() => item.setter('mid')}
              >
                <Text style={[styles.toggleText, item.value === 'mid' && styles.toggleTextActive]}>متوسطة</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleButton, item.value === 'late' && styles.toggleButtonActive]} 
                onPress={() => item.setter('late')}
              >
                <Text style={[styles.toggleText, item.value === 'late' && styles.toggleTextActive]}>متأخرة</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'الإعداد الأولي', headerBackVisible: false }} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <FlatList
          data={formItems}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.type}-${index}`}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.finishButton, isSaving && styles.disabledButton]} 
            onPress={handleFinishSetup}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.textLight} />
            ) : (
              <Text style={styles.finishButtonText}>إنهاء الإعداد والبدء</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundLight },
    listContainer: { paddingHorizontal: SIZES.padding, paddingTop: SIZES.padding, paddingBottom: 20 },
    headerContainer: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: SIZES.padding },
    sectionTitle: { fontSize: SIZES.h3, fontWeight: FONTS.bold, color: COLORS.primary, marginRight: SIZES.base, textAlign: 'right' },
    imagePickerWrapper: { marginBottom: SIZES.padding, alignItems: 'center' },
    imagePicker: { width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
    previewImage: { width: '100%', height: '100%' },
    imagePlaceholder: { alignItems: 'center' },
    placeholderText: { fontSize: 12, color: COLORS.textMuted, marginTop: 5 },
    inputWrapper: { marginBottom: SIZES.padding },
    label: { fontSize: SIZES.body, color: COLORS.textDark, marginBottom: SIZES.base, textAlign: 'right', fontWeight: FONTS.medium },
    input: { backgroundColor: COLORS.card, padding: SIZES.padding * 0.75, borderRadius: SIZES.radius, fontSize: SIZES.body, borderColor: COLORS.border, borderWidth: 1, textAlign: 'right', color: COLORS.textDark },
    multilineInput: { height: 100, textAlignVertical: 'top', paddingTop: SIZES.padding * 0.75 },
    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SIZES.padding, opacity: 0.5 },
    toggleContainer: { flexDirection: 'row-reverse', justifyContent: 'space-around' },
    toggleButton: { flex: 1, padding: SIZES.padding * 0.75, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', marginHorizontal: SIZES.base / 2, backgroundColor: COLORS.card },
    toggleButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    toggleText: { fontSize: SIZES.body, color: COLORS.textDark },
    toggleTextActive: { color: COLORS.textLight, fontWeight: FONTS.bold },
    footer: { padding: SIZES.padding, backgroundColor: COLORS.backgroundLight },
    finishButton: { backgroundColor: COLORS.secondary, padding: SIZES.padding, borderRadius: SIZES.radius, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
    disabledButton: { opacity: 0.7 },
    finishButtonText: { color: COLORS.textLight, fontSize: SIZES.h3, fontWeight: FONTS.bold },
});
