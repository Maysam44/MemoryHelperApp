// hooks/use-notifications.ts

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// إعداد معالج التنبيهات المحلية
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true, // تم تغييرها من shouldShowBanner/List لضمان التوافق
  }),
});

export const useNotifications = () => {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // طلب الأذونات عند استخدام الهوك (للتأكد)
    const requestPermissions = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
      
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('medicine-reminders', {
          name: 'تنبيهات الأدوية',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    };

    requestPermissions();

    // استمع إلى التنبيهات الواردة
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('تم استقبال تنبيه:', notification.request.content.title);
      }
    );

    // استمع إلى استجابات المستخدم
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('استجابة المستخدم:', response.notification.request.content.title);
      }
    );

    return () => {
      // الإصلاح: استخدام .remove() بدلاً من Notifications.removeNotificationSubscription
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const scheduleMotivationMessages = async () => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const alreadyScheduled = scheduled.some(n => n.content.data?.type === 'motivation');
      
      if (!alreadyScheduled) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '❤️ رسالة حب لك',
            body: 'تذكر أننا نحبك، ادخل للتطبيق واسمع رسائل أحبائك',
            data: { type: 'motivation' },
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 10 * 60, // كل 10 دقائق
            repeats: true,
          },
        });
      }
    } catch (error) {
      console.error('Error scheduling motivation:', error);
    }
  };

  const scheduleMedicineReminder = async (
    medicineName: string,
    time: string, // صيغة HH:mm
    description?: string
  ) => {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      
      // إلغاء أي تنبيهات قديمة لنفس الدواء لمنع التكرار
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of scheduled) {
        if (notification.content.data?.medicineName === medicineName) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      // الجدولة اليومية
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🏥 حان وقت الدواء',
          body: `${medicineName}: ${description || 'خذ الدواء الآن'}`,
          sound: 'default',
          badge: 1,
          data: {
            type: 'medicine_reminder',
            medicineName,
            time,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
      });

      console.log(`تم جدولة تنبيه الدواء: ${medicineName} في ${time}`);
    } catch (error) {
      console.error('خطأ في جدولة التنبيه:', error);
    }
  };

  const cancelMedicineNotification = async (medicineName: string) => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of scheduled) {
        if (notification.content.data?.medicineName === medicineName) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          console.log(`تم إلغاء تنبيه الدواء: ${medicineName}`);
        }
      }
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  };

  const cancelAllNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  };

  return {
    scheduleMedicineReminder,
    scheduleMotivationMessages,
    cancelMedicineNotification,
    cancelAllNotifications,
    getAllScheduledNotifications: Notifications.getAllScheduledNotificationsAsync,
  };
};
