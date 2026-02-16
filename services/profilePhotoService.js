import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@calocam_profile_photo_';
const MAX_BASE64_LENGTH = 500000;

/** Telefonda kayıtlı profil fotoğrafını getirir (base64). */
export const getProfilePhoto = async (userId) => {
  try {
    if (!userId) return null;
    const value = await AsyncStorage.getItem(KEY_PREFIX + userId);
    return value || null;
  } catch (e) {
    console.warn('Profil fotoğrafı okunamadı:', e);
    return null;
  }
};

/** Profil fotoğrafını telefona kaydeder (base64). */
export const setProfilePhoto = async (userId, base64) => {
  try {
    if (!userId) return { success: false, error: 'Kullanıcı yok' };
    const toSave = base64.length > MAX_BASE64_LENGTH ? base64.slice(0, MAX_BASE64_LENGTH) : base64;
    await AsyncStorage.setItem(KEY_PREFIX + userId, toSave);
    return { success: true };
  } catch (e) {
    console.warn('Profil fotoğrafı kaydedilemedi:', e);
    return { success: false, error: e.message };
  }
};
