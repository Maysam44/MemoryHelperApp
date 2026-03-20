// app/patient/memory-bank.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';
import { Audio } from 'expo-av';

interface Memory {
  id: string;
  name: string;
  relationship: string;
  imageUrl?: string;
  description?: string;
  audioUrl?: string; // رابط التسجيل الصوتي
  recordingDuration?: number; // مدة التسجيل بالثواني
}

const MemoryItem = ({
  item,
  dynamicColors,
  onPlayAudio,
  onEdit,
}: {
  item: Memory;
  dynamicColors: any;
  onPlayAudio: (audioUrl: string) => void;
  onEdit: (memory: Memory) => void;
}) => (
  <View
    style={[
      styles.memoryItem,
      { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border },
    ]}
  >
    {item.imageUrl && (
      <Image source={{ uri: item.imageUrl }} style={styles.memoryImage} />
    )}
    <View style={styles.memoryTextContainer}>
      <Text style={[styles.memoryName, { color: dynamicColors.textDark }]}>
        {item.name}
      </Text>
      <Text style={[styles.memoryRelationship, { color: dynamicColors.textMuted }]}>
        {item.relationship}
      </Text>
      {item.description && (
        <Text style={[styles.memoryDescription, { color: dynamicColors.textDark }]}>
          {item.description}
        </Text>
      )}

      {item.audioUrl && (
        <TouchableOpacity
          style={[
            styles.audioButton,
            { backgroundColor: COLORS.secondary + '20' },
          ]}
          onPress={() => onPlayAudio(item.audioUrl!)}
        >
          <MaterialCommunityIcons
            name="volume-high"
            size={16}
            color={COLORS.secondary}
          />
          <Text
            style={[
              styles.audioButtonText,
              { color: COLORS.secondary },
            ]}
          >
            استمع إلى الرسالة الصوتية ({item.recordingDuration || 0}ث)
          </Text>
        </TouchableOpacity>
      )}
    </View>

    <TouchableOpacity
      onPress={() => onEdit(item)}
      style={styles.editButton}
    >
      <MaterialCommunityIcons
        name="pencil"
        size={20}
        color={COLORS.primary}
      />
    </TouchableOpacity>
  </View>
);

