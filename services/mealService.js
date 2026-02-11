import { collection, addDoc, query, where, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// Öğün ekle
export const addMeal = async (userId, mealData) => {
  try {
    const mealsRef = collection(db, 'meals');
    
    const mealDoc = await addDoc(mealsRef, {
      userId: userId,
      mealType: mealData.mealType,
      items: mealData.items, // [{ name, portion, calories }]
      totalCalories: mealData.totalCalories,
      date: Timestamp.now(),
      createdAt: Timestamp.now(),
    });

    return { success: true, mealId: mealDoc.id };
  } catch (error) {
    console.error('Öğün ekleme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Bugünün öğünlerini getir
export const getTodayMeals = async (userId) => {
  try {
    const mealsRef = collection(db, 'meals');
    
    // SADECE userId ile sorgula (index gerektirmez)
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
        date: doc.data().date.toDate(), // Timestamp'i Date'e çevir
      });
    });

    // Client-side'da bugünün tarihine göre filtrele
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayMeals = allMeals.filter(meal => {
      const mealDate = new Date(meal.date);
      return mealDate >= today && mealDate < tomorrow;
    });

    // En yeniden eskiye sırala
    todayMeals.sort((a, b) => b.date - a.date);

    return { success: true, meals: todayMeals };
  } catch (error) {
    console.error('Öğünleri getirme hatası:', error);
    return { success: false, error: error.message, meals: [] };
  }
};

// Bugünün toplam kalorisini hesapla
export const getTodayTotalCalories = async (userId) => {
  try {
    const result = await getTodayMeals(userId);
    
    if (result.success) {
      const totalCalories = result.meals.reduce((sum, meal) => {
        const mealCalories = meal.totalCalories || 0;
        return sum + mealCalories;
      }, 0);
      return { success: true, totalCalories };
    }
    
    return { success: false, totalCalories: 0 };
  } catch (error) {
    console.error('Kalori hesaplama hatası:', error);
    return { success: false, totalCalories: 0 };
  }
};

// Öğün sil
export const deleteMeal = async (mealId) => {
  try {
    const mealRef = doc(db, 'meals', mealId);
    await deleteDoc(mealRef);
    
    console.log(`🗑️ Öğün silindi: ${mealId}`);
    return { success: true };
  } catch (error) {
    console.error('Öğün silme hatası:', error);
    return { success: false, error: error.message };
  }
};
