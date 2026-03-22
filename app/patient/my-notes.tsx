import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { collection, query, onSnapshot, doc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { Audio } from 'expo-av';

export default function MyNotesScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "users", user.uid, "patientNotes"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotes(fetchedNotes.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      const user = auth.currentUser;
      if (user) {
        await addDoc(collection(db, "users", user.uid, "patientNotes"), {
          text: newNote,
          type: 'text',
          createdAt: serverTimestamp()
        });
        setNewNote('');
      }
    } catch (error) {
      console.error("Error adding note:", error);
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    
    // في التطبيق الحقيقي سنقوم برفع الملف لـ S3 أو Firebase Storage
    // هنا سنحفظ المسار المحلي للتبسيط
    const user = auth.currentUser;
    if (user && uri) {
      await addDoc(collection(db, "users", user.uid, "patientNotes"), {
        audioUri: uri,
        type: 'audio',
        createdAt: serverTimestamp()
      });
      Alert.alert('تم الحفظ', 'تم حفظ رسالتك الصوتية بنجاح.');
    }
  };

  const deleteNote = async (id: string) => {
    Alert.alert('حذف الملاحظة', 'هل أنت متأكد من حذف هذه الملاحظة؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        const user = auth.currentUser;
        if (user) await deleteDoc(doc(db, "users", user.uid, "patientNotes", id));
      }}
    ]);
  };

  const playAudio = async (uri: string) => {
    const { sound } = await Audio.Sound.createAsync({ uri });
    await sound.playAsync();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'مفكرتي الخاصة', 
        headerTitleAlign: 'center',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 15 }}>
            <MaterialCommunityIcons name="arrow-right" size={32} color={COLORS.primary} />
          </TouchableOpacity>
        )
      }} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="اكتب شيئاً تود تذكره..."
            value={newNote}
            onChangeText={setNewNote}
            multiline
            textAlign="right"
          />
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} onPress={handleAddNote}>
              <MaterialCommunityIcons name="send" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: isRecording ? '#f44336' : COLORS.secondary }]} 
              onPress={isRecording ? stopRecording : startRecording}
            >
              <MaterialCommunityIcons name={isRecording ? "stop" : "microphone"} size={24} color="white" />
            </TouchableOpacity>
          </View>
          {isRecording && <Text style={styles.recordingText}>جاري التسجيل الآن... اضغط المربع للإيقاف</Text>}
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={notes}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.noteCard}>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteNote(item.id)}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color="#ff5252" />
                </TouchableOpacity>
                {item.type === 'text' ? (
                  <Text style={styles.noteText}>{item.text}</Text>
                ) : (
                  <TouchableOpacity style={styles.audioPlayBtn} onPress={() => playAudio(item.audioUri)}>
                    <MaterialCommunityIcons name="play-circle" size={40} color={COLORS.secondary} />
                    <Text style={styles.audioText}>رسالة صوتية مسجلة</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.dateText}>
                  {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString('ar-EG') : 'الآن'}
                </Text>
              </View>
            )}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  inputArea: { padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  input: { backgroundColor: '#f9f9f9', borderRadius: 15, padding: 15, fontSize: 18, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#eee' },
  actionRow: { flexDirection: 'row-reverse', justifyContent: 'flex-start', marginTop: 15 },
  actionBtn: { width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', marginLeft: 15, elevation: 3 },
  recordingText: { color: '#f44336', textAlign: 'center', marginTop: 10, fontWeight: 'bold' },
  list: { padding: 20 },
  noteCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  noteText: { fontSize: 18, color: '#333', textAlign: 'right', lineHeight: 26 },
  audioPlayBtn: { flexDirection: 'row-reverse', alignItems: 'center' },
  audioText: { fontSize: 18, color: COLORS.secondary, marginRight: 15, fontWeight: 'bold' },
  dateText: { fontSize: 12, color: '#999', marginTop: 10, textAlign: 'left' },
  deleteBtn: { position: 'absolute', left: 15, top: 15 },
});
