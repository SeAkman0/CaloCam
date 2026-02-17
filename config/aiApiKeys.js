// AI API Keys Configuration
// Bu dosyayı .gitignore'a ekleyin!

export const AI_API_KEYS = {
  // Google Gemini Pro Vision API Key
  // Nasıl alınır: https://makersuite.google.com/app/apikey
  // Ücretsiz: Sınırsız (fair use)
  GEMINI_API_KEY: 'AIzaSyBjzC59GGjQfWOr9Zcb7CgWEuBKfWUHaGs',
  
  // USDA FoodData Central API Key
  // Nasıl alınır: https://fdc.nal.usda.gov/api-key-signup.html
  // Ücretsiz: Sınırsız
  USDA_API_KEY: 'TUAdWCUgUwRY9D8gpEdqc463lmGyrkftWwpkAwPD',
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
