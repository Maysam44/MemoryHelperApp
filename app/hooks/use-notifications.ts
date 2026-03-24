// hooks/use-notifications.ts

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ✅ إصلاح: إضافة shouldShowBanner و shouldShowList المطلوبين
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function secondsUntilTime(hour: number, minute: number): number {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return Math.floor((target.getTime() - now.getTime()) / 1000);
}

export const useNotifications = () => {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
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
          sound: 'default',
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
        });
      }
    };

    requestPermissions();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('تم استقبال تنبيه:', notification.request.content.title);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('استجابة المستخدم:', response.notification.request.content.title);
      }
    );

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
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
            seconds: 10 * 60,
            repeats: true,
          },
        });
      }
    } catch (error) {
      console.error('Error scheduling motivation:', error);
    }
  };

  const scheduleMedicineReminder = async (
    medicineId: string,
    medicineName: string,
    doses: {
      time: string;
      displayTime: string;
      status: string;
      lastTakenDate: null;
      description: string;
    }[]
  ): Promise<any[]> => {
    const updatedDoses = [];
    const oneDayInSeconds = 24 * 60 * 60;

    for (const dose of doses) {
      try {
        const parts = dose.time.split(':');
        const hour = parseInt(parts[0], 10);
        const minute = parseInt(parts[1], 10);

        if (isNaN(hour) || isNaN(minute)) {
          console.error(`وقت غير صالح: ${dose.time}`);
          updatedDoses.push({ ...dose, notificationId: null, repeatingNotificationId: null });
          continue;
        }

        const secondsUntil = secondsUntilTime(hour, minute);
        console.log(`⏰ ${medicineName} - ${dose.displayTime} | بعد ${Math.floor(secondsUntil / 60)} دقيقة`);

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '💊 حان وقت الدواء',
            body: `${medicineName} - ${dose.displayTime}${dose.description ? ` | ${dose.description}` : ''}`,
            sound: 'default',
            badge: 1,
            data: { type: 'medicine_reminder', medicineId, medicineName, time: dose.time },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntil,
            repeats: false,
          },
        });

        const repeatingId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '💊 حان وقت الدواء',
            body: `${medicineName} - ${dose.displayTime}${dose.description ? ` | ${dose.description}` : ''}`,
            sound: 'default',
            badge: 1,
            data: { type: 'medicine_reminder', medicineId, medicineName, time: dose.time },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntil + oneDayInSeconds,
            repeats: true,
          },
        });

        console.log(`✅ تم جدولة تنبيه: ${medicineName} في ${dose.displayTime} | ID: ${notificationId}`);
        updatedDoses.push({ ...dose, notificationId, repeatingNotificationId: repeatingId });

      } catch (error) {
        console.error('خطأ في جدولة التنبيه:', error);
        updatedDoses.push({ ...dose, notificationId: null, repeatingNotificationId: null });
      }
    }

    return updatedDoses;
  };

  const cancelMedicineNotification = async (notificationId: string, repeatingNotificationId?: string) => {
    try {
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      }
      if (repeatingNotificationId) {
        await Notifications.cancelScheduledNotificationAsync(repeatingNotificationId);
      }
      console.log(`✅ تم إلغاء التنبيه`);
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