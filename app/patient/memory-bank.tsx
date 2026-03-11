import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS } from '../../constants/theme';

const MemoryItem = ({ item, dynamicColors }: { item: any, dynamicColors: any }) => (
  <View style={[styles.memoryItem, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border }]}>
    {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.memoryImage} />}
    <View style={styles.memoryTextContainer}>
      <Text style={[styles.memoryName, { color: dynamicColors.textDark }]}>{item.name}</Text>
      <Text style={[styles.memoryRelationship, { color: dynamicColors.textMuted }]}>{item.relationship}</Text>
      {item.description && <Text style={[styles.memoryDescription, { color: dynamicColors.textDark }]}>{item.description}</Text>}
    </View>
  </View>
);

export default function PatientMemoryBank() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const [memories, setMemories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMemories = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const q = query(collection(db, `families/${user.uid}/people`));
          const querySnapshot = await getDocs(q);
          const fetchedMemories: any[] = [];
          querySnapshot.forEach((doc) => {
            fetchedMemories.push({ id: doc.id, ...doc.data() });
          });
          setMemories(fetchedMemories);
        }
      } catch (error) {
        console.error("Error fetching memories:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMemories();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: dynamicColors.backgroundLight }]}>
        <ActivityIndicator size="large" color={dynamicColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
      <Stack.Screen options={{
        title: 'بنك الذكريات',
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: dynamicColors.backgroundLight },
        headerTitleStyle: { color: dynamicColors.textDark },
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: SIZES.padding }}>
            <MaterialCommunityIcons name="chevron-right" size={30} color={dynamicColors.textDark} />
          </TouchableOpacity>
        )
      }} />
      <FlatList
        data={memories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MemoryItem item={item} dynamicColors={dynamicColors} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="brain" size={80} color={dynamicColors.textMuted} />
            <Text style={[styles.emptyText, { color: dynamicColors.textMuted }]}>لا توجد ذكريات لعرضها بعد.</Text>
          </View>
        }
      />
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
});