import { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const NotificationItem = ({ title, description, value, onValueChange }: any) => (
  <View style={styles.item}>
    <View style={styles.itemLeft}>
      <Switch 
        value={value} 
        onValueChange={onValueChange} 
        trackColor={{ false: COLORS.border, true: COLORS.primary }}
        thumbColor={COLORS.textLight}
      />
    </View>
    <View style={styles.itemRight}>
      <Text style={styles.itemTitle}>{title}</Text>
      <Text style={styles.itemDescription}>{description}</Text>
    </View>
  </View>
);

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [meds, setMeds] = useState(true);
  const [appointments, setAppointments] = useState(true);
  const [activities, setActivities] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'إعدادات التنبيهات', 
        headerTitleAlign: 'center',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: SIZES.padding }}>
            <MaterialCommunityIcons name="chevron-right" size={30} color={COLORS.textDark} />
          </TouchableOpacity>
        )
      }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <NotificationItem 
            title="تنبيهات الأدوية" 
            description="تذكير بمواعيد أدوية المريض اليومية"
            value={meds}
            onValueChange={setMeds}
          />
          <NotificationItem 
            title="تنبيهات المواعيد" 
            description="تذكير بمواعيد الزيارات الطبية"
            value={appointments}
            onValueChange={setAppointments}
          />
          <NotificationItem 
            title="تنبيهات الأنشطة" 
            description="تذكير بالأنشطة والتمارين الذهنية"
            value={activities}
            onValueChange={setActivities}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  scrollContent: { padding: SIZES.padding },
  section: { backgroundColor: COLORS.card, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SIZES.padding, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemLeft: { flex: 0.2 },
  itemRight: { flex: 0.8, alignItems: 'flex-end' },
  itemTitle: { fontSize: SIZES.body, fontWeight: FONTS.bold, color: COLORS.textDark, marginBottom: 2 },
  itemDescription: { fontSize: SIZES.caption, color: COLORS.textMuted, textAlign: 'right' }
});