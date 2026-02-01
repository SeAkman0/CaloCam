# 🔥 Firebase Kurulum Rehberi

## Adım 1: Firebase Projesi Oluşturun

1. **Firebase Console'a gidin:** https://console.firebase.google.com/
2. **"Add project"** (Proje ekle) butonuna tıklayın
3. **Proje adı:** `CaloCam` yazın
4. Google Analytics'i istersen etkinleştir (şimdilik gerekli değil)
5. **"Create Project"** butonuna tıklayın

## Adım 2: Web App Ekleyin

1. Proje oluştuktan sonra, **`</>`** (Web) ikonuna tıklayın
2. **App nickname:** `CaloCam` yazın
3. **"Register app"** butonuna tıklayın
4. **Firebase SDK snippet** kısmında **"Config"** seçeneğini seçin
5. Gelen **config** bilgilerini kopyalayın:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "calocam-xxxxx.firebaseapp.com",
  projectId: "calocam-xxxxx",
  storageBucket: "calocam-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

6. Bu bilgileri **`config/firebase.js`** dosyasına yapıştırın

## Adım 3: Authentication'ı Etkinleştirin

### Email/Password Authentication:
1. Sol menüden **"Build"** > **"Authentication"** seçin
2. **"Get started"** butonuna tıklayın
3. **"Sign-in method"** sekmesinde **"Email/Password"** seçin
4. **Enable** yapın ve **Save** edin

### Google Authentication:
1. Aynı sayfada **"Google"** seçin
2. **Enable** yapın
3. **Support email** seçin (Gmail adresiniz)
4. **Save** edin

## Adım 4: Firestore Database Oluşturun

1. Sol menüden **"Build"** > **"Firestore Database"** seçin
2. **"Create database"** butonuna tıklayın
3. **Production mode** seçin
4. **Firestore location** seçin (örn: europe-west3)
5. **Enable** butonuna tıklayın

## Adım 5: Firestore Kurallarını Ayarlayın

1. Firestore sayfasında **"Rules"** sekmesine gidin
2. Aşağıdaki kuralları yapıştırın:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Kullanıcılar sadece kendi verilerini görebilir ve düzenleyebilir
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Meals (öğünler) - kullanıcı sadece kendi öğünlerini görebilir
    match /meals/{mealId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
  }
}
```

3. **Publish** butonuna tıklayın

## Adım 6: Firestore Composite Index Oluşturun

Öğünleri tarihe göre sorgulamak için **composite index** gerekiyor:

1. **İlk öğünü eklediğinizde**, konsol'da şu hatayı göreceksiniz:
   ```
   The query requires an index. You can create it here: https://console.firebase.google.com/...
   ```
2. Verilen linke tıklayın ve otomatik index oluşturun

**Alternatif olarak manuel oluşturma:**
1. Firebase Console > **Firestore Database** > **Indexes** sekmesi
2. **Composite** tabına tıklayın
3. **Create Index** butonuna tıklayın:
   - **Collection ID:** `meals`
   - **Field 1:** `userId` (Ascending)
   - **Field 2:** `date` (Ascending)
   - **Query scope:** Collection
4. **Create Index** butonuna tıklayın

Index oluşması 1-2 dakika sürebilir.

## ✅ Kurulum Tamamlandı!

Artık uygulamanızda:
- ✅ Email/Password ile kayıt olabilirsiniz
- ✅ Email/Password ile giriş yapabilirsiniz
- ✅ Google ile giriş yapabilirsiniz
- ✅ Kullanıcı verileri Firestore'da saklanır
- ✅ Her kullanıcı sadece kendi verilerini görebilir

## 🚀 Test Etmek İçin:

1. Emülatörde uygulamayı açın
2. "Başlayalım" butonuna tıklayın
3. "Kayıt Ol" sekmesine gidin
4. Email ve şifre ile kayıt olun
5. Giriş yapın ve kullanmaya başlayın!

## ⚠️ Önemli Notlar:

- Firebase config bilgilerinizi **asla paylaşmayın**
- `.gitignore` dosyasına `config/firebase.js` eklenmiş mi kontrol edin
- Google Sign-In için Android'de SHA-1 fingerprint eklemeniz gerekebilir
