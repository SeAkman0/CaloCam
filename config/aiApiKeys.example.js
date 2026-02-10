// AI API Keys Configuration - EXAMPLE FILE
// 1. Bu dosyayı kopyalayın: config/aiApiKeys.js
// 2. API anahtarlarınızı doldurun
// 3. ASLA config/aiApiKeys.js dosyasını Git'e eklemeyin!

export const AI_API_KEYS = {
  // Google Gemini Pro Vision API Key
  // Nasıl alınır: https://makersuite.google.com/app/apikey
  // Ücretsiz: Sınırsız (fair use policy - 60 request/dakika)
  GEMINI_API_KEY: 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  
  // USDA FoodData Central API Key
  // Nasıl alınır: https://fdc.nal.usda.gov/api-key-signup.html
  // Tamamen ücretsiz - sınırsız
  USDA_API_KEY: 'your_usda_api_key_here',
};

// API anahtarlarının varlığını kontrol et
export const checkAIAPIKeys = () => {
  const missing = [];
  
  if (!AI_API_KEYS.GEMINI_API_KEY) missing.push('Gemini API Key');
  if (!AI_API_KEYS.USDA_API_KEY) missing.push('USDA API Key');
  
  if (missing.length > 0) {
    console.warn('⚠️ Eksik AI API anahtarları:', missing.join(', '));
    console.warn('❌ Fotoğraf analizi çalışmayacak. config/aiApiKeys.js dosyasını doldurun.');
    return false;
  }
  
  console.log('✅ Tüm AI API anahtarları mevcut - Gemini Pro Vision aktif!');
  return true;
};
