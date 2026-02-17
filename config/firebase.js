import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase Console'dan alınan config bilgileri
const firebaseConfig = {
  apiKey: "AIzaSyCrcYg7VTvRcTzr3bjFu4x9CVRuX_rpTVU",
  authDomain: "calocam-466c3.firebaseapp.com",
  projectId: "calocam-466c3",
  storageBucket: "calocam-466c3.firebasestorage.app",
  messagingSenderId: "508065699314",
  appId: "1:508065699314:web:0167de3f10fe4febb6476b"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Authentication'ı AsyncStorage persistence ile başlat
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Firestore başlat
const db = getFirestore(app);

export { auth, db };
export default app;