import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// Belirli tarih aralığındaki öğünleri getir
export const getMealsByDateRange = async (userId, startDate, endDate) => {
  try {
    const mealsRef = collection(db, 'meals');
    
    // Sadece userId ile sorgula, tarihleri client-side filtrele
    const q = query(
      mealsRef,
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const allMeals = [];
    
    querySnapshot.forEach((doc) => {
      allMeals.push({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
      });
    });

    // Tarih aralığına göre filtrele
    const filteredMeals = allMeals.filter(meal => {
      const mealDate = new Date(meal.date);
      return mealDate >= startDate && mealDate <= endDate;
    });

    // Tarihe göre sırala
    filteredMeals.sort((a, b) => a.date - b.date);

    return { success: true, meals: filteredMeals };
  } catch (error) {
    console.error('Öğün getirme hatası:', error);
    return { success: false, error: error.message, meals: [] };
  }
};

// Son 7 günün istatistiklerini getir
export const getWeeklyStats = async (userId) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);

    const result = await getMealsByDateRange(userId, weekAgo, today);
    
    if (!result.success) {
      return result;
    }

    // Günlük kalori toplamları
    const dailyCalories = {};
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    
    // Son 7 günü başlat
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekAgo);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      const dayName = dayNames[date.getDay()];
      
      dailyCalories[dateKey] = {
        date: dateKey,
        dayName,
        calories: 0,
        meals: 0,
      };
    }

    // Öğünleri gruplama
    result.meals.forEach(meal => {
      const dateKey = meal.date.toISOString().split('T')[0];
      if (dailyCalories[dateKey]) {
        dailyCalories[dateKey].calories += meal.totalCalories || 0;
        dailyCalories[dateKey].meals += 1;
      }
    });

    const weekData = Object.values(dailyCalories);
    const totalCalories = weekData.reduce((sum, day) => sum + day.calories, 0);
    const avgCalories = Math.round(totalCalories / 7);
    const totalMeals = weekData.reduce((sum, day) => sum + day.meals, 0);

    return {
      success: true,
      weekData,
      summary: {
        totalCalories,
        avgCalories,
        totalMeals,
        avgMeals: Math.round(totalMeals / 7),
      }
    };
  } catch (error) {
    console.error('Haftalık istatistik hatası:', error);
    return { success: false, error: error.message };
  }
};

// Son 30 günün istatistiklerini getir
export const getMonthlyStats = async (userId) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 29);
    monthAgo.setHours(0, 0, 0, 0);

    const result = await getMealsByDateRange(userId, monthAgo, today);
    
    if (!result.success) {
      return result;
    }

    const totalCalories = result.meals.reduce((sum, meal) => sum + (meal.totalCalories || 0), 0);
    const totalMeals = result.meals.length;
    const avgCalories = totalMeals > 0 ? Math.round(totalCalories / 30) : 0;

    // En çok yenen yiyecekler
    const foodFrequency = {};
    result.meals.forEach(meal => {
      if (meal.items && Array.isArray(meal.items)) {
        meal.items.forEach(item => {
          if (!foodFrequency[item.name]) {
            foodFrequency[item.name] = {
              name: item.name,
              count: 0,
              totalCalories: 0,
            };
          }
          foodFrequency[item.name].count += 1;
          foodFrequency[item.name].totalCalories += item.calories || 0;
        });
      }
    });

    const topFoods = Object.values(foodFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Öğün türü dağılımı
    const mealTypeDistribution = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snack: 0,
    };

    result.meals.forEach(meal => {
      if (mealTypeDistribution[meal.mealType] !== undefined) {
        mealTypeDistribution[meal.mealType] += 1;
      }
    });

    return {
      success: true,
      summary: {
        totalCalories,
        avgCalories,
        totalMeals,
        avgMeals: Math.round(totalMeals / 30),
        topFoods,
        mealTypeDistribution,
      }
    };
  } catch (error) {
    console.error('Aylık istatistik hatası:', error);
    return { success: false, error: error.message };
  }
};

// Hedef başarı oranını hesapla
export const getGoalProgress = async (userId, targetCalories) => {
  try {
    const result = await getWeeklyStats(userId);
    
    if (!result.success) {
      return { success: false, error: result.error };
    }

    let successfulDays = 0;
    result.weekData.forEach(day => {
      const difference = Math.abs(day.calories - targetCalories);
      const tolerance = targetCalories * 0.1; // %10 tolerans
      
      if (difference <= tolerance) {
        successfulDays++;
      }
    });

    const successRate = Math.round((successfulDays / 7) * 100);

    return {
      success: true,
      successfulDays,
      successRate,
      weekData: result.weekData,
    };
  } catch (error) {
    console.error('Hedef ilerleme hatası:', error);
    return { success: false, error: error.message };
  }
};
