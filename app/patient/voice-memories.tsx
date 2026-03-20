// app/patient/voice-memories.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { collection, query, getDocs } from 'firebase/firestore';
import { Audio } from 'expo-av';
import { COLORS, SIZES } from '../../constants/theme';

export default function VoiceMemoriesScreen() {
  const [voices, setVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    fetchVoices();
    return () => { if (sound) sound.unloadAsync(); };
  }, []);

  const fetchVoices = async () => {
    const user = auth.currentUser;
    if (user) {
      const q = query(collection(db, "families", user.uid, "voice_messages"));
      const snap = await getDocs(q);
      setVoices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
    setLoading(false);
  };

  const playVoice = async (uri: string, id: string) => {
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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>رسائل أحبابي الصوتية 🎤</Text>
      {loading ? <ActivityIndicator size="large" color={COLORS.primary} /> : (
        <FlatList
          data={voices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.voiceCard, { borderColor: playingId === item.id ? COLORS.primary : '#eee' }]}
              onPress={() => playVoice(item.audioUrl, item.id)}
            >
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons 
                  name={playingId === item.id ? "pause" : "play"} 
                  size={30} color={COLORS.primary} 
                />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.voiceTitle}>{item.title || "رسالة جديدة"}</Text>
                <Text style={styles.voiceSubText}>اضغط للاستماع بصوت {item.sender || "أحد أفراد العائلة"}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#333' },
  voiceCard: {
    flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'white',
    padding: 15, borderRadius: 20, marginBottom: 15, borderWidth: 1, elevation: 2
  },
  iconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  voiceTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  voiceSubText: { fontSize: 14, color: '#666', marginTop: 4 }
});
