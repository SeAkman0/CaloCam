// Google Gemini Pro Vision Service
import { AI_API_KEYS } from '../config/aiApiKeys';

// Gemini 2.5 Flash - multimodal model (2025 güncel)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

/**
 * Gemini Pro Vision ile resimden yemek tespiti
 * @param {string} base64Image - Base64 formatında resim (data:image/jpeg;base64,...)
 * @returns {Promise<Object>} - Tespit edilen yemekler ve gramajlar
 */
export const detectFoodWithGemini = async (base64Image) => {
  try {
    // API key kontrolü
    if (!AI_API_KEYS.GEMINI_API_KEY) {
      console.warn('Gemini API key bulunamadı');
      return { success: false, error: 'Gemini API key bulunamadı. config/aiApiKeys.js dosyasını doldurun.' };
    }

    // Base64'ten prefix'i temizle
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    // Gemini'ye gönderilecek prompt
    const prompt = `Bu resimde hangi yemekler var? 

ÇOK ÖNEMLİ KURALLAR:
1. Her yiyeceği AYRI AYRI listele!
2. Kombine yemekleri ayır (örn: "sucuklu yumurta" → "Sucuk" ve "Yumurta" şeklinde iki ayrı satır)
3. "Peynirli omlet" → "Peynir" ve "Yumurta" (omlet için)
4. "Menemen" → "Yumurta", "Domates", "Biber" ayrı ayrı
5. Tabakta gördüğün HER yiyeceği say ve listele

Format:
YiyecekAdı|tahmini_gramaj|güven_skoru

Örnek doğru format:
Sucuk|50g|0.9
Yumurta|60g|0.85
Ekmek|100g|0.9
Domates|80g|0.8

Sadece listeyi ver, açıklama ekleme. Her satır bir yemek olsun.`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      },
    };

    const response = await fetch(
      `${GEMINI_API_URL}?key=${AI_API_KEYS.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Gemini API hatası');
    }

    const data = await response.json();
    
    // Gemini'nin cevabını parse et
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!text) {
      throw new Error('Gemini\'den cevap alınamadı');
    }

    // Cevabı parse et
    const foods = parseFoodList(text);

    return {
      success: true,
      foods,
      rawText: text,
      message: `${foods.length} yemek tespit edildi!`,
    };
  } catch (error) {
    console.error('Gemini Vision API hatası:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Gemini'nin cevabını parse et
 * Format: "Pilav|150g|0.85"
 */
const parseFoodList = (text) => {
  const foods = [];
  const lines = text.split('\n').filter(line => line.trim());

  for (const line of lines) {
    // Format: Yemek|150g|0.85
    const parts = line.split('|').map(p => p.trim());
    
    if (parts.length >= 2) {
      const name = parts[0];
      const gramsStr = parts[1].replace(/[^\d]/g, ''); // Sadece rakamları al
      const grams = parseInt(gramsStr) || 100;
      const confidence = parts[2] ? parseFloat(parts[2]) : 0.75;

      // Boş veya geçersiz isimleri atla
      if (name && name.length > 1) {
        foods.push({
          id: `gemini_${Date.now()}_${Math.random()}`,
          name,
          grams,
          confidence: confidence.toFixed(2),
          source: 'gemini',
        });
      }
    }
  }

  return foods;
};

/**
 * Resmi base64'e çevir
 * @param {string} uri - Resim URI'si
 * @returns {Promise<string>} - Base64 string
 */
export const imageToBase64 = async (uri) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Base64 dönüştürme hatası:', error);
    throw error;
  }
};

/**
 * Gemini'yi test et
 */
export const testGeminiConnection = async () => {
  try {
    if (!AI_API_KEYS.GEMINI_API_KEY) {
      return { success: false, error: 'API key yok' };
    }

    // Basit bir test isteği
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${AI_API_KEYS.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello' }] }],
        }),
      }
    );

    if (response.ok) {
      return { success: true, message: 'Gemini bağlantısı başarılı!' };
    } else {
      return { success: false, error: 'API key geçersiz' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};
