import { collection, addDoc, query, where, getDocs, Timestamp, deleteDoc, doc, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Belirli bir su tüketimini sil
 * @param {string} waterId - Su kaydı ID
 * @returns {Promise<Object>}
 */
export const deleteWaterIntake = async (waterId) => {
  try {
    const waterDocRef = doc(db, 'waterIntake', waterId);
    await deleteDoc(waterDocRef);
    console.log(`💧 Su kaydı silindi: ${waterId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Su silme hatası:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Son su tüketimini geri al (Bugün için)
 * @param {string} userId - Kullanıcı ID
 * @returns {Promise<Object>}
 */
export const undoLastWaterIntake = async (userId) => {
  try {
    const todayResult = await getTodayWaterIntake(userId);

    if (!todayResult.success || todayResult.records.length === 0) {
      return { success: false, error: 'Bugün için su kaydı bulunamadı' };
    }

    // Tarihe göre sırala (en yeni en üstte)
    const records = [...todayResult.records].sort((a, b) => b.date - a.date);
    const lastRecord = records[0];

    const result = await deleteWaterIntake(lastRecord.id);
    if (result.success) {
      return { success: true, removedAmount: lastRecord.amount };
    }
    return result;
  } catch (error) {
    console.error('❌ Son suyu geri alma hatası:', error);
    return { success: false, error: error.message };
  }
};


/**
 * Mevcut mevsim bilgisini ve su çarpanını getir
 * @returns {Object} - { season: string, multiplier: number }
 */
export const getCurrentSeasonInfo = () => {
  const month = new Date().getMonth(); // 0-11

  // Mevsimler (Kuzey Yarımküre için)
  // 5-8: Haziran, Temmuz, Ağustos (Yaz) -> Su ihtiyacı artar
  if (month >= 5 && month <= 7) {
    return { name: 'Yaz ☀️', multiplier: 1.20, note: 'Sıcak hava nedeniyle su ihtiyacın %20 arttı.' };
  }
  // 11, 0, 1: Aralık, Ocak, Şubat (Kış) -> Su ihtiyacı biraz azalabilir
  if (month === 11 || month === 0 || month === 1) {
    return { name: 'Kış ❄️', multiplier: 0.95, note: 'Soğuk hava nedeniyle su ihtiyacın %5 azaldı.' };
  }
  // Diğer aylar (Bahar) -> Normal seviye
  return { name: 'Bahar 🌸', multiplier: 1.0, note: 'Normal su ihtiyacı seviyesindesin.' };
};

/**
 * Günlük su hedefini hesapla (ml cinsinden)
 * @param {number} weight - Kilo (kg)
 * @param {number} height - Boy (cm)
 * @param {number} age - Yaş
 * @param {string} gender - Cinsiyet (male/female)
 * @returns {number} - Günlük su hedefi (ml)
 */
export const calculateDailyWaterGoal = (weight, height, age, gender) => {
  // Temel hesaplama (kilo bazlı): 30-35 ml/kg
  let baseWater = weight * 35; // ml

  // Cinsiyet düzeltmesi
  if (gender === 'male') {
    baseWater *= 1.05; // Erkekler %5 daha fazla
  } else if (gender === 'female') {
    baseWater *= 0.95; // Kadınlar %5 daha az
  }

  // Yaş düzeltmesi
  if (age < 18) {
    baseWater *= 0.9; // Gençler biraz daha az
  } else if (age > 65) {
    baseWater *= 0.95; // Yaşlılar biraz daha az
  }

  // Mevsimsel düzeltme
  const seasonInfo = getCurrentSeasonInfo();
  baseWater *= seasonInfo.multiplier;

  // Minimum ve maksimum sınırlar
  const minWater = 1500; // 1.5 litre minimum
  const maxWater = 4500; // 4.5 litre maksimum (yaz etkisiyle arttırıldı)

  const finalWater = Math.max(minWater, Math.min(maxWater, Math.round(baseWater / 50) * 50)); // 50ml'ye yuvarla

  console.log(`💧 Su hedefi ${seasonInfo.name} mevsimine göre hesaplandı: ${finalWater}ml`);

  return finalWater;
};


/**
 * Su tüketimi ekle
 * @param {string} userId - Kullanıcı ID
 * @param {number} amount - Su miktarı (ml)
 * @returns {Promise<Object>}
 */
export const addWaterIntake = async (userId, amount) => {
  try {
    const waterRef = collection(db, 'waterIntake');

    const waterDoc = await addDoc(waterRef, {
      userId: userId,
      amount: amount, // ml
      date: Timestamp.now(),
      createdAt: Timestamp.now(),
    });

    console.log(`💧 ${amount}ml su eklendi`);
    return { success: true, waterId: waterDoc.id };
  } catch (error) {
    console.error('❌ Su ekleme hatası:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Bugünün toplam su tüketimini getir
 * @param {string} userId - Kullanıcı ID
 * @returns {Promise<Object>}
 */
export const getTodayWaterIntake = async (userId) => {
  try {
    const waterRef = collection(db, 'waterIntake');

    // Sadece userId ile sorgula
    const q = query(
      waterRef,
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const allWater = [];

    querySnapshot.forEach((doc) => {
      allWater.push({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
      });
    });

    // Client-side'da bugünün tarihine göre filtrele
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayWater = allWater.filter(water => {
      const waterDate = new Date(water.date);
      return waterDate >= today && waterDate < tomorrow;
    });

    // Toplam hesapla
    const totalWater = todayWater.reduce((sum, water) => sum + (water.amount || 0), 0);

    console.log(`💧 Bugün içilen su: ${totalWater}ml`);

    return { success: true, totalWater, records: todayWater };
  } catch (error) {
    console.error('❌ Su verisi getirme hatası:', error);
    return { success: false, totalWater: 0, records: [] };
  }
};

/**
 * Son 7 günün su tüketimini getir
 * @param {string} userId - Kullanıcı ID
 * @returns {Promise<Object>}
 */
export const getWeeklyWaterStats = async (userId) => {
  try {
    const waterRef = collection(db, 'waterIntake');
    const q = query(waterRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const allWater = [];
    querySnapshot.forEach((doc) => {
      allWater.push({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
      });
    });

    // Son 7 gün için veri hazırla
    const last7Days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayWater = allWater.filter(water => {
        const waterDate = new Date(water.date);
        return waterDate >= date && waterDate < nextDay;
      });

      const totalWater = dayWater.reduce((sum, w) => sum + (w.amount || 0), 0);

      last7Days.push({
        date: date.toISOString().split('T')[0],
        day: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][date.getDay()],
        water: totalWater,
      });
    }

    console.log('💧 Haftalık su istatistikleri yüklendi');
    return { success: true, data: last7Days };
  } catch (error) {
    console.error('❌ Haftalık su istatistikleri hatası:', error);
    return { success: false, data: [] };
  }
};

/**
 * Son 30 günün su tüketimini getir
 * @param {string} userId - Kullanıcı ID
 * @returns {Promise<Object>}
 */
export const getMonthlyWaterStats = async (userId) => {
  try {
    const waterRef = collection(db, 'waterIntake');
    const q = query(waterRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const allWater = [];
    querySnapshot.forEach((doc) => {
      allWater.push({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
      });
    });

    // Son 30 gün için veri hazırla
    const last30Days = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayWater = allWater.filter(water => {
        const waterDate = new Date(water.date);
        return waterDate >= date && waterDate < nextDay;
      });

      const totalWater = dayWater.reduce((sum, w) => sum + (w.amount || 0), 0);

      last30Days.push({
        date: date.toISOString().split('T')[0],
        day: `${date.getDate()}/${date.getMonth() + 1}`,
        water: totalWater,
      });
    }

    // Ortalama hesapla
    const totalWater = last30Days.reduce((sum, day) => sum + day.water, 0);
    const averageWater = Math.round(totalWater / 30);

    console.log('💧 Aylık su istatistikleri yüklendi');
    return { success: true, data: last30Days, average: averageWater };
  } catch (error) {
    console.error('❌ Aylık su istatistikleri hatası:', error);
    return { success: false, data: [], average: 0 };
  }
};

/**
 * Su hedefi başarı oranını hesapla
 * @param {string} userId - Kullanıcı ID
 * @param {number} dailyGoal - Günlük su hedefi (ml)
 * @returns {Promise<Object>}
 */
export const getWaterGoalProgress = async (userId, dailyGoal) => {
  try {
    const weeklyResult = await getWeeklyWaterStats(userId);

    if (!weeklyResult.success) {
      return { success: false, percentage: 0, daysAchieved: 0 };
    }

    // Son 7 günde kaç gün hedefi tutturdu
    const daysAchieved = weeklyResult.data.filter(day => day.water >= dailyGoal).length;
    const percentage = Math.round((daysAchieved / 7) * 100);

    console.log(`💧 Su hedefi başarısı: ${percentage}% (${daysAchieved}/7 gün)`);

    return {
      success: true,
      percentage,
      daysAchieved,
      totalDays: 7
    };
  } catch (error) {
    console.error('❌ Su hedefi başarısı hatası:', error);
    return { success: false, percentage: 0, daysAchieved: 0 };
  }
};

/**
 * Hızlı ekleme miktarları
 */
export const QUICK_ADD_AMOUNTS = [
  { id: 'glass', label: '1 Bardak', amount: 200, icon: '🥤' },
  { id: 'water_glass', label: '1 Su Bardağı', amount: 250, icon: '💧' },
  { id: 'bottle', label: '1 Şişe', amount: 500, icon: '🍶' },
  { id: 'large_bottle', label: '1 Büyük Şişe', amount: 1000, icon: '🧊' },
];
