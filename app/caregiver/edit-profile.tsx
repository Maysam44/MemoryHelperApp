import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { SIZES, FONTS } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../constants/ThemeContext';

export default function EditProfileScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [age, setAge] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setName(data.name || '');
            setRelationship(data.relationship || '');
            setAge(data.age?.toString() || '');
            setProfileImage(data.profileImage || null);
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('عذراً', 'نحتاج إلى أذونات معرض الصور لتغيير الصورة الشخصية.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
      // In a real app, you would upload this image to Firebase Storage here
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("خطأ", "يرجى إدخال الاسم.");
      return;
    }

    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "users", user.uid);
        await updateDoc(docRef, {
          name: name.trim(),
          relationship: relationship.trim(),
          age: age.trim() ? parseInt(age.trim()) : null,
          profileImage: profileImage,
        });
        Alert.alert("نجاح", "تم تحديث الملف الشخصي بنجاح.");
        router.back();
      }
    } catch (error) {
      Alert.alert("خطأ", "فشل تحديث الملف الشخصي.");
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
    }
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
        title: 'تعديل بياناتي', 
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: dynamicColors.backgroundLight },
        headerTitleStyle: { color: dynamicColors.textDark },
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: SIZES.padding }}>
            <MaterialCommunityIcons name="chevron-right" size={30} color={dynamicColors.textDark} />
          </TouchableOpacity>
        )
      }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImagePlaceholder, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border }]}>
                <MaterialCommunityIcons name="camera-plus" size={40} color={dynamicColors.textMuted} />
                <Text style={[styles.imagePickerText, { color: dynamicColors.textMuted }]}>أضف صورة</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>الاسم الكامل</Text>
            <TextInput
              style={[styles.input, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border, color: dynamicColors.textDark }]}
              value={name}
              onChangeText={setName}
              placeholder="أدخل اسمك هنا"
              placeholderTextColor={dynamicColors.textMuted}
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>صلة القرابة بالمريض</Text>
            <TextInput
              style={[styles.input, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border, color: dynamicColors.textDark }]}
              value={relationship}
              onChangeText={setRelationship}
              placeholder="مثال: ابن، ابنة، زوج..."
              placeholderTextColor={dynamicColors.textMuted}
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>العمر</Text>
            <TextInput
              style={[styles.input, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border, color: dynamicColors.textDark }]}
              value={age}
              onChangeText={setAge}
              placeholder="أدخل عمرك"
              placeholderTextColor={dynamicColors.textMuted}
              keyboardType="numeric"
              textAlign="right"
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: dynamicColors.primary }, isSaving && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <ActivityIndicator color={dynamicColors.textLight} /> : <Text style={[styles.saveButtonText, { color: dynamicColors.textLight }]}>حفظ التغييرات</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: SIZES.padding },
  imagePicker: {
    alignSelf: 'center',
    marginBottom: SIZES.padding * 2,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerText: {
    marginTop: SIZES.base,
    fontSize: SIZES.caption,
  },
  inputGroup: { marginBottom: SIZES.padding },
  label: { fontSize: SIZES.body, fontWeight: FONTS.bold, marginBottom: SIZES.base, textAlign: 'right' },
  input: { padding: SIZES.padding, borderRadius: SIZES.radius, borderWidth: 1, textAlign: 'right', fontSize: SIZES.body },
  saveButton: { padding: SIZES.padding, borderRadius: SIZES.radius, alignItems: 'center', marginTop: SIZES.padding },
  saveButtonText: { fontSize: SIZES.h3, fontWeight: FONTS.bold }
});