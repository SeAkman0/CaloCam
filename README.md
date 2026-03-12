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
- ✅ AI destekli yemek kalori tespiti
- ✅ Barkod okuyucu ve USDA veritabanı entegrasyonu
- ✅ Gelişmiş kalori, makro ve su takibi

## 📸 Ekran Görüntüleri

<div align="center">
  <table>
    <tr>
      <td align="center">
        <b>Hoş Gedin / Açılış</b><br/>
        <img src="screenshots/açılış ekranı.png" width="200"/>
      </td>
      <td align="center">
        <b>Ana Sayfa</b><br/>
        <img src="screenshots/ana sayfa.png" width="200"/>
      </td>
      <td align="center">
        <b>Ana Sayfa (Alternatif)</b><br/>
        <img src="screenshots/ana sayfa2.png" width="200"/>
      </td>
    </tr>
    <tr>
      <td align="center">
        <b>Öğün Ekle (AI & Barkod)</b><br/>
        <img src="screenshots/öğün ekle.png" width="200"/>
      </td>
      <td align="center">
        <b>AI Kalori Detayları</b><br/>
        <img src="screenshots/yiyecek kalori detayları.png" width="200"/>
      </td>
      <td align="center">
        <b>AI Kalori Detayları 2</b><br/>
        <img src="screenshots/yiyecek kalori detayları2.png" width="200"/>
      </td>
    </tr>
    <tr>
      <td align="center">
        <b>Hazır Öğünler</b><br/>
        <img src="screenshots/hazır öğünler.png" width="200"/>
      </td>
      <td align="center">
        <b>Diyet Listeleri</b><br/>
        <img src="screenshots/diyet listeleri.png" width="200"/>
      </td>
      <td align="center">
        <b>Egzersiz Takibi</b><br/>
        <img src="screenshots/egzersiz.png" width="200"/>
      </td>
    </tr>
    <tr>
      <td align="center">
        <b>İstatistikler (Günlük)</b><br/>
        <img src="screenshots/istatistikler.png" width="200"/>
      </td>
      <td align="center">
        <b>İstatistikler (Haftalık)</b><br/>
        <img src="screenshots/istatistikler2.png" width="200"/>
      </td>
      <td align="center">
        <b>Profil Ayarları</b><br/>
        <img src="screenshots/profile.png" width="200"/>
      </td>
    </tr>
  </table>
</div>

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
