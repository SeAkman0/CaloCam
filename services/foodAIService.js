// AI Food Recognition Service
// Gemini Pro Vision + USDA FoodData Central entegrasyonu

import { detectFoodWithGemini, imageToBase64 } from './geminiVisionService';
import { searchFoodInUSDA, translateFoodName, calculateCaloriesForGrams } from './usdaFoodService';
import { AI_API_KEYS, checkAIAPIKeys } from '../config/aiApiKeys';

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
        error: geminiResult.isQuotaError ? 'Kota doldu daha sonra tekrar deneyin' : `Gemini Vision hatası: ${geminiResult.error || 'Analiz edilemedi'}`,
        isQuotaError: geminiResult.isQuotaError,
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

    const isQuotaError = error.message.includes('429') || 
                         error.message.toLowerCase().includes('quota') || 
                         error.message.toLowerCase().includes('rate limit');

    return {
      success: false,
      error: isQuotaError ? 'Kota doldu daha sonra tekrar deneyin' : `Analiz hatası: ${error.message}`,
      isQuotaError,
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
 * AI ile tarif/yemek analizi - Karmaşık yemekleri malzemelerine ayırır
 * Örn: "trileçe" → süt, krema, yumurta, şeker, un, vb.
 * @param {string} foodName - Yemek adı (Türkçe)
 * @param {number|null} totalGrams - Toplam porsiyon gramı (opsiyonel)
 * @returns {Promise<Object>} - Malzeme listesi ve besin değerleri
 */
export const analyzeRecipeWithAI = async (foodName, totalGrams = null) => {
  try {
    if (!AI_API_KEYS.GEMINI_API_KEY) {
      console.warn('Gemini API key bulunamadı');
      return { success: false, error: 'Gemini API key bulunamadı.' };
    }

    const portionNote = totalGrams
      ? `KRİTİK: Kullanıcı TOPLAM ${totalGrams}g porsiyon girdi. Tüm malzemelerin gramajları toplandığında TAM OLARAK ${totalGrams}g olmalıdır! Standart tarifi ${totalGrams}g'a orantılı olarak küçült veya büyüt.`
      : `Standart bir porsiyon (~1 kişilik, yaklaşık 150-200g) için malzemeleri hesapla.`;

    const exampleGrams = totalGrams || 200;
    const prompt = `"${foodName}" isimli yiyeceğin/yemeğin PİŞMİŞ HALİNİ analiz et.

${portionNote}

Bu yemeğin İÇİNDEKİ HER MALZEMEYİ ayrı ayrı listele.
Her malzeme için:
- Türkçe adı
- Bu porsiyondaki gramajı (PİŞMİŞ ağırlığı)
- Kalori (kcal)
- Protein (g)
- Karbonhidrat (g)
- Yağ (g)

ÇOK ÖNEMLİ KURALLAR:
1. Sadece aşağıdaki FORMAT ile yanıt ver, başka açıklama ekleme.
2. Besin değerlerini o malzemenin belirtilen gramajına göre hesapla (100g başına değil).
3. Tüm değerler tam sayı olsun (ondalık kullanma).
4. Her malzeme ayrı satır olsun.
5. Eğer yemek tek bir basit malzeme ise (mesela "elma", "yumurta"), sadece kendisini listele.
6. TÜM MALZEMELERİN GRAMAJLARI TOPLAMDA ${totalGrams ? totalGrams + 'g OLMALI' : 'yaklaşık 150-200g olmalı'}! Bu en önemli kural.
7. ASLA aynı malzemeyi hem çiğ hem pişmiş olarak listeleme! Sadece PİŞMİŞ/HAZIRLANMIŞ halini yaz.
   YANLIŞ: "Kuru Fasulye" + "Kuru Fasulye (Pişmiş)" → MÜKERRER!
   DOĞRU: Sadece "Kuru Fasulye" yaz ve PİŞMİŞ ağırlığı/besin değerini kullan.
8. Su, pişirme suyu, kaynatma suyu gibi maddeleri ASLA listeleme. Bunlar kalori içermez ve gereksizdir.
9. Her malzeme SADECE BİR KEZ görünmeli. Aynı malzemenin farklı formlarını (çiğ/pişmiş/kurutulmuş) birleştir.
10. Besin değerleri yemeğin TABAKTA SUNULDUĞU HALİNE göre olmalı (pişmiş, hazırlanmış).

FORMAT (her satır):
MalzemeAdı|gramaj|kalori|protein|karbonhidrat|yağ

Örnek (${exampleGrams}g kuru fasulye yemeği - gramajlar toplamı ${exampleGrams}):
Kuru Fasulye|${Math.round(exampleGrams * 0.45)}|${Math.round(exampleGrams * 0.45 * 1.27)}|${Math.round(exampleGrams * 0.45 * 0.09)}|${Math.round(exampleGrams * 0.45 * 0.22)}|${Math.round(exampleGrams * 0.45 * 0.005)}
Domates Sosu|${Math.round(exampleGrams * 0.25)}|${Math.round(exampleGrams * 0.25 * 0.29)}|${Math.round(exampleGrams * 0.25 * 0.01)}|${Math.round(exampleGrams * 0.25 * 0.06)}|${Math.round(exampleGrams * 0.25 * 0.002)}
Soğan|${Math.round(exampleGrams * 0.12)}|${Math.round(exampleGrams * 0.12 * 0.4)}|${Math.round(exampleGrams * 0.12 * 0.01)}|${Math.round(exampleGrams * 0.12 * 0.09)}|0
Sıvı Yağ|${Math.round(exampleGrams * 0.05)}|${Math.round(exampleGrams * 0.05 * 8.84)}|0|0|${Math.round(exampleGrams * 0.05 * 1.0)}
Biber Salçası|${Math.round(exampleGrams * 0.03)}|${Math.round(exampleGrams * 0.03 * 1.17)}|${Math.round(exampleGrams * 0.03 * 0.04)}|${Math.round(exampleGrams * 0.03 * 0.24)}|${Math.round(exampleGrams * 0.03 * 0.01)}`;


    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      },
    };

    console.log(`🧑‍🍳 AI tarif analizi başlıyor: "${foodName}"...`);

    // Retry mekanizması - rate limit ve high demand hatalarını yönet
    const MAX_RETRIES = 3;
    const MODELS = [
      'gemini-2.5-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash',  // Son deneme fallback model
    ];
    let response = null;
    let lastError = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const model = MODELS[attempt] || MODELS[0];
      try {
        if (attempt > 0) {
          const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`   ⏳ ${waitTime / 1000}s bekleniyor (deneme ${attempt + 1}/${MAX_RETRIES}, model: ${model})...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${AI_API_KEYS.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }
        );

        if (response.ok) {
          break; // Başarılı, döngüden çık
        }

        const errorData = await response.json();
        lastError = errorData.error?.message || 'Gemini API hatası';

        // 429 veya 503 ise retry yap
        if (response.status === 429 || response.status === 503) {
          console.log(`   ⚠️ API meşgul (${response.status}), tekrar denenecek...`);
          continue;
        }

        // Diğer hatalar için direkt hata fırlat
        throw new Error(lastError);
      } catch (fetchError) {
        lastError = fetchError.message;
        if (attempt === MAX_RETRIES - 1) {
          throw new Error(lastError);
        }
      }
    }

    if (!response || !response.ok) {
      if (response && response.status === 429) {
        throw new Error('QUOTA_EXCEEDED');
      }
      throw new Error(lastError || 'Gemini API\'ye bağlanılamadı');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      throw new Error('Gemini\'den cevap alınamadı');
    }

    console.log(`📝 AI ham yanıt:\n${text}`);

    // Parse the response
    const ingredients = [];
    const lines = text.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim());

      if (parts.length >= 6) {
        const name = parts[0];
        const grams = parseInt(parts[1]) || 0;
        const calories = parseInt(parts[2]) || 0;
        const protein = parseInt(parts[3]) || 0;
        const carbs = parseInt(parts[4]) || 0;
        const fat = parseInt(parts[5]) || 0;

        if (name && name.length > 0 && grams > 0) {
          ingredients.push({
            id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name,
            grams,
            calories,
            protein,
            carbs,
            fat,
          });
        }
      }
    }

    if (ingredients.length === 0) {
      console.log('⚠️ AI malzeme parse edemedi, ham metin:', text);
      return { success: false, error: 'Malzemeler ayrıştırılamadı.' };
    }

    // === PROGRAMATIK ÖLÇEKLENDIRME ===
    // AI'ın döndürdüğü gramajlar toplamı kullanıcının girdiğiyle uyuşmayabilir
    // Bu yüzden tüm değerleri orantılı olarak ölçeklendiriyoruz
    const rawTotalGrams = ingredients.reduce((sum, ing) => sum + ing.grams, 0);

    console.log(`📝 AI ham toplam: ${rawTotalGrams}g`);

    if (totalGrams && rawTotalGrams > 0 && rawTotalGrams !== totalGrams) {
      const scaleFactor = totalGrams / rawTotalGrams;
      console.log(`⚖️ Ölçeklendirme: ${rawTotalGrams}g → ${totalGrams}g (×${scaleFactor.toFixed(2)})`);

      ingredients.forEach(ing => {
        ing.grams = Math.round(ing.grams * scaleFactor);
        ing.calories = Math.round(ing.calories * scaleFactor);
        ing.protein = Math.round(ing.protein * scaleFactor);
        ing.carbs = Math.round(ing.carbs * scaleFactor);
        ing.fat = Math.round(ing.fat * scaleFactor);
      });

      // Yuvarlama farkını düzelt - toplam gram tam olarak eşleşsin
      const scaledTotal = ingredients.reduce((sum, ing) => sum + ing.grams, 0);
      const diff = totalGrams - scaledTotal;
      if (diff !== 0 && ingredients.length > 0) {
        // En büyük malzemeye farkı ekle
        const largestIdx = ingredients.reduce((maxIdx, ing, idx, arr) =>
          ing.grams > arr[maxIdx].grams ? idx : maxIdx, 0);
        ingredients[largestIdx].grams += diff;
      }
    }

    // Toplam değerleri hesapla
    const totals = ingredients.reduce((acc, ing) => ({
      grams: acc.grams + ing.grams,
      calories: acc.calories + ing.calories,
      protein: acc.protein + ing.protein,
      carbs: acc.carbs + ing.carbs,
      fat: acc.fat + ing.fat,
    }), { grams: 0, calories: 0, protein: 0, carbs: 0, fat: 0 });

    console.log(`\n🧑‍🍳 ═══════════════════════════════════════`);
    console.log(`🍽️  "${foodName}" TARİF ANALİZİ${totalGrams ? ` (${totalGrams}g porsiyon)` : ''}`);
    console.log(`🧑‍🍳 ═══════════════════════════════════════`);
    ingredients.forEach((ing, i) => {
      console.log(`   ${i + 1}. ${ing.name}`);
      console.log(`      📏 ${ing.grams}g | 🔥 ${ing.calories} kcal | 💪 ${ing.protein}g protein | 🍞 ${ing.carbs}g karb | 🧈 ${ing.fat}g yağ`);
    });
    console.log(`   ─────────────────────────────────────`);
    console.log(`   📊 TOPLAM: ${totals.grams}g | ${totals.calories} kcal | ${totals.protein}g P | ${totals.carbs}g K | ${totals.fat}g Y`);
    console.log(`🧑‍🍳 ═══════════════════════════════════════\n`);

    return {
      success: true,
      ingredients,
      totals,
      foodName,
    };
  } catch (error) {
    console.error('❌ AI tarif analizi hatası:', error);
    const isQuotaError = error.message === 'QUOTA_EXCEEDED' || 
                         error.message.includes('429') || 
                         error.message.toLowerCase().includes('quota') || 
                         error.message.toLowerCase().includes('rate limit');
    return { 
      success: false, 
      error: isQuotaError ? 'Kota doldu daha sonra tekrar deneyin' : error.message,
      isQuotaError
    };
  }
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
