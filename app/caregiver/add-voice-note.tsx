import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { doc, setDoc, collection } from 'firebase/firestore';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';
import { Audio } from 'expo-av';

export default function AddVoiceNoteScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  
  const [title, setTitle] = useState('');
  const [sender, setSender] = useState('');
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

  const handleAddVoiceNote = async () => {
    if (!recordingUri || !title.trim()) {
      Alert.alert('خطأ', 'يرجى تسجيل الصوت وإدخال عنوان للرسالة');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const noteId = Date.now().toString();
        const newNote = {
          id: noteId,
          title,
          sender: sender || "أحد أفراد العائلة",
          audioUrl: recordingUri,
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, "families", user.uid, "voice_messages", noteId), newNote);

        Alert.alert('تم بنجاح', 'تم إرسال الرسالة الصوتية للمريض');
        router.back();
      }
    } catch (error) {
      console.error("Error adding voice note:", error);
      Alert.alert('خطأ', 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
      <Stack.Screen options={{ title: 'إرسال رسالة صوتية', headerTitleAlign: 'center' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={[styles.audioBox, { backgroundColor: isRecording ? '#FF525215' : COLORS.primary + '10', borderColor: isRecording ? '#FF5252' : COLORS.primary }]}>
            <MaterialCommunityIcons name={isRecording ? "microphone-pulse" : "microphone"} size={60} color={isRecording ? '#FF5252' : COLORS.primary} />
            <Text style={[styles.audioTitle, { color: isRecording ? '#FF5252' : COLORS.primary }]}>{isRecording ? "جاري التسجيل..." : "سجل رسالة حنونة"}</Text>
            
            <View style={styles.audioButtonsRow}>
              <TouchableOpacity 
                style={[styles.audioBtn, { backgroundColor: isRecording ? '#FF5252' : COLORS.primary }]} 
                onPress={isRecording ? stopRecording : startRecording}
              >
                <MaterialCommunityIcons name={isRecording ? "stop" : "microphone"} size={24} color="white" />
                <Text style={styles.audioBtnText}>{isRecording ? "إيقاف" : "بدء التسجيل"}</Text>
              </TouchableOpacity>

              {recordingUri && !isRecording && (
                <TouchableOpacity style={[styles.audioBtn, { backgroundColor: COLORS.secondary }]} onPress={playRecordedAudio}>
                  <MaterialCommunityIcons name="play" size={24} color="white" />
                  <Text style={styles.audioBtnText}>تشغيل</Text>
                </TouchableOpacity>
              )}
            </View>
            {recordingUri && !isRecording && <Text style={styles.successText}>✓ تم تسجيل الصوت بنجاح</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>عنوان الرسالة *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: dynamicColors.card, color: dynamicColors.textDark, borderColor: dynamicColors.border }]}
              value={title}
              onChangeText={setTitle}
              placeholder="مثال: رسالة صباحية من مريم"
              placeholderTextColor={dynamicColors.textMuted}
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: dynamicColors.textDark }]}>اسم المرسل</Text>
            <TextInput
              style={[styles.input, { backgroundColor: dynamicColors.card, color: dynamicColors.textDark, borderColor: dynamicColors.border }]}
              value={sender}
              onChangeText={setSender}
              placeholder="مثال: مريم (ابنتك)"
              placeholderTextColor={dynamicColors.textMuted}
              textAlign="right"
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: COLORS.primary, opacity: isSubmitting || !recordingUri ? 0.7 : 1 }]} 
            onPress={handleAddVoiceNote}
            disabled={isSubmitting || !recordingUri}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialCommunityIcons name="send" size={24} color="white" style={{ marginLeft: 10 }} />
                <Text style={styles.submitButtonText}>إرسال الرسالة الآن</Text>
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
  audioBox: {
    padding: 40,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: 30,
    borderStyle: 'dashed',
  },
  audioTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 15 },
  audioButtonsRow: { flexDirection: 'row-reverse', marginTop: 25 },
  audioBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    marginHorizontal: 8,
    elevation: 2,
  },
  audioBtnText: { color: 'white', fontWeight: 'bold', marginRight: 8 },
  successText: { color: '#4CAF50', marginTop: 15, fontWeight: 'bold' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, textAlign: 'right' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    textAlign: 'right',
  },
  submitButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 15,
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
