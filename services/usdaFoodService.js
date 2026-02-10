// USDA FoodData Central API Service
import { AI_API_KEYS } from '../config/aiApiKeys';

const USDA_API_URL = 'https://api.nal.usda.gov/fdc/v1';

/**
 * USDA FoodData'dan yemek ara
 * @param {string} foodName - Yemek adı
 * @returns {Promise<Object>} - Yemek bilgileri
 */
export const searchFoodInUSDA = async (foodName) => {
  try {
    // API key kontrolü
    if (!AI_API_KEYS.USDA_API_KEY) {
      console.warn('USDA API key bulunamadı');
      return { success: false, error: 'API_KEY_MISSING' };
    }

    const response = await fetch(
      `${USDA_API_URL}/foods/search?api_key=${AI_API_KEYS.USDA_API_KEY}&query=${encodeURIComponent(foodName)}&pageSize=5`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('USDA API hatası');
    }

    const data = await response.json();
    const foods = data.foods || [];

    if (foods.length === 0) {
      return { success: false, error: 'Yemek bulunamadı' };
    }

    // İlk sonucu al
    const food = foods[0];
    const nutrients = extractNutrients(food);

    return {
      success: true,
      food: {
        id: food.fdcId,
        name: food.description,
        brand: food.brandOwner || null,
        calories: nutrients.calories,
        protein: nutrients.protein,
        carbs: nutrients.carbs,
        fat: nutrients.fat,
        servingSize: food.servingSize || 100,
        servingUnit: food.servingSizeUnit || 'g',
      },
    };
  } catch (error) {
    console.error('USDA search hatası:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Besin değerlerini extract et
 */
const extractNutrients = (food) => {
  const nutrients = food.foodNutrients || [];
  
  const findNutrient = (nutrientId) => {
    const nutrient = nutrients.find(n => n.nutrientId === nutrientId);
    return nutrient ? parseFloat(nutrient.value) : 0;
  };

  return {
    calories: findNutrient(1008), // Energy (kcal)
    protein: findNutrient(1003),  // Protein
    carbs: findNutrient(1005),    // Carbohydrate
    fat: findNutrient(1004),      // Total lipid (fat)
  };
};

/**
 * Gramaja göre kalori hesapla
 * @param {number} caloriesPer100g - 100g başına kalori
 * @param {number} grams - Gramaj
 * @returns {number} - Toplam kalori
 */
export const calculateCaloriesForGrams = (caloriesPer100g, grams) => {
  return Math.round((caloriesPer100g * grams) / 100);
};

/**
 * Türkçe yemek adını İngilizce'ye çevir (basit mapping)
 */
const turkishToEnglishFood = {
  'pilav': 'rice',
  'makarna': 'pasta',
  'tavuk': 'chicken',
  'et': 'beef',
  'balık': 'fish',
  'patates': 'potato',
  'domates': 'tomato',
  'salatalık': 'cucumber',
  'ekmek': 'bread',
  'peynir': 'cheese',
  'yumurta': 'egg',
  'süt': 'milk',
  'yoğurt': 'yogurt',
  'elma': 'apple',
  'muz': 'banana',
  'portakal': 'orange',
  'salata': 'salad',
  'çorba': 'soup',
  'kek': 'cake',
  'çikolata': 'chocolate',
  'kahve': 'coffee',
  'çay': 'tea',
  'su': 'water',
  'mercimek': 'lentil',
  'fasulye': 'bean',
  'nohut': 'chickpea',
  'pirinç': 'rice',
  'bulgur': 'bulgur',
  'zeytin': 'olive',
  'tereyağı': 'butter',
  'bal': 'honey',
  'reçel': 'jam',
  'sucuk': 'sausage',
  'sosis': 'sausage',
  'hindi': 'turkey',
  'kuzu': 'lamb',
};

/**
 * Yemek adını İngilizce'ye çevir
 */
export const translateFoodName = (turkishName) => {
  const lowerName = turkishName.toLowerCase().trim();
  
  // Direkt eşleşme
  if (turkishToEnglishFood[lowerName]) {
    return turkishToEnglishFood[lowerName];
  }
  
  // Kısmi eşleşme
  for (const [tr, en] of Object.entries(turkishToEnglishFood)) {
    if (lowerName.includes(tr)) {
      return en;
    }
  }
  
  // Bulunamadıysa orijinal adı döndür
  return turkishName;
};

/**
 * USDA'yı test et
 */
export const testUSDAConnection = async () => {
  try {
    if (!AI_API_KEYS.USDA_API_KEY) {
      return { success: false, error: 'API key yok' };
    }

    const result = await searchFoodInUSDA('apple');
    
    if (result.success) {
      return { success: true, message: 'USDA bağlantısı başarılı!' };
    } else {
      return { success: false, error: 'API key geçersiz' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};
