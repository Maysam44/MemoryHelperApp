import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, FlatList, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type FormItem = 
  | { type: 'header'; title: string; icon: string }
  | { type: 'input'; label: string; value: string; setter: (text: string) => void; placeholder: string; keyboard?: 'default' | 'number-pad' }
  | { type: 'divider' }
  | { type: 'toggle'; label: string; value: 'early' | 'mid' | null; setter: (value: 'early' | 'mid') => void };

export default function InitialSetupScreen() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverRelationship, setCaregiverRelationship] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [memoryStage, setMemoryStage] = useState<'early' | 'mid' | null>(null);

  const formItems: FormItem[] = [
    { type: 'header', title: 'أولاً، بعض المعلومات عنك', icon: 'account-heart-outline' },
    { type: 'input', label: 'اسمك', value: caregiverName, setter: setCaregiverName, placeholder: 'مثال: علي' },
    { type: 'input', label: 'علاقتك بالشخص الذي ستساعده', value: caregiverRelationship, setter: setCaregiverRelationship, placeholder: 'مثال: ابن، ابنة...' },
    { type: 'divider' },
    { type: 'header', title: 'والآن، عن الشخص الذي ستساعده', icon: 'account-star-outline' },
    { type: 'input', label: 'اسمه', value: patientName, setter: setPatientName, placeholder: 'مثال: أبي أحمد' },
    { type: 'input', label: 'عمره (تقريبي)', value: patientAge, setter: setPatientAge, placeholder: 'مثال: 75', keyboard: 'number-pad' },
    { type: 'toggle', label: 'مرحلة ضعف الذاكرة الحالية', value: memoryStage, setter: setMemoryStage },
  ];

  const handleFinishSetup = async () => {
    if (!caregiverName || !caregiverRelationship || !patientName || !patientAge || !memoryStage) {
      Alert.alert('حقول ناقصة', 'الرجاء ملء جميع المعلومات للمتابعة.');
      return;
    }

    const ageNum = parseInt(patientAge);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
      Alert.alert('عمر غير صالح', 'الرجاء إدخال عمر صحيح.');
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
        caregiver: { name: caregiverName, relationship: caregiverRelationship },
        patient: { name: patientName, age: ageNum, stage: memoryStage },
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
      case 'input':
        return (
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>{item.label}</Text>
            <TextInput 
              style={styles.input} 
              value={item.value} 
              onChangeText={item.setter} 
              placeholder={item.placeholder} 
              keyboardType={item.keyboard || 'default'} 
              placeholderTextColor={COLORS.textMuted}
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
    inputWrapper: { marginBottom: SIZES.padding },
    label: { fontSize: SIZES.body, color: COLORS.textDark, marginBottom: SIZES.base, textAlign: 'right', fontWeight: FONTS.medium },
    input: { backgroundColor: COLORS.card, padding: SIZES.padding * 0.75, borderRadius: SIZES.radius, fontSize: SIZES.body, borderColor: COLORS.border, borderWidth: 1, textAlign: 'right', color: COLORS.textDark },
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