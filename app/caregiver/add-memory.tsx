import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, FlatList, Keyboard } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type FormItem = 
  | { type: 'image'; uri: string | null; onPick: () => void }
  | { type: 'input'; label: string; value: string; setter: (text: string) => void; placeholder: string; multiline?: boolean }
  | { type: 'spacer' };

export default function AddMemoryScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissionAndPickImage = () => {
    Alert.alert(
      "إذن الوصول للصور",
      "نحتاج للوصول إلى معرض الصور الخاص بك لاختيار صورة للذكرى. هل تود المتابعة؟",
      [
        { text: "إلغاء", style: "cancel" },
        { text: "موافق", onPress: pickImage }
      ]
    );
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('إذن الوصول مطلوب', 'نحتاج للوصول إلى صورك لنتمكن من إضافة صورة للذكرى.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name || !relation) {
      Alert.alert('تنبيه', 'الرجاء إدخال الاسم وصلة القرابة على الأقل.');
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user logged in");

      await addDoc(collection(db, "users", user.uid, "memoryBank"), {
        name,
        relation,
        description,
        imageUri: image,
        createdAt: new Date().toISOString(),
      });

      Alert.alert("نجاح", "تمت إضافة الذكرى بنجاح!", [
        { text: "حسناً", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error("Error adding memory: ", error);
      Alert.alert("خطأ", "حدثت مشكلة أثناء الحفظ.");
    } finally {
      setIsLoading(false);
    }
  };

  const formItems: FormItem[] = [
    { type: 'image', uri: image, onPick: requestPermissionAndPickImage },
    { type: 'input', label: 'الاسم الكامل', value: name, setter: setName, placeholder: 'مثلاً: علي أحمد' },
    { type: 'input', label: 'صلة القرابة', value: relation, setter: setRelation, placeholder: 'مثلاً: ابن، حفيد، صديق...' },
    { type: 'input', label: 'وصف أو قصة قصيرة (اختياري)', value: description, setter: setDescription, placeholder: 'اكتب شيئاً يساعد المريض على تذكر هذا الشخص...', multiline: true },
    { type: 'spacer' }
  ];

  const renderItem = ({ item }: { item: FormItem }) => {
    switch (item.type) {
      case 'image':
        return (
          <View style={styles.imageSection}>
            <TouchableOpacity style={styles.imagePicker} onPress={item.onPick} activeOpacity={0.7}>
              {item.uri ? (
                <Image source={{ uri: item.uri }} style={styles.selectedImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialCommunityIcons name="camera-plus-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.imagePlaceholderText}>أضف صورة الشخص</Text>
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
              style={[styles.input, item.multiline && styles.textArea]}
              value={item.value}
              onChangeText={item.setter}
              placeholder={item.placeholder}
              placeholderTextColor={COLORS.textMuted}
              multiline={item.multiline}
              numberOfLines={item.multiline ? 4 : 1}
              textAlign="right"
            />
          </View>
        );
      case 'spacer':
        return <View style={{ height: 50 }} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'إضافة ذكرى جديدة', headerTitleAlign: 'center' }} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <FlatList
          data={formItems}
          renderItem={renderItem}
          keyExtractor={(_, index) => `form-${index}`}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.saveButton, isLoading && styles.disabledButton]} 
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.textLight} />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={24} color={COLORS.textLight} style={{ marginLeft: 8 }} />
                <Text style={styles.saveButtonText}>حفظ في بنك الذاكرة</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  listContainer: { padding: SIZES.padding },
  imageSection: { alignItems: 'center', marginBottom: SIZES.padding },
  imagePicker: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  selectedImage: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center' },
  imagePlaceholderText: { color: COLORS.textMuted, fontSize: 12, marginTop: 8, fontWeight: FONTS.medium },
  inputWrapper: { marginBottom: SIZES.padding },
  label: { fontSize: SIZES.body, fontWeight: FONTS.bold, color: COLORS.textDark, marginBottom: SIZES.base, textAlign: 'right' },
  input: { 
    backgroundColor: COLORS.card, 
    padding: SIZES.padding * 0.75, 
    borderRadius: SIZES.radius, 
    fontSize: SIZES.body, 
    borderWidth: 1, 
    borderColor: COLORS.border,
    color: COLORS.textDark,
    textAlign: 'right'
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  footer: { padding: SIZES.padding, backgroundColor: COLORS.backgroundLight },
  saveButton: { 
    backgroundColor: COLORS.primary, 
    flexDirection: 'row-reverse',
    padding: SIZES.padding, 
    borderRadius: SIZES.radius, 
    alignItems: 'center', 
    justifyContent: 'center',
    elevation: 4,
  },
  disabledButton: { opacity: 0.7 },
  saveButtonText: { color: COLORS.textLight, fontSize: SIZES.h3, fontWeight: FONTS.bold },
});