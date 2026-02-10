# 🤖 Gemini Pro Vision AI Kurulum Rehberi

CaloCam uygulamasında **Google Gemini Pro Vision** ve **USDA FoodData Central** API entegrasyonu!

---

## 🎯 Neler Yapılacak?

1. **Gemini Pro Vision** → Fotoğraftan yemek tespiti + gramaj tahmini
2. **USDA FoodData** → Yemek için kalori, protein, karbonhidrat, yağ bilgileri

**Sonuç**: Fotoğraf çek → AI yemekleri tespit et → Otomatik kalori hesapla! 📸🍽️

---

## 🔑 Adım 1: Gemini API Key Al (ÜCRETSİZ)

### 1.1 Google AI Studio'ya Git
```
https://makersuite.google.com/app/apikey
```

### 1.2 Google Hesabınızla Giriş Yapın
- Gmail hesabınızı kullanın
- Terms of Service'i kabul edin

### 1.3 API Key Oluştur
1. **"Create API Key"** butonuna tıklayın
2. Mevcut bir Google Cloud projesi seçin veya yeni oluşturun
3. API key otomatik oluşturulacak
4. **Kopyalayın** ve güvenli bir yere kaydedin

### 📊 Ücretsiz Limitler
```
✅ 60 request/dakika
✅ 1,500 request/gün
✅ Kredi kartı GEREKMİYOR
✅ Fair use policy
```

### ⚠️ Önemli Notlar
- API key'i kimseyle paylaşmayın
- Client-side'da expose etmeyin (şimdilik test için OK)
- Production'da backend'den çağırın

---

## 🍽️ Adım 2: USDA FoodData API Key Al (ÜCRETSİZ)

### 2.1 USDA FoodData Central'a Git
```
https://fdc.nal.usda.gov/api-key-signup.html
```

### 2.2 Formu Doldurun
- **Email**: Geçerli email adresiniz
- **First Name**: Adınız
- **Last Name**: Soyadınız
- **Organization**: Kişisel kullanım için "Personal" yazabilirsiniz

### 2.3 Email Doğrulama
1. Email'inizi kontrol edin
2. USDA'dan gelen email'i açın
3. API key'i kopyalayın

### 📊 Ücretsiz Limitler
```
✅ SINIRSIZ request
✅ Kredi kartı GEREKMİYOR
✅ Throttle yok (makul kullanım)
✅ 2+ milyon yemek veritabanı
```

---

## 🔧 Adım 3: API Key'leri Ekle

### 3.1 Config Dosyasını Oluştur

```bash
# Example dosyasını kopyala
cp config/aiApiKeys.example.js config/aiApiKeys.js

# Veya manuel oluştur
touch config/aiApiKeys.js
```

### 3.2 API Key'leri Ekle

`config/aiApiKeys.js` dosyasını açın ve doldurun:

```javascript
export const AI_API_KEYS = {
  // Gemini API Key (makersuite.google.com'dan aldığınız)
  GEMINI_API_KEY: 'AIzaSyC...your_key_here',
  
  // USDA API Key (email'inize gelen)
  USDA_API_KEY: 'abc123...your_key_here',
};

export const checkAIAPIKeys = () => {
  const missing = [];
  
  if (!AI_API_KEYS.GEMINI_API_KEY) missing.push('Gemini API Key');
  if (!AI_API_KEYS.USDA_API_KEY) missing.push('USDA API Key');
  
  if (missing.length > 0) {
    console.warn('⚠️ Eksik AI API anahtarları:', missing.join(', '));
    console.warn('📦 Mock veri kullanılacak.');
    return false;
  }
  
  console.log('✅ Tüm AI API anahtarları mevcut!');
  return true;
};
```

### 3.3 Dosyayı Kaydet
- ✅ `config/aiApiKeys.js` dosyasını kaydedin
- ⚠️ **ÖNEMLİ**: Bu dosya `.gitignore`'da olduğundan Git'e eklenmeyecek
- ⚠️ **ASLA** bu dosyayı paylaşmayın veya commit etmeyin!

