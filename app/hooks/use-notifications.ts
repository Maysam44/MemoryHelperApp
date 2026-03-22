// hooks/use-notifications.ts

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

// إعداد معالج التنبيهات
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
        console.log('تم استقبال تنبيه:', notification);
      }
    );

    // استمع إلى استجابات المستخدم للتنبيهات
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('استجابة المستخدم للتنبيه:', response);
      }
    );

    // جدولة الرسائل التحفيزية كل 10 دقائق عند تشغيل الهوك لأول مرة
    scheduleMotivationMessages();

    return () => {
      notificationListener.current && notificationListener.current.remove();
      responseListener.current && responseListener.current.remove();
    };
  }, []);

  const scheduleMotivationMessages = async () => {
    try {
      // التحقق مما إذا كانت مجدولة بالفعل
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const alreadyScheduled = scheduled.some(n => n.content.data?.type === 'motivation');
      
      if (!alreadyScheduled) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '❤️ رسالة حب لك',
            body: 'تذكر أننا نحبك، ادخل للتطبيق واسمع رسائل أحبائك',
            data: { type: 'motivation' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 10 * 60, // كل 10 دقائق كما طلب المستخدم
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
      
      // إلغاء أي تنبيهات قديمة لنفس الدواء لتجنب التكرار
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of scheduled) {
        if (notification.content.data?.medicineName === medicineName) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      // الجدولة اليومية في وقت محدد بدقة
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

      console.log(`تم جدولة تنبيه الدواء اليومي: ${medicineName} في الساعة ${time}`);
    } catch (error) {
      console.error('خطأ في جدولة التنبيه:', error);
    }
  };

  const cancelMedicineReminder = async (notificationId: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('تم إلغاء التنبيه');
    } catch (error) {
      console.error('خطأ في إلغاء التنبيه:', error);
    }
  };

  const getAllScheduledNotifications = async () => {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('خطأ في جلب التنبيهات:', error);
      return [];
    }
  };

  return {
    scheduleMedicineReminder,
    cancelMedicineReminder,
    getAllScheduledNotifications,
  };
};
