import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
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

  // حالات التسجيل الصوتي
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  const pickImage = async () => {
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

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('خطأ', 'يرجى منح إذن الوصول للميكروفون');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    setIsRecording(false);
    await recording?.stopAndUnloadAsync();
    const uri = recording?.getURI();
    setRecordingUri(uri || null);
    setRecording(null);
  }

  async function playRecordedAudio() {
    if (recordingUri) {
      const { sound } = await Audio.Sound.createAsync({ uri: recordingUri });
      setSound(sound);
      await sound.playAsync();
    }
  }

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
        // توحيد المسار إلى users/{uid}/memoryBank ليتوافق مع لوحة التحكم والتعديل
        await setDoc(doc(db, "users", user.uid, "memoryBank", personId), {
          id: personId,
          name,
          relation: relationship, // استخدام relation ليتوافق مع edit-memory
          description,
          imageUri: image, // استخدام imageUri ليتوافق مع dashboard و edit-memory
          audioUrl: recordingUri,
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
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
      <Stack.Screen options={{ title: 'إضافة شخص جديد', headerTitleAlign: 'center' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <TouchableOpacity style={[styles.imageContainer, { borderColor: dynamicColors.border }]} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <MaterialCommunityIcons name="camera-plus" size={40} color={dynamicColors.textMuted} />
                <Text style={{ color: dynamicColors.textMuted, marginTop: 10 }}>إضافة صورة</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>الاسم الكامل</Text>
            <TextInput
              style={[styles.input, { backgroundColor: dynamicColors.card, color: dynamicColors.textDark, borderColor: dynamicColors.border }]}
              value={name}
              onChangeText={setName}
              placeholder="مثال: أحمد محمد"
              placeholderTextColor={dynamicColors.textMuted}
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>صلة القرابة</Text>
            <TextInput
              style={[styles.input, { backgroundColor: dynamicColors.card, color: dynamicColors.textDark, borderColor: dynamicColors.border }]}
              value={relationship}
              onChangeText={setRelationship}
              placeholder="مثال: الابن الأكبر"
              placeholderTextColor={dynamicColors.textMuted}
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>وصف بسيط (اختياري)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: dynamicColors.card, color: dynamicColors.textDark, borderColor: dynamicColors.border, height: 80 }]}
              value={description}
              onChangeText={setDescription}
              placeholder="مثال: يحب لعب الشطرنج معك"
              placeholderTextColor={dynamicColors.textMuted}
              multiline
              textAlign="right"
            />
          </View>

          <View style={[styles.audioSection, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border }]}>
            <Text style={[styles.label, { color: dynamicColors.textDark, textAlign: 'center' }]}>سجل رسالة صوتية للمريض</Text>
            <View style={styles.audioButtonsRow}>
              <TouchableOpacity 
                style={[styles.audioBtn, { backgroundColor: isRecording ? '#FF5252' : COLORS.primary }]} 
                onPress={isRecording ? stopRecording : startRecording}
              >
                <MaterialCommunityIcons name={isRecording ? "stop" : "microphone"} size={24} color="white" />
                <Text style={styles.audioBtnText}>{isRecording ? "إيقاف" : "تسجيل"}</Text>
              </TouchableOpacity>

              {recordingUri && (
                <TouchableOpacity style={[styles.audioBtn, { backgroundColor: COLORS.secondary }]} onPress={playRecordedAudio}>
                  <MaterialCommunityIcons name="play" size={24} color="white" />
                  <Text style={styles.audioBtnText}>تشغيل</Text>
                </TouchableOpacity>
              )}
            </View>
            {recordingUri && <Text style={styles.successText}>✓ تم تسجيل الصوت بنجاح</Text>}
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
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, textAlign: 'right' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    textAlign: 'right',
  },
  audioSection: {
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 30,
    alignItems: 'center',
  },
  audioButtonsRow: { flexDirection: 'row-reverse', marginTop: 15 },
  audioBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginHorizontal: 5,
  },
  audioBtnText: { color: 'white', fontWeight: 'bold', marginRight: 8 },
  successText: { color: '#4CAF50', marginTop: 10, fontWeight: 'bold' },
  submitButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 15,
    marginBottom: 40,
  },
  submitButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
