// AI Food Recognition Service
// Şimdilik mock data kullanıyoruz. Gerçek API için Clarifai veya başka servis eklenebilir.

// Mock food database - gerçek API entegrasyonu için hazır
const COMMON_FOODS = {
  // Kahvaltılıklar
  'bread': { name: 'Ekmek', caloriesPer100g: 265, defaultGrams: 50 },
  'cheese': { name: 'Beyaz Peynir', caloriesPer100g: 264, defaultGrams: 50 },
  'egg': { name: 'Yumurta', caloriesPer100g: 155, defaultGrams: 60 },
  'tomato': { name: 'Domates', caloriesPer100g: 18, defaultGrams: 100 },
  'cucumber': { name: 'Salatalık', caloriesPer100g: 16, defaultGrams: 100 },
  'olive': { name: 'Zeytin', caloriesPer100g: 115, defaultGrams: 30 },
  'butter': { name: 'Tereyağı', caloriesPer100g: 717, defaultGrams: 10 },
  'jam': { name: 'Reçel', caloriesPer100g: 278, defaultGrams: 20 },
  'honey': { name: 'Bal', caloriesPer100g: 304, defaultGrams: 20 },
  'sausage': { name: 'Sucuk', caloriesPer100g: 473, defaultGrams: 50 },
  
  // Ana yemekler
  'rice': { name: 'Pilav', caloriesPer100g: 130, defaultGrams: 150 },
  'pasta': { name: 'Makarna', caloriesPer100g: 158, defaultGrams: 150 },
  'chicken': { name: 'Tavuk Göğsü', caloriesPer100g: 165, defaultGrams: 150 },
  'beef': { name: 'Et', caloriesPer100g: 250, defaultGrams: 100 },
  'fish': { name: 'Balık', caloriesPer100g: 206, defaultGrams: 150 },
  'potato': { name: 'Patates', caloriesPer100g: 77, defaultGrams: 150 },
  'beans': { name: 'Kuru Fasulye', caloriesPer100g: 127, defaultGrams: 200 },
  'lentil': { name: 'Mercimek Çorbası', caloriesPer100g: 116, defaultGrams: 250 },
  'soup': { name: 'Çorba', caloriesPer100g: 40, defaultGrams: 250 },
  
  // Atıştırmalıklar
  'apple': { name: 'Elma', caloriesPer100g: 52, defaultGrams: 150 },
  'banana': { name: 'Muz', caloriesPer100g: 89, defaultGrams: 120 },
  'orange': { name: 'Portakal', caloriesPer100g: 47, defaultGrams: 150 },
  'yogurt': { name: 'Yoğurt', caloriesPer100g: 59, defaultGrams: 200 },
  'nuts': { name: 'Kuruyemiş', caloriesPer100g: 607, defaultGrams: 30 },
  'chocolate': { name: 'Çikolata', caloriesPer100g: 546, defaultGrams: 30 },
  'biscuit': { name: 'Bisküvi', caloriesPer100g: 502, defaultGrams: 30 },
  'cake': { name: 'Kek', caloriesPer100g: 399, defaultGrams: 50 },
};

// Mock AI analizi - gerçek AI API buraya entegre edilecek
export const analyzeFoodImage = async (imageUri) => {
  try {
    // Simülasyon için bekleme
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock sonuç - Gerçek AI API entegrasyonu için burası değiştirilecek
    // Rastgele 1-4 yiyecek seç
    const foodKeys = Object.keys(COMMON_FOODS);
    const numFoods = Math.floor(Math.random() * 3) + 1; // 1-3 yiyecek
    const selectedFoods = [];

    for (let i = 0; i < numFoods; i++) {
      const randomFood = foodKeys[Math.floor(Math.random() * foodKeys.length)];
      const food = COMMON_FOODS[randomFood];
      
      selectedFoods.push({
        id: `food_${Date.now()}_${i}`,
        name: food.name,
        portion: `${food.defaultGrams}g`,
        grams: food.defaultGrams,
        caloriesPer100g: food.caloriesPer100g,
        calories: Math.round((food.caloriesPer100g * food.defaultGrams) / 100),
        confidence: (Math.random() * 0.3 + 0.7).toFixed(2), // 0.70-1.00 arası
      });
    }

    return {
      success: true,
      foods: selectedFoods,
      message: 'Yiyecekler tespit edildi! Gramaj ve kaloriyi düzenleyebilirsin.',
    };
  } catch (error) {
    console.error('AI analiz hatası:', error);
    return {
      success: false,
      error: 'Görüntü analiz edilemedi',
      foods: [],
    };
  }
};

// Manuel yemek arama fonksiyonu
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

// Kalori hesaplama yardımcı fonksiyonu
export const calculateCalories = (caloriesPer100g, grams) => {
  return Math.round((caloriesPer100g * grams) / 100);
};

/* 
  GERÇEK AI API ENTEGRASYONU İÇİN:
  
  1. Clarifai (Ücretsiz 5000 request/ay):
     - https://www.clarifai.com/models/food-item-recognition
     
  2. Edamam Food Database API (Ücretsiz):
     - https://developer.edamam.com/food-database-api
     
  3. Nutritionix API (Limitli ücretsiz):
     - https://www.nutritionix.com/business/api
     
  4. Google Cloud Vision API (Limitli ücretsiz):
     - https://cloud.google.com/vision
*/