---

## 🧪 Adım 4: Test Et

### 4.1 Uygulamayı Başlat
```bash
npx expo start --clear
```

### 4.2 Console Log'ları Kontrol Et

**Başarılı (API key'ler mevcut):**
```bash
✅ Tüm AI API anahtarları mevcut - Gemini Pro Vision aktif!
```

**Başarısız (API key'ler eksik):**
```bash
⚠️ Eksik AI API anahtarları: Gemini API Key, USDA API Key
📦 Mock veri kullanılacak.
```

### 4.3 Fotoğraf Analizi Test

1. Uygulamayı açın
2. **"Öğün Ekle"** → **Fotoğraf Seç**
3. Yemek fotoğrafı seçin (test için internetten bir yemek fotoğrafı indirebilirsiniz)
4. **"Fotoğraf Analiz Et"** butonuna tıklayın
5. Console log'ları izleyin:

```bash
🔍 Resim analizi başlıyor...
📸 Resim base64'e çevriliyor...
🤖 Gemini Pro Vision analizi yapılıyor...
✅ Gemini 3 yemek tespit etti
🍽️ USDA'dan kalori bilgileri alınıyor...
  - "Pilav" → "rice" aranıyor...
    ✓ Pilav: 195 kcal
  - "Tavuk" → "chicken" aranıyor...
    ✓ Tavuk: 248 kcal
  - "Salata" → "salad" aranıyor...
    ✓ Salata: 15 kcal
🎉 3 yemek başarıyla analiz edildi!
```

---

## 📊 Nasıl Çalışır?

### Akış Diyagramı

```
📸 Kullanıcı Fotoğraf Çeker
    ↓
🔄 Base64'e Çevir
    ↓
🤖 Gemini Pro Vision API
    Input: Base64 image
    Prompt: "Bu resimde hangi yemekler var? Gramaj tahmin et"
    ↓
📝 Gemini Cevabı:
    "Pilav|150g|0.85
     Tavuk göğüs|120g|0.90
     Salata|80g|0.75"
    ↓
🔄 Parse Et (her satır = 1 yemek)
    ↓
🍽️ Her yemek için USDA FoodData API
    1. Türkçe → İngilizce çevir
    2. USDA'da ara
    3. Kalori, protein, carbs, fat al
    4. Gramaja göre hesapla
    ↓
✅ Kullanıcıya Göster
    → Gemini'nin bulduğu yemekler
    → USDA'dan gelen kalori bilgileri
    → Gramaj düzenlenebilir
    → Kalori otomatik güncellenir
```

### Örnek İstek ve Cevap

**Gemini'ye Giden Prompt:**
```
Bu resimde hangi yemekler var? Lütfen şu formatta listele:

Her yemek için:
- Yemek adı (Türkçe)
- Tahmini gramaj
- Güvenlik skoru (0.0-1.0)

Format:
Yemek1|150g|0.85
Yemek2|200g|0.90

Sadece listeyi ver, açıklama ekleme.
```

**Gemini'den Gelen Cevap:**
```
Pilav|150g|0.85
Tavuk göğüs|120g|0.90
Salata|80g|0.75
```

**USDA'ya Giden Request:**
```
GET https://api.nal.usda.gov/fdc/v1/foods/search
?api_key=YOUR_KEY
&query=rice
&pageSize=5
```

**USDA'dan Gelen Cevap:**
```json
{
  "foods": [{
    "fdcId": 169756,
    "description": "Rice, white, long-grain, regular, cooked",
    "foodNutrients": [
      { "nutrientId": 1008, "value": 130 },  // Calories
      { "nutrientId": 1003, "value": 2.7 },  // Protein
      { "nutrientId": 1005, "value": 28.2 }, // Carbs
      { "nutrientId": 1004, "value": 0.3 }   // Fat
    ]
  }]
}
```

---

## ❓ Sorun Giderme

### Hata: "API_KEY_MISSING"
**Sebep**: `config/aiApiKeys.js` dosyasında key'ler eksik

**Çözüm**:
1. `config/aiApiKeys.js` dosyasını açın
2. API key'leri ekleyin (boş string bırakmayın)
3. Uygulamayı yeniden başlatın

---

### Hata: "Gemini API hatası"
**Olası Sebepler**:
1. ❌ API key yanlış → Key'i kontrol edin
2. ❌ Limit aşıldı → 60 request/dakika limiti (1 dakika bekleyin)
3. ❌ İnternet yok → Bağlantıyı kontrol edin

**Çözüm**:
- Gemini Studio'dan key'i tekrar kontrol edin
- Console'da detaylı hata mesajını okuyun
- Test et: `testGeminiConnection()` fonksiyonunu çağırın

---

### Hata: "USDA'da bulunamadı"
**Sebep**: Yemek adı USDA veritabanında yok

**Normal Davranış**: 
- Sistem otomatik local database'e geçer
- Console'da göreceksiniz: "Local database kullanılıyor..."

**İyileştirme**:
- `services/usdaFoodService.js` → `turkishToEnglishFood` mapping'i genişletin
- Daha fazla Türkçe yemek ekleyin

---

### Mock Veri Kullanılıyor
**Sebep**: API key'ler yok veya hata var

**Kontrol Et**:
1. `config/aiApiKeys.js` dosyası var mı?
2. Key'ler dolu mu? (boş string değil)
3. İnternet bağlantısı var mı?
4. Console log'ları ne diyor?

---

## 💡 İpuçları

### 1. Doğruluğu Artırın
- **Iyi aydınlatılmış** fotoğraflar kullanın
- **Net** fotoğraflar çekin
- Yemeği **yakından** çekin
- **Tek yemek** yerine **komple tabak** fotoğrafı daha iyi

### 2. Performansı Artırın
- Fotoğraf boyutunu küçültün (max 1024px)
- Compression kullanın
- Gereksiz yere API çağrısı yapmayın

### 3. Maliyet Kontrolü
- Gemini: 60 request/dakika (çok bol!)
- USDA: Sınırsız (harika!)
- Fotoğraf başına ~1-3 API çağrısı

### 4. Offline Desteği
- Local database zaten var
- API yoksa otomatik fallback
- Cache ekleyerek daha da hızlandırabilirsiniz

---

## 📱 Production'a Alma

### Güvenlik Kontrol Listesi
- [ ] `config/aiApiKeys.js` dosyası `.gitignore`'da
- [ ] API key'ler environment variables'da
- [ ] Backend'den API çağrısı yapın (client-side'da expose etmeyin)
- [ ] Rate limiting ekleyin
- [ ] Error handling güçlendirin

### Backend Yapısı (Önerilen)
```
Mobile App → Firebase Functions → Gemini + USDA
                ↓
          API keys güvende!
```

---

## 🔗 Faydalı Linkler

- [Gemini API Docs](https://ai.google.dev/docs)
- [USDA FoodData Central](https://fdc.nal.usda.gov/)
- [Gemini Pricing](https://ai.google.dev/pricing) (ücretsiz çok bol!)
- [USDA API Docs](https://fdc.nal.usda.gov/api-guide.html)

---

## 🎉 Sonuç

API key'leri aldıktan sonra:

✅ **Fotoğraf çek** → AI otomatik yemekleri tespit eder  
✅ **Gramaj tahmin edilir** → Sen düzenleyebilirsin  
✅ **Kalori otomatik hesaplanır** → Protein, carbs, fat da gelir  
✅ **Tamamen ücretsiz** → İki API de ücretsiz tier'da bol bol limit  

**Başarılar! CaloCam artık AI destekli! 🚀🤖**
