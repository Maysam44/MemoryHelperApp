// app/patient/safe-zones.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';
import { useLocationTracking, SafeZone } from '../hooks/use-location-tracking';
import { auth, db } from '../../firebaseConfig';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

export default function SafeZonesScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const { currentLocation, startLocationTracking, isInSafeZone } = useLocationTracking();
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [zoneRadius, setZoneRadius] = useState('100');
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    startLocationTracking();
    fetchSafeZones();
  }, []);

  const fetchSafeZones = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const zonesRef = collection(db, `users/${user.uid}/safeZones`);
        const snapshot = await getDocs(zonesRef);
        const fetchedZones: SafeZone[] = [];
        snapshot.forEach((doc) => {
          fetchedZones.push({ id: doc.id, ...doc.data() } as SafeZone);
        });
        setSafeZones(fetchedZones);
      }
    } catch (error) {
      console.error('خطأ في جلب المناطق الآمنة:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addSafeZone = async () => {
    if (!zoneName.trim() || !currentLocation) {
      Alert.alert('خطأ', 'يرجى ملء الاسم والتأكد من تفعيل الموقع');
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        const zoneId = `${Date.now()}`;
        const newZone: SafeZone = {
          id: zoneId,
          name: zoneName,
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          radius: parseInt(zoneRadius) || 100,
        };

        await setDoc(
          doc(db, `users/${user.uid}/safeZones`, zoneId),
          newZone
        );

        setSafeZones([...safeZones, newZone]);
        setZoneName('');
        setZoneRadius('100');
        setShowModal(false);

        Alert.alert('نجاح', `تم إضافة منطقة آمنة: ${zoneName}`);
      }
    } catch (error) {
      console.error('خطأ في إضافة المنطقة:', error);
      Alert.alert('خطأ', 'حدث خطأ في إضافة المنطقة');
    }
  };

  const deleteSafeZone = async (zoneId: string) => {
    try {
      const user = auth.currentUser;
      if (user) {
        await deleteDoc(doc(db, `users/${user.uid}/safeZones`, zoneId));
        setSafeZones(safeZones.filter((z) => z.id !== zoneId));
        Alert.alert('تم', 'تم حذف المنطقة الآمنة');
      }
    } catch (error) {
      console.error('خطأ في حذف المنطقة:', error);
    }
  };

  const SafeZoneCard = ({ zone }: { zone: SafeZone }) => {
    const inZone = isInSafeZone([zone]);
    return (
      <View
        style={[
          styles.zoneCard,
          {
            backgroundColor: dynamicColors.card,
            borderColor: inZone ? COLORS.primary : dynamicColors.border,
            borderWidth: inZone ? 2 : 1,
          },
        ]}
      >
        <View style={styles.zoneHeader}>
          <View style={[styles.zoneIcon, { backgroundColor: inZone ? COLORS.primary + '20' : dynamicColors.backgroundLight }]}>
            <MaterialCommunityIcons
              name={inZone ? 'map-marker-check' : 'map-marker'}
              size={28}
              color={inZone ? COLORS.primary : dynamicColors.textMuted}
            />
          </View>
          <View style={styles.zoneInfo}>
            <Text style={[styles.zoneName, { color: dynamicColors.textDark }]}>
              {zone.name}
            </Text>
            <Text style={[styles.zoneStatus, { color: inZone ? COLORS.primary : dynamicColors.textMuted }]}>
              {inZone ? '✓ أنت داخل المنطقة' : '✗ خارج المنطقة'}
            </Text>
            <Text style={[styles.zoneRadius, { color: dynamicColors.textMuted }]}>
              نطاق الأمان: {zone.radius} متر
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() =>
            Alert.alert('تأكيد', 'هل تريد حذف هذه المنطقة؟', [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'حذف', onPress: () => deleteSafeZone(zone.id), style: 'destructive' },
            ])
          }
        >
          <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: dynamicColors.backgroundLight }]}>
        <ActivityIndicator size="large" color={dynamicColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
      <Stack.Screen
        options={{
          title: 'المناطق الآمنة',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: dynamicColors.backgroundLight },
          headerTitleStyle: { color: dynamicColors.textDark },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: SIZES.padding }}>
              <MaterialCommunityIcons name="chevron-right" size={30} color={dynamicColors.textDark} />
            </TouchableOpacity>
          ),
        }}
      />

      {currentLocation && (
        <View style={[styles.locationInfo, { backgroundColor: COLORS.primary + '10', borderColor: COLORS.primary }]}>
          <MaterialCommunityIcons name="map-marker" size={20} color={COLORS.primary} />
          <Text style={[styles.locationText, { color: COLORS.primary }]}>
            الموقع الحالي: {currentLocation.coords.latitude.toFixed(4)}, {currentLocation.coords.longitude.toFixed(4)}
          </Text>
        </View>
      )}

      <FlatList
        data={safeZones}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SafeZoneCard zone={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="map-marker-radius" size={80} color={dynamicColors.textMuted} />
            <Text style={[styles.emptyText, { color: dynamicColors.textMuted }]}>
              لا توجد مناطق آمنة مضافة حتى الآن
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: COLORS.secondary }]}
        onPress={() => setShowModal(true)}
      >
        <MaterialCommunityIcons name="plus" size={32} color="white" />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: dynamicColors.backgroundLight }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <MaterialCommunityIcons name="close" size={28} color={dynamicColors.textDark} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: dynamicColors.textDark }]}>إضافة منطقة آمنة</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: dynamicColors.textDark }]}>اسم المنطقة *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: dynamicColors.card,
                    color: dynamicColors.textDark,
                    borderColor: dynamicColors.border,
                  },
                ]}
                placeholder="مثال: المنزل"
                placeholderTextColor={dynamicColors.textMuted}
                value={zoneName}
                onChangeText={setZoneName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: dynamicColors.textDark }]}>نطاق الأمان (بالمتر)</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: dynamicColors.card,
                    color: dynamicColors.textDark,
                    borderColor: dynamicColors.border,
                  },
                ]}
                placeholder="100"
                placeholderTextColor={dynamicColors.textMuted}
                value={zoneRadius}
                onChangeText={setZoneRadius}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.infoBox, { backgroundColor: COLORS.primary + '10', borderColor: COLORS.primary }]}>
              <MaterialCommunityIcons name="information" size={20} color={COLORS.primary} />
              <Text style={[styles.infoText, { color: COLORS.primary }]}>
                سيتم حفظ الموقع الحالي كمركز المنطقة الآمنة
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: COLORS.primary }]}
              onPress={addSafeZone}
            >
              <MaterialCommunityIcons name="check" size={24} color="white" />
              <Text style={styles.addButtonText}>إضافة المنطقة</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  locationInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: SIZES.padding,
    marginHorizontal: SIZES.padding,
    marginTop: SIZES.padding,
    borderRadius: SIZES.radius,
    borderWidth: 1,
  },
  locationText: {
    marginRight: SIZES.base,
    fontSize: SIZES.caption,
    fontWeight: FONTS.medium,
  },
  listContent: { padding: SIZES.padding, paddingBottom: 100 },
  zoneCard: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.padding,
    elevation: 2,
  },
  zoneHeader: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  zoneIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SIZES.padding,
  },
  zoneInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  zoneName: {
    fontSize: SIZES.h2,
    fontWeight: FONTS.bold,
    marginBottom: SIZES.base / 2,
  },
  zoneStatus: {
    fontSize: SIZES.body,
    marginBottom: SIZES.base / 2,
    fontWeight: FONTS.medium,
  },
  zoneRadius: {
    fontSize: SIZES.caption,
  },
  deleteButton: {
    padding: SIZES.base,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
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
  inputGroup: {
    marginBottom: SIZES.padding * 1.5,
  },
  label: {
    fontSize: SIZES.body,
    fontWeight: FONTS.bold,
    marginBottom: SIZES.base,
  },
  input: {
    borderWidth: 1,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.base,
    fontSize: SIZES.body,
    textAlign: 'right',
  },
  infoBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    marginVertical: SIZES.padding,
  },
  infoText: {
    marginRight: SIZES.base,
    fontSize: SIZES.body,
    fontWeight: FONTS.medium,
  },
  addButton: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES.padding,
    borderRadius: SIZES.radius,
    marginTop: SIZES.padding * 2,
  },
  addButtonText: {
    color: 'white',
    fontSize: SIZES.h2,
    fontWeight: FONTS.bold,
    marginLeft: SIZES.base,
  },
});
