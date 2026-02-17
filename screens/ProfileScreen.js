import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../config/firebase';
import { getUserData, updateUserProfile } from '../services/authService';
import { getProfilePhoto, setProfilePhoto } from '../services/profilePhotoService';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { allowOnlyNumbers, allowNumbersAndOneDecimal, parseBirthDate, formatBirthDate } from '../utils/validation';
import { scheduleMealNotifications, cancelAllNotifications, saveNotificationPreference, getNotificationPreference } from '../services/notificationService';

const GOALS = [
  { id: 'lose', label: 'Kilo Ver', icon: '📉' },
  { id: 'maintain', label: 'Koru', icon: '⚖️' },
  { id: 'gain', label: 'Kilo Al', icon: '📈' },
];

export default function ProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    gender: '',
    height: '',
    weight: '',
    birthDate: '',
    goal: 'maintain',
    mealsPerDay: '',
    mealTimes: [],
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(null);
  const [profilePhoto, setProfilePhotoState] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        navigation.navigate('Welcome');
        return;
      }

      const result = await getUserData(currentUser.uid);
      if (result.success) {
        const birth = result.data.birthDate || '';
        const rawMealTimes = result.data.mealTimes;
        const mealTimesArray = Array.isArray(rawMealTimes)
          ? rawMealTimes
          : (typeof rawMealTimes === 'string' && rawMealTimes.trim()
            ? rawMealTimes.split(',').map((t) => t.trim()).filter(Boolean)
            : []);
        const mealsPerDay = result.data.mealsPerDay;
        setUserData({
          name: currentUser.displayName || '',
          email: currentUser.email || '',
          gender: result.data.gender || '',
          height: result.data.height?.toString() || '',
          weight: result.data.weight?.toString() || '',
          birthDate: birth,
          goal: result.data.goal || 'maintain',
          mealsPerDay: mealsPerDay != null ? String(mealsPerDay) : '',
          mealTimes: mealTimesArray.length > 0 ? mealTimesArray : [],
        });

        // Bildirim tercihini getir
        const pref = await getNotificationPreference(currentUser.uid);
        setNotificationsEnabled(pref);

        const photo = await getProfilePhoto(currentUser.uid);
        setProfilePhotoState(photo);
      }
    } catch (error) {
      console.error('Profil yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickProfilePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin gerekli', 'Profil fotoğrafı seçmek için galeri erişimine izin verin.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.45,
        base64: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const base64 = result.assets[0].base64;
      if (!base64) {
        Alert.alert('Hata', 'Fotoğraf yüklenemedi.');
        return;
      }
      setUploadingPhoto(true);
      const saveResult = await setProfilePhoto(auth.currentUser.uid, base64);
      if (saveResult.success) {
        setProfilePhotoState(base64);
        Alert.alert('Başarılı', 'Profil fotoğrafın telefona kaydedildi.');
      } else {
        Alert.alert('Hata', saveResult.error || 'Kaydedilemedi.');
      }
    } catch (err) {
      Alert.alert('Hata', err.message || 'Fotoğraf seçilemedi.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleBirthDateChange = (event, date) => {
    setShowBirthDatePicker(Platform.OS === 'ios');
    if (date) {
      setUserData({ ...userData, birthDate: formatBirthDate(date) });
    }
  };

  const handleMealsPerDayChange = (count) => {
    const defaultTimes = [];
    const startHour = 8;
    const interval = Math.floor(12 / count);
    for (let i = 0; i < count; i++) {
      const hour = startHour + (interval * i);
      defaultTimes.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    setUserData({
      ...userData,
      mealsPerDay: count.toString(),
      mealTimes: defaultTimes,
    });
  };

  const checkAndScheduleNotifications = async (times, enabled) => {
    if (enabled) {
      await scheduleMealNotifications(times);
    } else {
      await cancelAllNotifications();
    }
  };

  const handleNotificationToggle = async (value) => {
    setNotificationsEnabled(value);
    const currentUser = auth.currentUser;
    if (currentUser) {
      await saveNotificationPreference(currentUser.uid, value);
    }

    // Anlık olarak güncelle
    await checkAndScheduleNotifications(userData.mealTimes, value);
  };

  const updateMealTime = (index, time) => {
    const newTimes = [...userData.mealTimes];
    newTimes[index] = time;
    setUserData({ ...userData, mealTimes: newTimes });
  };

  const handleTimeChange = (event, time) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time != null && selectedTimeIndex !== null) {
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      updateMealTime(selectedTimeIndex, `${hours}:${minutes}`);
    }
  };

  const openTimePicker = (index) => {
    setSelectedTimeIndex(index);
    setShowTimePicker(true);
  };

  const getTimePickerValue = () => {
    if (selectedTimeIndex == null || !userData.mealTimes[selectedTimeIndex]) return new Date();
    const [h, m] = userData.mealTimes[selectedTimeIndex].split(':').map(Number);
    const d = new Date();
    d.setHours(isNaN(h) ? 8 : h, isNaN(m) ? 0 : m, 0, 0);
    return d;
  };

  const handleUpdate = async () => {
    const heightStr = (userData.height || '').trim();
    const weightStr = (userData.weight || '').trim();
    const birthStr = (userData.birthDate || '').trim();
    if (!userData.gender || !heightStr || !weightStr || !birthStr) {
      Alert.alert('Girdinizi Kontrol Edin', 'Lütfen cinsiyet, boy, kilo ve doğum tarihi alanlarını doldurun. Boş bırakamazsınız.');
      return;
    }
    const heightNum = parseFloat(heightStr);
    const weightNum = parseFloat(weightStr);
    if (isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
      Alert.alert('Girdinizi Kontrol Edin', 'Boy 100–250 cm arasında olmalıdır. Lütfen geçerli bir değer girin.');
      return;
    }
    if (isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
      Alert.alert('Girdinizi Kontrol Edin', 'Kilo 30–300 kg arasında olmalıdır. Lütfen geçerli bir değer girin.');
      return;
    }
    if (!userData.mealsPerDay || !userData.mealTimes || userData.mealTimes.length === 0) {
      Alert.alert('Girdinizi Kontrol Edin', 'Lütfen günlük öğün sayısını seçin.');
      return;
    }

    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const result = await updateUserProfile(currentUser.uid, {
        gender: userData.gender,
        height: parseFloat(userData.height),
        weight: parseFloat(userData.weight),
        birthDate: userData.birthDate,
        goal: userData.goal,
        mealsPerDay: parseInt(userData.mealsPerDay, 10),
        mealTimes: userData.mealTimes,
      });

      if (result.success) {
        console.log('✅ Profil güncellendi!');
        // Bildirimleri güncelle (eğer saatler değiştiyse ve bildirimler açıksa)
        if (notificationsEnabled) {
          await scheduleMealNotifications(userData.mealTimes);
        } else {
          await cancelAllNotifications();
        }
        navigation.goBack();
      } else {
        console.log('❌ Güncelleme başarısız oldu');
      }
    } catch (error) {
      console.log('❌ Bir hata oluştu:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Çıkış yapılıyor...');
      await signOut(auth);
      console.log('✅ Çıkış başarılı');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
    } catch (error) {
      console.log('❌ Çıkış yapılamadı:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Profilim</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Profil Fotoğrafı (telefonda saklanır) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil Fotoğrafı</Text>
          <View style={styles.photoSection}>
            <TouchableOpacity
              style={styles.avatarTouchable}
              onPress={pickProfilePhoto}
              disabled={uploadingPhoto}
            >
              {profilePhoto ? (
                <Image source={{ uri: 'data:image/jpeg;base64,' + profilePhoto }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={48} color="#666" />
                </View>
              )}
              {uploadingPhoto && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.changePhotoButton} onPress={pickProfilePhoto} disabled={uploadingPhoto}>
              <Text style={styles.changePhotoButtonText}>
                {profilePhoto ? 'Fotoğrafı değiştir' : 'Profil fotoğrafı ekle'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Kullanıcı Bilgileri (güncellenemez) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap Bilgileri</Text>
          <Text style={styles.readOnlyHint}>Ad ve e-posta giriş sırasında belirlenir, güncellenemez.</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ad Soyad</Text>
              <Text style={styles.infoValue}>{userData.name || 'Belirtilmemiş'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>E-posta</Text>
              <Text style={styles.infoValue}>{userData.email}</Text>
            </View>
          </View>
        </View>

        {/* Fiziksel Bilgiler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fiziksel Bilgiler</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cinsiyet *</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  userData.gender === 'male' && styles.genderButtonActive
                ]}
                onPress={() => setUserData({ ...userData, gender: 'male' })}
              >
                <Text style={styles.genderIcon}>👨</Text>
                <Text style={[
                  styles.genderButtonText,
                  userData.gender === 'male' && styles.genderButtonTextActive
                ]}>
                  Erkek
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.genderButton,
                  userData.gender === 'female' && styles.genderButtonActive
                ]}
                onPress={() => setUserData({ ...userData, gender: 'female' })}
              >
                <Text style={styles.genderIcon}>👩</Text>
                <Text style={[
                  styles.genderButtonText,
                  userData.gender === 'female' && styles.genderButtonTextActive
                ]}>
                  Kadın
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Boy (cm) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: 175"
              placeholderTextColor="#666"
              value={userData.height}
              onChangeText={(value) => setUserData({ ...userData, height: allowOnlyNumbers(value).slice(0, 3) })}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kilo (kg) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: 70 veya 70.5"
              placeholderTextColor="#666"
              value={userData.weight}
              onChangeText={(value) => setUserData({ ...userData, weight: allowNumbersAndOneDecimal(value).slice(0, 6) })}
              keyboardType="decimal-pad"
              maxLength={6}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Doğum Tarihi *</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowBirthDatePicker(true)}
            >
              <Text style={[styles.datePickerButtonText, !userData.birthDate && styles.datePickerPlaceholder]}>
                {userData.birthDate || 'Tarih seçin'}
              </Text>
              <Text style={styles.datePickerIcon}>📅</Text>
            </TouchableOpacity>
            {showBirthDatePicker && (
              <DateTimePicker
                value={parseBirthDate(userData.birthDate) || new Date(1990, 5, 15)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleBirthDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
            )}
          </View>
        </View>

        {/* Bildirim Ayarları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bildirim Ayarları</Text>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Öğün Hatırlatıcıları</Text>
              <Text style={styles.settingHint}>Öğün saatlerinde bildirim al.</Text>
            </View>
            <Switch
              trackColor={{ false: "#767577", true: "#4CAF50" }}
              thumbColor={notificationsEnabled ? "#fff" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={handleNotificationToggle}
              value={notificationsEnabled}
            />
          </View>
        </View>

        {/* Günlük Öğün */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Günlük Öğün</Text>
          <Text style={styles.readOnlyHint}>Günde kaç öğün yediğinizi ve öğün saatlerinizi seçin.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Günlük Öğün Sayısı</Text>
            <View style={styles.mealButtonContainer}>
              {[2, 3, 4, 5, 6].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.mealButton,
                    userData.mealsPerDay === num.toString() && styles.mealButtonActive
                  ]}
                  onPress={() => handleMealsPerDayChange(num)}
                >
                  <Text style={[
                    styles.mealButtonText,
                    userData.mealsPerDay === num.toString() && styles.mealButtonTextActive
                  ]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {userData.mealTimes.length > 0 && (
            <View style={styles.mealTimesContainer}>
              <Text style={styles.label}>Öğün Saatleri</Text>
              {userData.mealTimes.map((time, index) => (
                <View key={index} style={styles.timeInputGroup}>
                  <Text style={styles.timeLabel}>{index + 1}. Öğün:</Text>
                  <TouchableOpacity
                    style={styles.timePickerButton}
                    onPress={() => openTimePicker(index)}
                  >
                    <Text style={styles.timePickerText}>{time}</Text>
                    <Text style={styles.timePickerIcon}>🕐</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {showTimePicker && selectedTimeIndex !== null && (
                <DateTimePicker
                  value={getTimePickerValue()}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                />
              )}
            </View>
          )}
        </View>

        {/* Hedef */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hedefiniz</Text>

          <View style={styles.goalsContainer}>
            {GOALS.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.goalButton,
                  userData.goal === goal.id && styles.goalButtonActive
                ]}
                onPress={() => setUserData({ ...userData, goal: goal.id })}
              >
                <Text style={styles.goalIcon}>{goal.icon}</Text>
                <Text style={[
                  styles.goalLabel,
                  userData.goal === goal.id && styles.goalLabelActive
                ]}>
                  {goal.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Güncelle Butonu */}
        <TouchableOpacity
          style={[styles.updateButton, saving && styles.buttonDisabled]}
          onPress={handleUpdate}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.updateButtonText}>Güncelle</Text>
          )}
        </TouchableOpacity>

        {/* Çıkış Yap Butonu */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>🚪 Çıkış Yap</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView >
      <StatusBar style="light" />
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#252542',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarTouchable: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#16213e',
    borderWidth: 2,
    borderColor: '#2a3447',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  changePhotoButtonText: {
    fontSize: 15,
    color: '#4CAF50',
    fontWeight: '600',
  },
  readOnlyHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#2a3447',
  },
  infoLabel: {
    fontSize: 14,
    color: '#888',
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#b4b4b4',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  datePickerPlaceholder: {
    color: '#666',
  },
  datePickerIcon: {
    fontSize: 20,
  },
  goalsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  goalButton: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a3447',
  },
  goalButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#1e3a28',
  },
  goalIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  goalLabel: {
    fontSize: 13,
    color: '#b4b4b4',
    fontWeight: '600',
  },
  goalLabelActive: {
    color: '#4CAF50',
  },
  updateButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a3447',
  },
  genderButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#1e3a28',
  },
  genderIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  genderButtonText: {
    fontSize: 14,
    color: '#b4b4b4',
    fontWeight: '600',
  },
  genderButtonTextActive: {
    color: '#4CAF50',
  },
  logoutButton: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ff4444',
  },
  logoutButtonText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mealButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  mealButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#2a3447',
    alignItems: 'center',
  },
  mealButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  mealButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#b4b4b4',
  },
  mealButtonTextActive: {
    color: '#fff',
  },
  mealTimesContainer: {
    marginTop: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#16213e',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  settingLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  settingHint: {
    fontSize: 12,
    color: '#888',
  },
  timeInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a3447',
    marginTop: 16,
  },
  timeLabel: {
    fontSize: 14,
    color: '#b4b4b4',
    fontWeight: '600',
    flex: 1,
  },
  timePickerButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    gap: 8,
  },
  timePickerText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  timePickerIcon: {
    fontSize: 18,
  },
});
