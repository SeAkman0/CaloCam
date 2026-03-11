import {
  collection,
  getDocs,
  doc,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  updateDoc,
  increment,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { EXAMPLE_DIETS } from '../data/exampleDiets';

const COLLECTION = 'diets';
const REVIEWS_COLLECTION = 'diet_reviews';

/**
 * Bir diyet için yorum ve puan ekler. 
 * Aynı zamanda diyetin ortalama puanını günceller.
 */
export const addDietReview = async (dietId, userId, userName, rating, comment) => {
  try {
    // 1. Yorumu ekle
    const reviewData = {
      dietId,
      userId,
      userName,
      rating,
      comment,
      createdAt: new Date().toISOString()
    };
    await addDoc(collection(db, REVIEWS_COLLECTION), reviewData);

    // 2. Diyetin toplam puanını ve yorum sayısını güncelle
    const dietRef = doc(db, COLLECTION, String(dietId));
    const dietSnap = await getDoc(dietRef);

    if (dietSnap.exists()) {
      const data = dietSnap.exists() ? dietSnap.data() : {};
      const currentRating = data.rating || 0;
      const currentReviews = data.reviews || 0;

      // Basit ağırlıklı ortalama hesabı
      const newReviews = currentReviews + 1;
      const newRating = ((currentRating * currentReviews) + rating) / newReviews;

      await updateDoc(dietRef, {
        rating: Number(newRating.toFixed(1)),
        reviews: newReviews
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Yorum ekleme hatası:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Belirli bir diyetin yorumlarını getirir.
 */
export const getDietReviews = async (dietId) => {
  try {
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      where('dietId', '==', dietId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const reviews = [];
    snapshot.forEach((doc) => {
      reviews.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, reviews };
  } catch (error) {
    console.error('Yorumları getirme hatası:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Yerel örnek diyet listesini döndürür (Firebase erişilemediğinde kullanılır).
 */
export const getLocalDiets = () => ({
  success: true,
  diets: [...EXAMPLE_DIETS],
  fromLocal: true,
});

/**
 * Firestore'dan tüm diyet listesini getirir (giriş yapmış kullanıcı).
 * İzin hatası veya başka hata olursa yerel örnek listeyi döndürür.
 */
export const getDiets = async () => {
  try {
    const dietsRef = collection(db, COLLECTION);
    const snapshot = await getDocs(dietsRef);
    const list = [];
    snapshot.forEach((d) => {
      list.push({
        id: d.id,
        ...d.data(),
      });
    });
    list.sort((a, b) => {
      const na = parseInt(a.id, 10) || 0;
      const nb = parseInt(b.id, 10) || 0;
      return na - nb;
    });
    return { success: true, diets: list, fromLocal: false };
  } catch (error) {
    console.error('Diyet listesi getirme hatası:', error);
    // İzin veya ağ hatası: yerel listeyi kullan ki ekran çalışsın
    return getLocalDiets();
  }
};

/**
 * Örnek diyet verilerini Firestore'a yükler (bir kez çalıştırılabilir).
 * Doküman id = diyet id olduğu için tekrar çalıştırmak üzerine yazar, çoğaltmaz.
 */
export const seedDietsToFirebase = async () => {
  try {
    for (const diet of EXAMPLE_DIETS) {
      const docRef = doc(db, COLLECTION, String(diet.id));
      await setDoc(docRef, {
        name: diet.name,
        icon: diet.icon,
        shortDesc: diet.shortDesc,
        category: diet.category || 'Diğer',
        rating: diet.rating || 0,
        reviews: diet.reviews || 0,
        targetCalories: diet.targetCalories,
        calorieRange: diet.calorieRange,
        tags: diet.tags || [],
        description: diet.description || '',
        benefits: diet.benefits || [],
        tips: diet.tips || [],
        foodsToEat: diet.foodsToEat || [],
        foodsToAvoid: diet.foodsToAvoid || [],
      });
    }
    console.log('✅ Örnek diyetler Firebase\'e yüklendi.');
    return { success: true };
  } catch (error) {
    console.error('Diyet verisi yükleme hatası:', error);
    return { success: false, error: error.message };
  }
};
