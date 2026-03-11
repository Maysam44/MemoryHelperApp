import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Image, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { collection, query, onSnapshot, doc, getDoc, orderBy, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface MemoryItem { 
  id: string; 
  name: string; 
  relation: string; 
  imageUri?: string;
  description?: string;
}

export default function CaregiverDashboard() {
  const router = useRouter();
  const [caregiverName, setCaregiverName] = useState('');
  const [memoryBank, setMemoryBank] = useState<MemoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    getDoc(userDocRef).then(docSnap => {
      if (docSnap.exists()) {
        setCaregiverName(docSnap.data().caregiver.name);
      }
    });

    const memoriesColRef = collection(db, "users", user.uid, "memoryBank");
    const q = query(memoriesColRef, orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: MemoryItem[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MemoryItem));
      setMemoryBank(items);
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to memory bank: ", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "حذف الشخص",
      `هل أنت متأكد أنك تريد حذف "${name}" من بنك الذاكرة؟ لا يمكن التراجع عن هذا الإجراء.`,
      [
        { text: "إلغاء", style: "cancel" },
        { 
          text: "حذف", 
          style: "destructive", 
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (!user) return;
              await deleteDoc(doc(db, "users", user.uid, "memoryBank", id));
              // التحديث سيتم تلقائياً عبر onSnapshot
            } catch (error) {
              console.error("Error deleting memory: ", error);
              Alert.alert("خطأ", "حدثت مشكلة أثناء الحذف.");
            }
          } 
        }
      ]
    );
  };

  const renderMemoryItem = ({ item }: { item: MemoryItem }) => (
    <View style={styles.itemWrapper}>
      <TouchableOpacity 
        style={styles.itemContainer} 
        activeOpacity={0.7}
        onPress={() => Alert.alert(item.name, item.description || "لا يوجد وصف إضافي.")}
      >
        <View style={styles.itemImageWrapper}>
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={styles.itemImage} />
          ) : (
            <MaterialCommunityIcons name="account-outline" size={24} color={COLORS.primary} />
          )}
        </View>
        <View style={styles.itemTextWrapper}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemRelation}>{item.relation}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.editBtn]} 
          onPress={() => router.push({ pathname: '/caregiver/edit-memory', params: { id: item.id } })}
        >
          <MaterialCommunityIcons name="pencil-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionBtn, styles.deleteBtn]} 
          onPress={() => handleDelete(item.id, item.name)}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrapper}>
        <MaterialCommunityIcons name="image-plus" size={60} color={COLORS.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>بنك الذاكرة فارغ حالياً</Text>
      <Text style={styles.emptySubtitle}>
        ابدأ بإضافة صور ومعلومات الأشخاص المهمين لمساعدة أحبائك على تذكرهم.
      </Text>
      <TouchableOpacity 
        style={styles.emptyAddButton} 
        onPress={() => router.push('/caregiver/add-memory')}
      >
        <Text style={styles.emptyAddButtonText}>أضف أول ذكرى</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true }} />

      <FlatList
        data={memoryBank}
        renderItem={renderMemoryItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.welcomeCard}>
              <View style={styles.welcomeTextWrapper}>
                <Text style={styles.welcomeTitle}>أهلاً بك، {caregiverName || 'مقدم الرعاية'}!</Text>
                <Text style={styles.welcomeSubtitle}>أنت تدير بنك الذاكرة الخاص بأحبائك.</Text>
              </View>
              <View style={styles.welcomeIconWrapper}>
                <MaterialCommunityIcons name="heart-pulse" size={40} color={COLORS.textLight} />
              </View>
            </View>
            
            <View style={styles.actionRow}>
              <Text style={styles.listTitle}>بنك الذاكرة</Text>
              <TouchableOpacity 
                style={styles.smallAddButton} 
                onPress={() => router.push('/caregiver/add-memory')}
              >
                <MaterialCommunityIcons name="plus" size={20} color={COLORS.primary} />
                <Text style={styles.smallAddButtonText}>إضافة</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.replace('/patient/dashboard')}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="account-heart-outline" size={30} color={COLORS.textLight} />
        <Text style={styles.fabLabel}>وضع المريض</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundLight },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: SIZES.base, color: COLORS.textMuted, fontSize: SIZES.caption },
    header: { padding: SIZES.padding },
    welcomeCard: { 
      flexDirection: 'row-reverse',
      backgroundColor: COLORS.primary, 
      padding: SIZES.padding, 
      borderRadius: SIZES.radius,
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 10,
    },
    welcomeTextWrapper: { flex: 1 },
    welcomeTitle: { color: COLORS.textLight, fontSize: SIZES.h3, fontWeight: FONTS.bold, textAlign: 'right' },
    welcomeSubtitle: { color: COLORS.textLight, opacity: 0.9, fontSize: SIZES.caption, marginTop: 4, textAlign: 'right' },
    welcomeIconWrapper: { marginLeft: SIZES.padding },
    actionRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: SIZES.padding },
    listTitle: { fontSize: SIZES.h3, fontWeight: FONTS.bold, color: COLORS.textDark, textAlign: 'right' },
    smallAddButton: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.card, paddingHorizontal: SIZES.base * 1.5, paddingVertical: SIZES.base, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.primary },
    smallAddButtonText: { color: COLORS.primary, fontSize: SIZES.caption, fontWeight: FONTS.bold, marginRight: 4 },
    listContent: { paddingBottom: 120 },
    itemWrapper: { 
      flexDirection: 'row-reverse', 
      alignItems: 'center', 
      marginHorizontal: SIZES.padding, 
      marginBottom: SIZES.base 
    },
    itemContainer: { 
      flex: 1,
      backgroundColor: COLORS.card, 
      padding: SIZES.padding * 0.8, 
      borderRadius: SIZES.radius, 
      flexDirection: 'row-reverse', 
      alignItems: 'center', 
      borderWidth: 1, 
      borderColor: COLORS.border,
      elevation: 1,
    },
    itemImageWrapper: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.backgroundLight, justifyContent: 'center', alignItems: 'center', marginLeft: SIZES.padding, overflow: 'hidden' },
    itemImage: { width: '100%', height: '100%' },
    itemTextWrapper: { flex: 1 },
    itemName: { fontSize: SIZES.body, fontWeight: FONTS.bold, color: COLORS.textDark, textAlign: 'right' },
    itemRelation: { fontSize: SIZES.caption, color: COLORS.textMuted, textAlign: 'right', marginTop: 2 },
    actionButtons: { flexDirection: 'row', marginLeft: SIZES.base },
    actionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, marginLeft: 4 },
    editBtn: { borderColor: COLORS.primary + '40' },
    deleteBtn: { borderColor: COLORS.error + '40' },
    emptyContainer: { alignItems: 'center', padding: SIZES.padding * 2, marginTop: SIZES.padding },
    emptyIconWrapper: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', marginBottom: SIZES.padding, borderStyle: 'dashed', borderWidth: 2, borderColor: COLORS.border },
    emptyTitle: { fontSize: SIZES.h3, fontWeight: FONTS.bold, color: COLORS.textDark, marginBottom: SIZES.base },
    emptySubtitle: { fontSize: SIZES.body, color: COLORS.textMuted, textAlign: 'center', lineHeight: SIZES.body * 1.4, marginBottom: SIZES.padding * 1.5 },
    emptyAddButton: { backgroundColor: COLORS.secondary, paddingHorizontal: SIZES.padding * 2, paddingVertical: SIZES.padding, borderRadius: SIZES.radius, elevation: 2 },
    emptyAddButtonText: { color: COLORS.textLight, fontSize: SIZES.body, fontWeight: FONTS.bold },
    fab: { 
      position: 'absolute', 
      bottom: 30, 
      left: 30, 
      flexDirection: 'row',
      paddingHorizontal: SIZES.padding,
      height: 60, 
      borderRadius: 30, 
      backgroundColor: COLORS.primary, 
      justifyContent: 'center', 
      alignItems: 'center', 
      elevation: 8, 
      shadowColor: '#000', 
      shadowOpacity: 0.3, 
      shadowRadius: 5, 
      shadowOffset: { width: 0, height: 2 } 
    },
    fabLabel: { color: COLORS.textLight, fontWeight: FONTS.bold, marginLeft: SIZES.base, fontSize: SIZES.caption },
});