export default function PatientMemoryBank() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  useEffect(() => {
    fetchMemories();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const fetchMemories = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
const q = query(collection(db, "families", user.uid, "people"));
        const querySnapshot = await getDocs(q);
        const fetchedMemories: Memory[] = [];
        querySnapshot.forEach((doc) => {
          fetchedMemories.push({ id: doc.id, ...doc.data() } as Memory);
        });
        setMemories(fetchedMemories);
      }
    } catch (error) {
      console.error('خطأ في جلب الذكريات:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error('خطأ في بدء التسجيل:', error);
      Alert.alert('خطأ', 'حدث خطأ في بدء التسجيل');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordingUri(uri);
      setIsRecording(false);
      setRecording(null);

      Alert.alert('نجاح', 'تم التسجيل بنجاح');
    } catch (error) {
      console.error('خطأ في إيقاف التسجيل:', error);
    }
  };

  const playAudio = async (audioUrl: string) => {
    try {
      if (isPlaying && sound) {
        await sound.stopAsync();
        setIsPlaying(false);
        return;
      }

      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('خطأ في تشغيل الصوت:', error);
      Alert.alert('خطأ', 'حدث خطأ في تشغيل الصوت');
    }
  };

  const saveMemoryWithAudio = async () => {
    if (!selectedMemory || !recordingUri) {
      Alert.alert('خطأ', 'يرجى التأكد من وجود تسجيل صوتي');
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        const updatedMemory: Memory = {
          ...selectedMemory,
          audioUrl: recordingUri,
          recordingDuration: Math.floor(
            (recording
              ? ((await recording.getStatusAsync()).durationMillis || 0)
              : 0) / 1000
          ),
        };

        await setDoc(
          doc(db, `families/${user.uid}/people`, selectedMemory.id),
          updatedMemory
        );

        setMemories(
          memories.map((m) =>
            m.id === selectedMemory.id ? updatedMemory : m
          )
        );

        setShowEditModal(false);
        setSelectedMemory(null);
        setRecordingUri(null);
        Alert.alert('نجاح', 'تم حفظ الرسالة الصوتية بنجاح');
      }
    } catch (error) {
      console.error('خطأ في حفظ الرسالة الصوتية:', error);
      Alert.alert('خطأ', 'حدث خطأ في حفظ الرسالة الصوتية');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: dynamicColors.backgroundLight }]}>
        <ActivityIndicator size="large" color={dynamicColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}
    >
      <Stack.Screen
        options={{
          title: 'بنك الذكريات',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: dynamicColors.backgroundLight },
          headerTitleStyle: { color: dynamicColors.textDark },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: SIZES.padding }}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={30}
                color={dynamicColors.textDark}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <FlatList
        data={memories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MemoryItem
            item={item}
            dynamicColors={dynamicColors}
            onPlayAudio={playAudio}
            onEdit={(memory) => {
              setSelectedMemory(memory);
              setShowEditModal(true);
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="brain"
              size={80}
              color={dynamicColors.textMuted}
            />
            <Text style={[styles.emptyText, { color: dynamicColors.textMuted }]}>
              لا توجد ذكريات لعرضها بعد.
            </Text>
          </View>
        }
      />

      <Modal
        visible={showEditModal}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            { backgroundColor: dynamicColors.backgroundLight },
          ]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <MaterialCommunityIcons
                name="close"
                size={28}
                color={dynamicColors.textDark}
              />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: dynamicColors.textDark }]}>
              إضافة رسالة صوتية
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {selectedMemory && (
              <>
                <Text
                  style={[
                    styles.selectedMemoryName,
                    { color: dynamicColors.textDark },
                  ]}
                >
                  {selectedMemory.name}
                </Text>

                <View
                  style={[
                    styles.recordingBox,
                    {
                      backgroundColor: dynamicColors.card,
                      borderColor: dynamicColors.border,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="microphone"
                    size={40}
                    color={COLORS.secondary}
                  />
                  <Text
                    style={[
                      styles.recordingText,
                      { color: dynamicColors.textDark },
                    ]}
                  >
                    {isRecording
                      ? 'جاري التسجيل...'
                      : recordingUri
                      ? 'تم التسجيل بنجاح'
                      : 'اضغط لتسجيل رسالة صوتية'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.recordButton,
                    {
                      backgroundColor: isRecording
                        ? COLORS.primary
                        : COLORS.secondary,
                    },
                  ]}
                  onPress={
                    isRecording ? stopRecording : startRecording
                  }
                >
                  <MaterialCommunityIcons
                    name={isRecording ? 'stop-circle' : 'microphone'}
                    size={24}
                    color="white"
                  />
                  <Text style={styles.recordButtonText}>
                    {isRecording ? 'إيقاف التسجيل' : 'بدء التسجيل'}
                  </Text>
                </TouchableOpacity>

                {recordingUri && (
                  <TouchableOpacity
                    style={[
                      styles.playButton,
                      { backgroundColor: COLORS.secondary + '20' },
                    ]}
                    onPress={() => playAudio(recordingUri)}
                  >
                    <MaterialCommunityIcons
                      name={isPlaying ? 'pause-circle' : 'play-circle'}
                      size={24}
                      color={COLORS.secondary}
                    />
                    <Text
                      style={[
                        styles.playButtonText,
                        { color: COLORS.secondary },
                      ]}
                    >
                      {isPlaying ? 'إيقاف' : 'استمع إلى الرسالة'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    { backgroundColor: COLORS.primary },
                  ]}
                  onPress={saveMemoryWithAudio}
                  disabled={!recordingUri}
                >
                  <MaterialCommunityIcons
                    name="check"
                    size={24}
                    color="white"
                  />
                  <Text style={styles.saveButtonText}>
                    حفظ الرسالة الصوتية
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: SIZES.padding },
  memoryItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    marginBottom: SIZES.padding,
  },
  memoryImage: {
    width: 80,
    height: 80,
    borderRadius: SIZES.radius,
    marginLeft: SIZES.padding,
  },
  memoryTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  memoryName: {
    fontSize: SIZES.h2,
    fontWeight: FONTS.bold,
    marginBottom: SIZES.base / 2,
  },
  memoryRelationship: {
    fontSize: SIZES.body,
    marginBottom: SIZES.base,
  },
  memoryDescription: {
    fontSize: SIZES.caption,
    textAlign: 'right',
    marginBottom: SIZES.base,
  },
  audioButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: SIZES.base,
    paddingVertical: SIZES.base / 2,
    borderRadius: SIZES.radius,
  },
  audioButtonText: {
    fontSize: SIZES.caption,
    fontWeight: FONTS.medium,
    marginRight: SIZES.base / 2,
  },
  editButton: {
    padding: SIZES.base,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.padding * 5,
  },
  emptyText: {
    fontSize: SIZES.body,
    marginTop: SIZES.padding,
    textAlign: 'center',
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.base,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: SIZES.h2,
    fontWeight: FONTS.bold,
  },
  modalContent: {
    padding: SIZES.padding,
    paddingBottom: 100,
  },
  selectedMemoryName: {
    fontSize: SIZES.h1,
    fontWeight: FONTS.bold,
    marginBottom: SIZES.padding,
    textAlign: 'center',
  },
  recordingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.padding * 2,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    marginBottom: SIZES.padding,
  },
  recordingText: {
    fontSize: SIZES.body,
    marginTop: SIZES.base,
    fontWeight: FONTS.medium,
  },
  recordButton: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.padding,
  },
  recordButtonText: {
    color: 'white',
    fontSize: SIZES.h2,
    fontWeight: FONTS.bold,
    marginLeft: SIZES.base,
  },
  playButton: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.padding,
  },
  playButtonText: {
    fontSize: SIZES.h2,
    fontWeight: FONTS.bold,
    marginLeft: SIZES.base,
  },
  saveButton: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES.padding,
    borderRadius: SIZES.radius,
    marginTop: SIZES.padding,
  },
  saveButtonText: {
    color: 'white',
    fontSize: SIZES.h2,
    fontWeight: FONTS.bold,
    marginLeft: SIZES.base,
  },
});
