// AI Food Recognition Service
// Gemini Pro Vision + USDA FoodData Central entegrasyonu

import { detectFoodWithGemini, imageToBase64 } from './geminiVisionService';
import { searchFoodInUSDA, translateFoodName, calculateCaloriesForGrams } from './usdaFoodService';
import { checkAIAPIKeys } from '../config/aiApiKeys';

// Mock food database - fallback için
const COMMON_FOODS = {
  // Kahvaltılıklar
  'bread': { name: 'Ekmek', caloriesPer100g: 265, protein: 9, carbs: 49, fat: 3.2, defaultGrams: 50 },
  'cheese': { name: 'Beyaz Peynir', caloriesPer100g: 264, protein: 18, carbs: 1.3, fat: 21, defaultGrams: 50 },
  'egg': { name: 'Yumurta', caloriesPer100g: 155, protein: 13, carbs: 1.1, fat: 11, defaultGrams: 60 },
  'tomato': { name: 'Domates', caloriesPer100g: 18, protein: 0.9, carbs: 3.9, fat: 0.2, defaultGrams: 100 },
  'cucumber': { name: 'Salatalık', caloriesPer100g: 16, protein: 0.7, carbs: 3.6, fat: 0.1, defaultGrams: 100 },
  'olive': { name: 'Zeytin', caloriesPer100g: 115, protein: 0.8, carbs: 6.3, fat: 10.7, defaultGrams: 30 },
  'butter': { name: 'Tereyağı', caloriesPer100g: 717, protein: 0.9, carbs: 0.1, fat: 81, defaultGrams: 10 },
  'jam': { name: 'Reçel', caloriesPer100g: 278, protein: 0.4, carbs: 69, fat: 0.1, defaultGrams: 20 },
  'honey': { name: 'Bal', caloriesPer100g: 304, protein: 0.3, carbs: 82, fat: 0, defaultGrams: 20 },
  'sausage': { name: 'Sucuk', caloriesPer100g: 473, protein: 18, carbs: 1, fat: 44, defaultGrams: 50 },
  
  // Ana yemekler
  'rice': { name: 'Pilav', caloriesPer100g: 130, protein: 2.7, carbs: 28, fat: 0.3, defaultGrams: 150 },
  'pasta': { name: 'Makarna', caloriesPer100g: 158, protein: 5.8, carbs: 31, fat: 0.9, defaultGrams: 150 },
  'chicken': { name: 'Tavuk Göğsü', caloriesPer100g: 165, protein: 31, carbs: 0, fat: 3.6, defaultGrams: 150 },
  'beef': { name: 'Et', caloriesPer100g: 250, protein: 26, carbs: 0, fat: 15, defaultGrams: 100 },
  'fish': { name: 'Balık', caloriesPer100g: 206, protein: 22, carbs: 0, fat: 12, defaultGrams: 150 },
  'potato': { name: 'Patates', caloriesPer100g: 77, protein: 2, carbs: 17, fat: 0.1, defaultGrams: 150 },
  'beans': { name: 'Kuru Fasulye', caloriesPer100g: 127, protein: 9, carbs: 23, fat: 0.5, defaultGrams: 200 },
  'lentil': { name: 'Mercimek Çorbası', caloriesPer100g: 116, protein: 9, carbs: 20, fat: 0.4, defaultGrams: 250 },
  'soup': { name: 'Çorba', caloriesPer100g: 40, protein: 2, carbs: 6, fat: 1, defaultGrams: 250 },
  
  // Atıştırmalıklar
  'apple': { name: 'Elma', caloriesPer100g: 52, protein: 0.3, carbs: 14, fat: 0.2, defaultGrams: 150 },
  'banana': { name: 'Muz', caloriesPer100g: 89, protein: 1.1, carbs: 23, fat: 0.3, defaultGrams: 120 },
  'orange': { name: 'Portakal', caloriesPer100g: 47, protein: 0.9, carbs: 12, fat: 0.1, defaultGrams: 150 },
  'yogurt': { name: 'Yoğurt', caloriesPer100g: 59, protein: 10, carbs: 3.6, fat: 0.4, defaultGrams: 200 },
  'nuts': { name: 'Kuruyemiş', caloriesPer100g: 607, protein: 21, carbs: 21, fat: 54, defaultGrams: 30 },
  'chocolate': { name: 'Çikolata', caloriesPer100g: 546, protein: 5, carbs: 61, fat: 31, defaultGrams: 30 },
  'biscuit': { name: 'Bisküvi', caloriesPer100g: 502, protein: 6, carbs: 65, fat: 25, defaultGrams: 30 },
  'cake': { name: 'Kek', caloriesPer100g: 399, protein: 5, carbs: 51, fat: 20, defaultGrams: 50 },
};

/**
 * Ana AI analiz fonksiyonu - Gemini Pro Vision + USDA FoodData
 * @param {string} imageUri - Resim URI'si
 * @returns {Promise<Object>} - Tespit edilen yemekler
 */
