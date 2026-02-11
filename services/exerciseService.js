import { collection, addDoc, query, where, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { calculateBurnedCalories } from '../data/exerciseTypes';

const COLLECTION = 'exerciseLogs';

export const addExerciseLog = async (userId, { exerciseTypeId, value }) => {
  try {
    const burned = calculateBurnedCalories(exerciseTypeId, value);
    const ref = collection(db, COLLECTION);
    await addDoc(ref, {
      userId,
      exerciseTypeId,
      value: Number(value),
      burnedCalories: burned,
      date: Timestamp.now(),
    });
    return { success: true, burnedCalories: burned };
  } catch (error) {
    console.error('Egzersiz ekleme hatası:', error);
    return { success: false, error: error.message };
  }
};

const getTodayRange = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { start: today, end: tomorrow };
};

const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

/** Tarih aralığındaki tüm egzersiz kayıtlarını getirir */
export const getExerciseLogsByDateRange = async (userId, startDate, endDate) => {
  try {
    const ref = collection(db, COLLECTION);
    const q = query(ref, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const logs = [];
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    snapshot.forEach((d) => {
      const data = d.data();
      const date = data.date?.toDate?.() || new Date(0);
      if (date >= startDate && date <= end) {
        logs.push({ id: d.id, ...data, date });
      }
    });
    logs.sort((a, b) => b.date - a.date);
    return { success: true, logs };
  } catch (error) {
    console.error('Egzersiz kayıtları getirme hatası:', error);
    return { success: false, logs: [] };
  }
};

/** Son N günün günlük egzersiz özeti: her gün için toplam yakılan + kayıt listesi */
export const getExerciseStatsByDay = async (userId, daysBack = 7) => {
  try {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - (daysBack - 1));
    start.setHours(0, 0, 0, 0);
    const result = await getExerciseLogsByDateRange(userId, start, end);
    if (!result.success) return { success: false, dayStats: [] };

    const dayStatsMap = {};
    for (let i = 0; i < daysBack; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateKey = d.toISOString().split('T')[0];
      dayStatsMap[dateKey] = {
        dateKey,
        date: d,
        dayName: dayNames[d.getDay()],
        totalBurned: 0,
        logs: [],
      };
    }

    (result.logs || []).forEach((log) => {
      const dateKey = new Date(log.date).toISOString().split('T')[0];
      if (dayStatsMap[dateKey]) {
        dayStatsMap[dateKey].totalBurned += log.burnedCalories || 0;
        dayStatsMap[dateKey].logs.push(log);
      }
    });

    const dayStats = Object.keys(dayStatsMap)
      .sort()
      .map((k) => dayStatsMap[k]);
    return { success: true, dayStats };
  } catch (error) {
    console.error('Egzersiz istatistik hatası:', error);
    return { success: false, dayStats: [] };
  }
};

export const getTodayExerciseLogs = async (userId) => {
  try {
    const ref = collection(db, COLLECTION);
    const q = query(ref, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const { start, end } = getTodayRange();
    const logs = [];
    snapshot.forEach((d) => {
      const data = d.data();
      const date = data.date?.toDate?.() || new Date(0);
      if (date >= start && date < end) {
        logs.push({ id: d.id, ...data, date });
      }
    });
    logs.sort((a, b) => b.date - a.date);
    return { success: true, logs };
  } catch (error) {
    console.error('Egzersiz kayıtları getirme hatası:', error);
    return { success: false, logs: [] };
  }
};

export const getTodayBurnedCalories = async (userId) => {
  try {
    const result = await getTodayExerciseLogs(userId);
    if (!result.success) return { success: false, totalBurned: 0 };
    const totalBurned = (result.logs || []).reduce((sum, log) => sum + (log.burnedCalories || 0), 0);
    return { success: true, totalBurned };
  } catch (error) {
    console.error('Yakılan kalori getirme hatası:', error);
    return { success: false, totalBurned: 0 };
  }
};

export const deleteExerciseLog = async (userId, logId) => {
  try {
    const docRef = doc(db, COLLECTION, logId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Egzersiz silme hatası:', error);
    return { success: false, error: error.message };
  }
};
