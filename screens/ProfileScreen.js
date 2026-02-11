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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth } from '../config/firebase';
import { getUserData, updateUserProfile } from '../services/authService';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { allowOnlyNumbers, allowNumbersAndOneDecimal, parseBirthDate, formatBirthDate } from '../utils/validation';

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
    mealTimes: [],
  });

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
        setUserData({
          name: currentUser.displayName || '',
          email: currentUser.email || '',
          gender: result.data.gender || '',
          height: result.data.height?.toString() || '',
          weight: result.data.weight?.toString() || '',
          birthDate: birth,
          goal: result.data.goal || 'maintain',
          mealTimes: result.data.mealTimes || '',
        });
      }
    } catch (error) {
      console.error('Profil yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBirthDateChange = (event, date) => {
    setShowBirthDatePicker(Platform.OS === 'ios');
    if (date) {
      setUserData({ ...userData, birthDate: formatBirthDate(date) });
    }
  };

  const handleUpdate = async () => {
    if (!userData.gender || !userData.height || !userData.weight || !userData.birthDate) {
      console.log('⚠️ Lütfen tüm alanları doldurun');
      return;
    }
    const heightNum = parseFloat(userData.height);
    const weightNum = parseFloat(userData.weight);
    if (isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
      console.log('⚠️ Boy 100-250 cm arasında olmalı');
      return;
    }
    if (isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
      console.log('⚠️ Kilo 30-300 kg arasında olmalı');
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
      });

      if (result.success) {
        console.log('✅ Profil güncellendi!');
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
      </ScrollView>
      <StatusBar style="light" />
    </View>
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
});
