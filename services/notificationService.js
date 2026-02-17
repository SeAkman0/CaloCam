import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

// Bildirim davranışını ayarla (uygulama açıkken bile bildirim göster)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// Bildirim izni iste ve token al
export const registerForPushNotificationsAsync = async () => {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Bildirim izni verilmedi!');
            return null;
        }

        // Token al (Gelecekte push notification için gerekebilir, şimdilik local)
        // token = (await Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig.extra.eas.projectId })).data;
        // console.log(token);
        return true;
    } else {
        console.log('Fiziksel cihaz kullanmalısınız');
        return false;
    }
};

// Tüm bildirimleri iptal et
export const cancelAllNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
};

// Belirli bir öğün bildirimini iptal et (id: 0, 1, 2...)
export const cancelMealNotification = async (index) => {
    // Bildirim ID formatı: "meal-notification-{index}"
    const identifier = `meal-notification-${index}`;
    await Notifications.cancelScheduledNotificationAsync(identifier);
    console.log(`🔕 ${index}. öğün bildirimi iptal edildi (Yemek yenildi)`);
};

// Öğün saatlerine göre bildirimleri planla
export const scheduleMealNotifications = async (mealTimes) => {
    // Önce mevcutları temizle
    await cancelAllNotifications();

    console.log('📅 Bildirimler planlanıyor:', mealTimes);

    for (let i = 0; i < mealTimes.length; i++) {
        const timeString = mealTimes[i]; // "08:00", "13:00" gibi
        const [hours, minutes] = timeString.split(':').map(Number);

        // Bildirim içeriği
        const identifier = `meal-notification-${i}`;

        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Yemek Vakti! 🍽️",
                    body: `${i + 1}. öğün zamanı geldi. Yediysen fotoğrafını çekip eklemeyi unutma!`,
                    sound: true,
                    data: { mealIndex: i },
                },
                trigger: {
                    hour: hours,
                    minute: minutes,
                    repeats: true, // Her gün tekrarla
                },
                identifier: identifier,
            });
            console.log(`✅ ${timeString} için bildirim kuruldu (ID: ${identifier})`);
        } catch (error) {
            console.error(`❌ Bildirim kurulamadı (${timeString}):`, error);
        }
    }
};

// Kullanıcının bildirim tercihini kaydet/getir
export const saveNotificationPreference = async (userId, enabled) => {
    try {
        await setDoc(doc(db, 'users', userId), {
            notificationsEnabled: enabled
        }, { merge: true });
        return true;
    } catch (error) {
        console.error('Bildirim tercihi kaydedilemedi:', error);
        return false;
    }
};

export const getNotificationPreference = async (userId) => {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            return userDoc.data().notificationsEnabled ?? true; // Varsayılan: Açık
        }
        return true;
    } catch (error) {
        console.error('Bildirim tercihi alınamadı:', error);
        return true;
    }
};
