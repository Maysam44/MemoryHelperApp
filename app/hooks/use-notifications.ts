// hooks/use-notifications.ts

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';

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

const NOTIFICATION_TASK_NAME = 'MEDICINE_REMINDER_TASK';

// تسجيل المهمة الخلفية للتنبيهات
if (!TaskManager.isTaskDefined(NOTIFICATION_TASK_NAME)) {
  TaskManager.defineTask(NOTIFICATION_TASK_NAME, async () => {
    // هذه المهمة تعمل في الخلفية لإرسال التنبيهات
    console.log('تنبيه الدواء تم تفعيله في الخلفية');
  });
}

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

    return () => {
      notificationListener.current && notificationListener.current.remove();
      responseListener.current && responseListener.current.remove();
    };
  }, []);

  const scheduleMedicineReminder = async (
    medicineName: string,
    time: string, // صيغة HH:mm
    description?: string
  ) => {
    try {
      // تحويل الوقت إلى دقائق من منتصف الليل
      const [hours, minutes] = time.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes;
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const delayInSeconds = Math.max(
        (totalMinutes - currentMinutes) * 60,
        60 // تأكد من أن التأخير لا يقل عن دقيقة واحدة
      );

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
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delayInSeconds,
          repeats: true, // تكرار يومياً
        },
      });

      console.log(`تم جدولة تنبيه الدواء: ${medicineName} في الساعة ${time}`);
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
