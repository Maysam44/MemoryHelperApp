// hooks/use-notifications.ts

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

// إعداد معالج التنبيهات المحلية فقط
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const useNotifications = () => {
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    // استمع إلى التنبيهات الواردة
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('تم استقبال تنبيه محلي:', notification.request.content.title);
      }
    );

    // استمع إلى استجابات المستخدم
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('استجابة المستخدم:', response.notification.request.content.title);
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // دالة لجدولة الرسائل التحفيزية - يتم استدعاؤها يدوياً وليس تلقائياً في useEffect
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
        console.log('تم جدولة الرسائل التحفيزية كل 10 دقائق');
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

  const cancelAllNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('تم مسح جميع التنبيهات المجدولة');
  };

  return {
    scheduleMedicineReminder,
    scheduleMotivationMessages,
    cancelAllNotifications,
    getAllScheduledNotifications: Notifications.getAllScheduledNotificationsAsync,
  };
};
