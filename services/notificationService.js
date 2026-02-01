import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Bildirim davranışını ayarla
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Bildirim izni iste
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return { success: false, error: 'Bildirim izni reddedildi' };
    }

    // Android için kanal oluştur
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('meal-reminders', {
        name: 'Öğün Hatırlatmaları',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Bildirim izni hatası:', error);
    return { success: false, error: error.message };
  }
};

// Tüm bildirimleri iptal et
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return { success: true };
  } catch (error) {
    console.error('Bildirim iptal hatası:', error);
    return { success: false, error: error.message };
  }
};

// Öğün hatırlatmalarını zamanla
export const scheduleMealReminders = async (mealTimes) => {
  try {
    // Önce eski bildirimleri iptal et
    await cancelAllNotifications();

    if (!mealTimes || mealTimes.length === 0) {
      return { success: true, message: 'Öğün saati yok' };
    }

    const scheduledIds = [];

    for (let i = 0; i < mealTimes.length; i++) {
      const mealTime = mealTimes[i]; // Format: "HH:MM"
      const [hours, minutes] = mealTime.split(':').map(Number);

      if (isNaN(hours) || isNaN(minutes)) {
        continue;
      }

      // Her gün için bildirim zamanla
      const trigger = {
        hour: hours,
        minute: minutes,
        repeats: true, // Her gün tekrarla
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${i + 1}. Öğün Zamanı! 🍽️`,
          body: 'Öğününü yemeyi unutma! CaloCam\'de öğününü ekleyebilirsin.',
          data: { mealNumber: i + 1, screen: 'AddMeal' },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger,
      });

      scheduledIds.push(notificationId);
    }

    return {
      success: true,
      message: `${scheduledIds.length} öğün hatırlatması ayarlandı`,
      notificationIds: scheduledIds,
    };
  } catch (error) {
    console.error('Bildirim zamanlama hatası:', error);
    return { success: false, error: error.message };
  }
};

// Zamanlanmış bildirimleri getir
export const getScheduledNotifications = async () => {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return { success: true, notifications };
  } catch (error) {
    console.error('Bildirim listeleme hatası:', error);
    return { success: false, error: error.message, notifications: [] };
  }
};

// Test bildirimi gönder (hemen)
export const sendTestNotification = async () => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Bildirimi 🎉',
        body: 'Bildirimler çalışıyor! Öğün hatırlatmaların aktif.',
        data: { type: 'test' },
      },
      trigger: {
        seconds: 1,
      },
    });

    return { success: true, message: 'Test bildirimi gönderildi' };
  } catch (error) {
    console.error('Test bildirimi hatası:', error);
    return { success: false, error: error.message };
  }
};

// Bildirim tıklandığında dinleyici
export const addNotificationResponseListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    callback(data);
  });
};

// Bildirim geldiğinde dinleyici (uygulama açıkken)
export const addNotificationReceivedListener = (callback) => {
  return Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data;
    callback(data);
  });
};
