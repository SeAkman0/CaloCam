# 🍎 CaloCam - Kalori Takip Uygulaması

Modern ve kullanıcı dostu bir kalori takip uygulaması. React Native (Expo) ve Firebase ile geliştirilmiştir.

## 📱 Özellikler

### ✅ Tamamlanan Özellikler:
- ✅ Modern ve karanlık tema tasarımı
- ✅ Hoş geldin ekranı
- ✅ Email/Password ile kayıt olma
- ✅ Email/Password ile giriş yapma
- ✅ Google ile giriş yapma (yapılandırma gerekli)
- ✅ Firebase Authentication entegrasyonu
- ✅ Firestore veritabanı entegrasyonu
- ✅ Kullanıcı verilerinin güvenli saklanması

### 🚧 Geliştirilecek Özellikler:
- 🔲 Kullanıcı profili ve ilk kurulum soruları (boy, kilo, öğün sayısı)
- 🔲 Dashboard / Ana ekran
- 🔲 Manuel öğün ekleme
- 🔲 Fotoğraf ile öğün ekleme (AI analizi)
- 🔲 Kalori takibi ve grafikleri
- 🔲 Bildirimler
- 🔲 Çoklu cihaz senkronizasyonu

## 🚀 Kurulum

### 1. Projeyi İndirin
```bash
git clone [repo-url]
cd CaloCam
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Firebase Kurulumu
**Detaylı kurulum için:** [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) dosyasına bakın.

**Kısaca:**
1. https://console.firebase.google.com/ adresine gidin
2. "CaloCam" adında yeni proje oluşturun
3. Authentication'ı etkinleştirin (Email/Password ve Google)
4. Firestore Database oluşturun
5. Config bilgileriniz zaten `config/firebase.js` dosyasına eklenmiş

### 4. Uygulamayı Çalıştırın
```bash
npx expo start
```

Android emülatörde çalıştırmak için:
```bash
npx expo start --android
```

## 📂 Proje Yapısı

```
CaloCam/
├── screens/               # Ekranlar
│   ├── WelcomeScreen.js  # Hoş geldin ekranı
│   ├── LoginScreen.js    # Giriş ekranı
│   └── SignupScreen.js   # Kayıt ekranı
├── components/            # Tekrar kullanılabilir bileşenler
│   └── GoogleIcon.js     # Google ikonu
├── services/              # Servisler
│   └── authService.js    # Authentication servisleri
├── config/                # Yapılandırma dosyaları
│   └── firebase.js       # Firebase config (GİZLİ!)
├── App.js                # Ana uygulama ve navigation
└── package.json          # Bağımlılıklar

```

## 🎨 Tasarım

- **Renk Paleti:**
  - Ana arka plan: `#1a1a2e` (Koyu lacivert)
  - İkincil arka plan: `#16213e` (Lacivert)
  - Vurgu rengi: `#4CAF50` (Yeşil)
  - Metin: `#ffffff` (Beyaz) ve `#b4b4b4` (Gri)

- **Tipografi:**
  - Başlıklar: Bold, 32-48px
  - Gövde metni: Regular, 14-18px

## 🔐 Güvenlik

- Firebase config dosyası `.gitignore`'a eklenmiştir
- Firestore kuralları ile her kullanıcı sadece kendi verilerine erişebilir
- Şifreler Firebase Authentication tarafından güvenli şekilde saklanır

## 🛠️ Teknolojiler

- **React Native** (Expo SDK 54)
- **Firebase** (Authentication + Firestore)
- **React Navigation** (Native Stack)
- **Expo Vector Icons**

## 📝 Lisans

Bu proje özel bir projedir.

## 👨‍💻 Geliştirici

CaloCam - 2026
