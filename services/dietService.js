import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { EXAMPLE_DIETS } from '../data/exampleDiets';

const COLLECTION = 'diets';

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
