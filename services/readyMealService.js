import { collection, addDoc, query, where, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// Hazır Öğün Ekle
export const addReadyMeal = async (userId, mealData) => {
  try {
    const readyMealsRef = collection(db, 'ready_meals');
    
    const readyMealDoc = await addDoc(readyMealsRef, {
      userId: userId,
      name: mealData.name, // Örn: "Klasik Kahvaltım"
      category: mealData.category, // breakfast, lunch, dinner, snack
      items: mealData.items, // [{ name, portion, calories, protein, carbs, fat }]
      totalCalories: mealData.totalCalories,
      createdAt: Timestamp.now(),
    });

    return { success: true, id: readyMealDoc.id };
  } catch (error) {
    console.error('Hazır öğün ekleme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Hazır Öğünleri Getir
export const getReadyMeals = async (userId) => {
  try {
    const readyMealsRef = collection(db, 'ready_meals');
    const q = query(readyMealsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const meals = [];
    querySnapshot.forEach((doc) => {
      meals.push({ id: doc.id, ...doc.data() });
    });

    // İsmine göre sırala (opsiyonel)
    meals.sort((a, b) => a.name.localeCompare(b.name));

    return { success: true, meals };
  } catch (error) {
    console.error('Hazır öğünleri getirme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Hazır Öğün Sil
export const deleteReadyMeal = async (mealId) => {
  try {
    const mealRef = doc(db, 'ready_meals', mealId);
    await deleteDoc(mealRef);
    return { success: true };
  } catch (error) {
    console.error('Hazır öğün silme hatası:', error);
    return { success: false, error: error.message };
  }
};
