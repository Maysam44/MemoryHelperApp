import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';
import { Audio } from 'expo-av';

export default function AddPersonScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('إذن الصور مطلوب', 'نحتاج للوصول للصور لاختيار صورة الذكرى.', [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'الإعدادات', onPress: () => Linking.openSettings() }
      ]);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleAddPerson = async () => {
    if (!name || !relationship) {
      Alert.alert('خطأ', 'يرجى إدخال الاسم وصلة القرابة على الأقل');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      if (user) {
          const personId = Date.now().toString();
        await setDoc(doc(db, "users", user.uid, "memoryBank", personId), {
          id: personId,
          name,
          relation: relationship,
          description,
          imageUri: image,
          createdAt: new Date().toISOString(),
        });

        Alert.alert('تم بنجاح', 'تمت إضافة الشخص إلى بنك الذكريات');
        router.back();
      }
    } catch (error) {
      console.error("Error adding person:", error);
      Alert.alert('خطأ', 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8F9FD' }]}>
      <Stack.Screen options={{ title: 'إضافة شخص جديد', headerTitleAlign: 'center' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <TouchableOpacity style={[styles.imageContainer, { borderColor: COLORS.primary + '30' }]} onPress={pickImage} activeOpacity={0.8}>
            {image ? (
              <Image source={{ uri: image }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <MaterialCommunityIcons name="camera-plus" size={45} color={COLORS.primary} />
                <Text style={{ color: COLORS.primary, marginTop: 10, fontWeight: 'bold' }}>إضافة صورة</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>الاسم الكامل</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="مثال: أحمد محمد"
              placeholderTextColor="#999"
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>صلة القرابة</Text>
            <TextInput
              style={styles.input}
              value={relationship}
              onChangeText={setRelationship}
              placeholder="مثال: الام ،صديق"
              placeholderTextColor="#999"
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>وصف بسيط (اختياري)</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              placeholder="مثال: يحب لعب الشطرنج معك"
              placeholderTextColor="#999"
              multiline
              textAlign="right"
            />
          </View>



          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: COLORS.primary, opacity: isSubmitting ? 0.7 : 1 }]} 
            onPress={handleAddPerson}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={24} color="white" style={{ marginLeft: 10 }} />
                <Text style={styles.submitButtonText}>حفظ في بنك الذكريات</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  imageContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'right', color: COLORS.textDark },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 15,
    padding: 18,
    fontSize: 16,
    textAlign: 'right',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  audioSection: {
    padding: 25,
    borderRadius: 25,
    backgroundColor: 'white',
    marginBottom: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
  },
  audioButtonsRow: { flexDirection: 'row-reverse', marginTop: 10 },
  audioBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    marginHorizontal: 8,
    elevation: 3,
  },
  audioBtnText: { color: 'white', fontWeight: 'bold', marginRight: 8 },
  successText: { color: '#4CAF50', marginTop: 15, fontWeight: 'bold' },
  submitButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 20,
    marginBottom: 40,
    elevation: 5,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  submitButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