export const analyzeFoodImage = async (imageUri) => {
  try {
    console.log('🔍 Resim analizi başlıyor...');
    
    // API key'leri kontrol et
    const hasAPIKeys = checkAIAPIKeys();
    
    if (!hasAPIKeys) {
      return {
        success: false,
        error: 'API anahtarları eksik. Lütfen config/aiApiKeys.js dosyasını doldurun.',
        foods: [],
      };
    }

    // 1. Resmi base64'e çevir
    console.log('📸 Resim base64\'e çevriliyor...');
    const base64Image = await imageToBase64(imageUri);

    // 2. Gemini Pro Vision ile yemek tespiti
    console.log('🤖 Gemini Pro Vision analizi yapılıyor...');
    const geminiResult = await detectFoodWithGemini(base64Image);

    if (!geminiResult.success) {
      return {
        success: false,
        error: `Gemini Vision hatası: ${geminiResult.error || 'Analiz edilemedi'}`,
        foods: [],
      };
    }

    console.log(`✅ Gemini ${geminiResult.foods.length} yemek tespit etti`);

    // 3. Her yemek için USDA'dan kalori bilgisi al
    console.log('🍽️ USDA\'dan kalori bilgileri alınıyor...');
    const detectedFoods = [];
    
    for (const geminiFood of geminiResult.foods) {
      try {
        // Yemek adını İngilizce'ye çevir
        const englishName = translateFoodName(geminiFood.name);
        console.log(`  - "${geminiFood.name}" → "${englishName}" aranıyor...`);
        
        const usdaResult = await searchFoodInUSDA(englishName);
        
        if (usdaResult.success) {
          const food = usdaResult.food;
          const calories = calculateCaloriesForGrams(food.calories, geminiFood.grams);
          
          detectedFoods.push({
            id: geminiFood.id,
            name: geminiFood.name, // Türkçe adı kullan
            portion: `${geminiFood.grams}g`,
            grams: geminiFood.grams,
            caloriesPer100g: Math.round(food.calories),
            calories,
            protein: Math.round((food.protein * geminiFood.grams) / 100),
            carbs: Math.round((food.carbs * geminiFood.grams) / 100),
            fat: Math.round((food.fat * geminiFood.grams) / 100),
            confidence: geminiFood.confidence,
            source: 'gemini+usda',
          });
          
          console.log(`    ✓ ${geminiFood.name}: ${calories} kcal`);
        } else {
          // USDA'da bulunamadı, local database dene
          console.log(`    ⚠️ USDA'da bulunamadı, local database deneniyor...`);
          const localFood = findLocalFood(geminiFood.name);
          if (localFood) {
            detectedFoods.push({
              id: geminiFood.id,
              name: geminiFood.name,
              portion: `${geminiFood.grams}g`,
              grams: geminiFood.grams,
              caloriesPer100g: localFood.caloriesPer100g,
              calories: Math.round((localFood.caloriesPer100g * geminiFood.grams) / 100),
              protein: Math.round((localFood.protein * geminiFood.grams) / 100),
              carbs: Math.round((localFood.carbs * geminiFood.grams) / 100),
              fat: Math.round((localFood.fat * geminiFood.grams) / 100),
              confidence: geminiFood.confidence,
              source: 'gemini+local',
            });
            console.log(`    ✓ Local'de bulundu`);
          }
        }
      } catch (error) {
        console.warn(`USDA'da "${geminiFood.name}" bulunamadı:`, error.message);
      }
    }

    // Eğer hiç yemek tespit edilemedi ise hata döndür
    if (detectedFoods.length === 0) {
      console.warn('⚠️ Hiç yemek tespit edilemedi');
      return {
        success: false,
        error: 'Resimde yemek tespit edilemedi. Lütfen daha net bir fotoğraf çekin.',
        foods: [],
      };
    }

    console.log(`🎉 ${detectedFoods.length} yemek başarıyla analiz edildi!`);

    return {
      success: true,
      foods: detectedFoods,
      message: `${detectedFoods.length} yemek tespit edildi! Gramaj ve kaloriyi düzenleyebilirsin.`,
      geminiRawText: geminiResult.rawText,
    };
  } catch (error) {
    console.error('❌ AI analiz hatası:', error);
    
    return {
      success: false,
      error: `Analiz hatası: ${error.message}`,
      foods: [],
    };
  }
};

/**
 * Local database'den yemek bul (fallback için)
 */
const findLocalFood = (foodName) => {
  const lowerName = foodName.toLowerCase();
  
  for (const [key, food] of Object.entries(COMMON_FOODS)) {
    if (
      food.name.toLowerCase().includes(lowerName) ||
      lowerName.includes(food.name.toLowerCase()) ||
      key.includes(lowerName)
    ) {
      return food;
    }
  }
  
  return null;
};

/**
 * Manuel yemek arama fonksiyonu
 */
export const searchFood = (query) => {
  const results = [];
  const lowerQuery = query.toLowerCase();

  for (const [key, food] of Object.entries(COMMON_FOODS)) {
    if (food.name.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: key,
        name: food.name,
        caloriesPer100g: food.caloriesPer100g,
        defaultGrams: food.defaultGrams,
      });
    }
  }

  return results;
};

/**
 * Kalori hesaplama yardımcı fonksiyonu
 */
export const calculateCalories = (caloriesPer100g, grams) => {
  return Math.round((caloriesPer100g * grams) / 100);
};

/* 
  ✅ KULLANILAN AI SİSTEMİ:
  
  1. Google Gemini Pro Vision:
     - Resimden yemek tespiti + gramaj tahmini
     - Ücretsiz: Sınırsız (fair use policy)
     - Setup: https://makersuite.google.com/app/apikey
     
  2. USDA FoodData Central:
     - Yemek besin değerleri (kalori, protein, karbonhidrat, yağ)
     - Tamamen ücretsiz
     - Setup: https://fdc.nal.usda.gov/api-key-signup.html
     
  3. Local Database (Fallback):
     - API hata verirse veya key yoksa kullanılır
     - Türkçe yemek desteği
     
  KURULUM:
  1. config/aiApiKeys.js dosyasını doldurun
  2. Gemini API key alın (ücretsiz)
  3. USDA API key alın (ücretsiz)
  4. .gitignore'a config/aiApiKeys.js ekleyin
*/
