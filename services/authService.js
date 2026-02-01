import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

// WebBrowser'ı tamamlandığında otomatik kapat
WebBrowser.maybeCompleteAuthSession();

// Email/Password ile kayıt
export const signUpWithEmail = async (email, password, name) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Kullanıcı profilini güncelle
    await updateProfile(user, {
      displayName: name
    });

    // Firestore'da kullanıcı bilgilerini kaydet
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name: name,
      email: email,
      createdAt: new Date().toISOString(),
      photoURL: user.photoURL || null
    });

    return { success: true, user };
  } catch (error) {
    console.error('Kayıt hatası:', error);
    return { success: false, error: error.message };
  }
};

// Email/Password ile giriş
export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Giriş hatası:', error);
    let errorMessage = 'Giriş yapılamadı';
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'Bu email ile kayıtlı kullanıcı bulunamadı';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Hatalı şifre';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Geçersiz email adresi';
    }
    
    return { success: false, error: errorMessage };
  }
};

// Google Sign-In için OAuth config
const GOOGLE_WEB_CLIENT_ID = '508065699314-YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = '508065699314-YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = '508065699314-YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';

// Google ile giriş/kayıt - Expo Auth Session kullanarak
export const signInWithGoogle = async () => {
  try {
    // NOT: Bu fonksiyon artık component içinde hook ile kullanılmalı
    // Şimdilik basit bir hata mesajı dönüyoruz
    return { 
      success: false, 
      error: 'Google Sign-In şu an kullanılamıyor. Lütfen email ile giriş yapın.' 
    };
  } catch (error) {
    console.error('Google giriş hatası:', error);
    return { success: false, error: error.message };
  }
};

// Google ID Token ile Firebase'e giriş (component'ten çağrılacak)
export const signInWithGoogleToken = async (idToken) => {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    const user = result.user;
    
    // Kullanıcı ilk defa mı giriş yapıyor kontrol et
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      // Yeni kullanıcı - Firestore'a kaydet
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: new Date().toISOString()
      });
    }
    
    return { success: true, user };
  } catch (error) {
    console.error('Google token giriş hatası:', error);
    return { success: false, error: error.message };
  }
};

// Çıkış yap
export const logOut = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Çıkış hatası:', error);
    return { success: false, error: error.message };
  }
};

// Kullanıcı bilgilerini Firestore'dan al
export const getUserData = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() };
    }
    return { success: false, error: 'Kullanıcı bulunamadı' };
  } catch (error) {
    console.error('Kullanıcı verisi alma hatası:', error);
    return { success: false, error: error.message };
  }
};

// Kullanıcı profil verilerini güncelle (onboarding)
export const updateUserProfile = async (uid, profileData) => {
  try {
    await setDoc(doc(db, 'users', uid), {
      ...profileData,
      updatedAt: new Date().toISOString(),
      onboardingCompleted: true,
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Profil güncelleme hatası:', error);
    return { success: false, error: error.message };
  }
};
