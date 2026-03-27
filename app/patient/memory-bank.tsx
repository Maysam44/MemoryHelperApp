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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';
import { Audio } from 'expo-av';

interface Memory {
  id: string;
  name: string;
  relation: string;
  imageUri?: string;
  description?: string;
  audioUrl?: string;
}

const MemoryItem = ({
  item,
  dynamicColors,
  onPlayAudio,
}: {
  item: Memory;
  dynamicColors: any;
  onPlayAudio: (audioUrl: string) => void;
}) => (
  <View
    style={[
      styles.memoryItem,
      { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border },
    ]}
  >
    {item.imageUri ? (
      <Image source={{ uri: item.imageUri }} style={styles.memoryImage} />
    ) : (
      <View style={[styles.memoryImage, { backgroundColor: dynamicColors.backgroundLight, justifyContent: 'center', alignItems: 'center' }]}>
        <MaterialCommunityIcons name="account" size={60} color={dynamicColors.textMuted} />
      </View>
    )}
    <View style={styles.memoryTextContainer}>
      <Text style={[styles.memoryName, { color: dynamicColors.textDark }]}>
        {item.name}
      </Text>
      <Text style={[styles.memoryRelationship, { color: dynamicColors.textMuted }]}>
        {item.relation}
      </Text>
      {item.description && (
        <Text style={[styles.memoryDescription, { color: dynamicColors.textDark }]}>
          {item.description}
        </Text>
      )}


    </View>
  </View>
);

export default function PatientMemoryBank() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let unsubscribe: () => void;

    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // 1. الحصول على معرف مقدم الرعاية المرتبط
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        
        // إذا كان المستخدم هو المريض المرتبط، نستخدم caregiverId
        // أما إذا كان مقدم الرعاية نفسه في "عالم المريض"، نستخدم uid الخاص به
        const targetCaregiverId = userData?.caregiverId || user.uid;

        // 2. جلب الذكريات من مستند مقدم الرعاية
        const memoriesRef = collection(db, "users", targetCaregiverId, "memoryBank");
        const q = query(memoriesRef, orderBy("createdAt", "desc"));

        unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedMemories: Memory[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Memory));
          setMemories(fetchedMemories);
          setIsLoading(false);
        }, (error) => {
          console.error('Error fetching memories:', error);
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Error in fetchData:', error);
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      if (unsubscribe) unsubscribe();
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

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
      console.error('Error playing audio:', error);
      Alert.alert('خطأ', 'حدث خطأ في تشغيل الصوت');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: dynamicColors.backgroundLight }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
          headerTitleStyle: { color: dynamicColors.textDark, fontWeight: 'bold' },
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: SIZES.padding, paddingBottom: 40 },
  memoryItem: {
    flexDirection: 'row-reverse',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  memoryImage: {
    width: 120,
    height: '100%',
    minHeight: 120,
  },
  memoryTextContainer: {
    flex: 1,
    padding: 15,
    alignItems: 'flex-end',
  },
  memoryName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  memoryRelationship: {
    fontSize: 16,
    marginBottom: 8,
  },
  memoryDescription: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'right',
    marginBottom: 12,
  },
  audioButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
  },
  audioButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
  },
});
