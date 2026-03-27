import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Linking, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';
import { auth, db } from '../../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

interface SafeZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export default function SafeZonesScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const [zones, setZones] = useState<SafeZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSafeZones();
  }, []);

  const fetchSafeZones = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDocs(collection(db, 'users'));
        // نحتاج للحصول على مستند المستخدم الحالي أولاً لمعرفة caregiverId
        // ولكن fetchSafeZones تُستدعى في useEffect، لذا يفضل جلب مستند المستخدم هناك أو هنا
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        const userData = userSnap.data();
        
        const targetCaregiverId = userData?.caregiverId || user.uid;

        const zonesRef = collection(db, `users/${targetCaregiverId}/safeZones`);
        const snapshot = await getDocs(zonesRef);
        const fetchedZones: SafeZone[] = [];
        snapshot.forEach((doc) => {
          fetchedZones.push({ id: doc.id, ...doc.data() } as SafeZone);
        });
        setZones(fetchedZones);
      }
    } catch (error) {
      console.error('Error fetching safe zones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openMap = (lat: number, lon: number, name: string) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lon}`;
    const label = name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    if (url) Linking.openURL(url);
  };

  const ZoneCard = ({ zone }: { zone: SafeZone }) => (
    <TouchableOpacity 
      style={[styles.zoneCard, { backgroundColor: 'white', borderColor: '#eee' }]}
      onPress={() => openMap(zone.latitude, zone.longitude, zone.name)}
      activeOpacity={0.8}
    >
      <View style={styles.zoneHeader}>
        <View style={[styles.iconCircle, { backgroundColor: COLORS.primary + '15' }]}>
          <MaterialCommunityIcons name="map-marker-radius" size={40} color={COLORS.primary} />
        </View>
        <View style={styles.zoneInfo}>
          <Text style={[styles.zoneName, { color: COLORS.textDark }]}>{zone.name}</Text>
          <Text style={[styles.zoneRadius, { color: COLORS.textMuted }]}>نطاق الأمان: {zone.radius} متر</Text>
          <Text style={styles.mapLink}>اضغط للعرض على الخريطة</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8F9FD' }]}>
      <Stack.Screen options={{ title: 'أماكني الآمنة', headerTitleAlign: 'center' }} />
      <FlatList
        data={zones}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ZoneCard zone={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="map-marker-off" size={100} color="#ccc" />
            <Text style={styles.emptyText}>لا توجد أماكن آمنة مضافة</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20 },
  zoneCard: { padding: 25, borderRadius: 25, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1 },
  zoneHeader: { flexDirection: 'row-reverse', alignItems: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginLeft: 20 },
  zoneInfo: { flex: 1, alignItems: 'flex-end' },
  zoneName: { fontSize: 22, fontWeight: 'bold' },
  zoneRadius: { fontSize: 16, marginTop: 4 },
  mapLink: { fontSize: 14, color: COLORS.primary, fontWeight: 'bold', marginTop: 10 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, color: '#999', marginTop: 20 },
});
