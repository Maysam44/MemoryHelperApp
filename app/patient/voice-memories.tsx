import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { auth, db } from '../../firebaseConfig';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { Audio } from 'expo-av';
import { COLORS, SIZES } from '../../constants/theme';

export default function VoiceMemoriesScreen() {
  const [voices, setVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    fetchVoices();
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, []);

  const fetchVoices = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userDoc = await getDocs(collection(db, 'users'));
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        const userData = userSnap.data();
        
        const targetCaregiverId = userData?.caregiverId || user.uid;

        const q = query(collection(db, "families", targetCaregiverId, "voice_messages"));
        const snap = await getDocs(q);
        setVoices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching voices:', error);
      }
    }
    setLoading(false);
  };

  // Haptic Feedback
  const triggerHaptic = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Haptic error:", error);
    }
  };

  const playVoice = async (uri: string, id: string, senderName?: string) => {
    triggerHaptic();
    
    if (playingId === id) {
      await sound?.stopAsync();
      setPlayingId(null);
      return;
    }
    
    if (sound) await sound.unloadAsync();
    


    const { sound: newSound } = await Audio.Sound.createAsync({ uri });
    setSound(newSound);
    setPlayingId(id);
    await newSound.playAsync();
    newSound.setOnPlaybackStatusUpdate((s: any) => { if (s.didJustFinish) setPlayingId(null); });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>جاري تحميل الرسائل...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>رسائل أحبابي الصوتية</Text>
        <MaterialCommunityIcons name="microphone" size={40} color={COLORS.primary} />
      </View>

      <View style={styles.noteContainer}>
        <MaterialCommunityIcons name="information-outline" size={24} color={COLORS.primary} />
        <Text style={styles.noteText}>اضغط على الرسالة لسماع صوت أحبائك</Text>
      </View>

      {voices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="inbox-multiple" size={100} color="#ccc" />
          <Text style={styles.emptyText}>لا توجد رسائل صوتية حالياً</Text>
        </View>
      ) : (
        <FlatList
          data={voices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[
                styles.giantVoiceCard, 
                { 
                  borderColor: playingId === item.id ? COLORS.primary : '#eee',
                  backgroundColor: playingId === item.id ? COLORS.primary + '10' : 'white'
                }
              ]}
              onPress={() => playVoice(item.audioUrl, item.id, item.sender)}
              activeOpacity={0.7}
            >
              <View style={[styles.giantIconCircle, { backgroundColor: playingId === item.id ? COLORS.primary : COLORS.primary + '15' }]}>
                <MaterialCommunityIcons 
                  name={playingId === item.id ? "pause-circle" : "play-circle"} 
                  size={50} 
                  color={playingId === item.id ? 'white' : COLORS.primary}
                />
              </View>
              <View style={styles.giantVoiceInfo}>
                <Text style={styles.giantVoiceTitle}>{item.title || "رسالة جديدة"}</Text>
                <Text style={styles.giantVoiceSubText}>من: {item.sender || "أحد أفراد العائلة"}</Text>
                {playingId === item.id && (
                  <Text style={styles.playingIndicator}>جاري التشغيل...</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 20, fontSize: 18, color: '#666' },
  headerContainer: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 25, 
    paddingHorizontal: 20,
    backgroundColor: 'white',
    elevation: 3,
  },
  header: { fontSize: 28, fontWeight: 'bold', color: '#333', marginRight: 15 },
  noteContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '10',
    padding: 15,
    margin: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  noteText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginRight: 10,
    textAlign: 'right',
  },
  listContent: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  giantVoiceCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 30,
    marginBottom: 20,
    borderWidth: 2,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    minHeight: 140,
  },
  giantIconCircle: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 20,
    elevation: 3,
  },
  giantVoiceInfo: { flex: 1, alignItems: 'flex-end' },
  giantVoiceTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  giantVoiceSubText: { fontSize: 18, color: '#666', marginTop: 8 },
  playingIndicator: { fontSize: 16, color: COLORS.primary, fontWeight: 'bold', marginTop: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 20, color: '#999', marginTop: 20, textAlign: 'center' },
});
