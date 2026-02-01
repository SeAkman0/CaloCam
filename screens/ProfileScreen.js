import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { auth } from '../config/firebase';
import { getUserData, updateUserProfile } from '../services/authService';
import { signOut } from 'firebase/auth';
import { 
  requestNotificationPermissions, 
  scheduleMealReminders, 
  cancelAllNotifications,
  sendTestNotification,
  getScheduledNotifications
} from '../services/notificationService';

const GOALS = [
  { id: 'lose', label: 'Kilo Ver', icon: '📉' },
  { id: 'maintain', label: 'Koru', icon: '⚖️' },
  { id: 'gain', label: 'Kilo Al', icon: '📈' },
];

export default function ProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    height: '',
    weight: '',
    birthDate: '',
    goal: 'maintain',
    mealTimes: [],
  });

  useEffect(() => {
    loadUserData();
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    const result = await getScheduledNotifications();
    if (result.success) {
      setScheduledCount(result.notifications.length);
      setNotificationsEnabled(result.notifications.length > 0);
    }
  };

  const loadUserData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        navigation.navigate('Welcome');
        return;
      }

      const result = await getUserData(currentUser.uid);
      if (result.success) {
        setUserData({
          name: currentUser.displayName || '',
          email: currentUser.email || '',
          height: result.data.height?.toString() || '',
          weight: result.data.weight?.toString() || '',
          birthDate: result.data.birthDate || '',
          goal: result.data.goal || 'maintain',
          mealTimes: result.data.mealTimes || [],
        });
      }
    } catch (error) {
      console.error('Profil yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    // Validasyon
    if (!userData.height || !userData.weight || !userData.birthDate) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const result = await updateUserProfile(currentUser.uid, {
        height: parseFloat(userData.height),
        weight: parseFloat(userData.weight),
        birthDate: userData.birthDate,
        goal: userData.goal,
      });

      if (result.success) {
        Alert.alert('Başarılı', 'Profiliniz güncellendi!');
      } else {
        Alert.alert('Hata', 'Güncelleme başarısız oldu');
      }
    } catch (error) {
      Alert.alert('Hata', 'Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
            } catch (error) {
              Alert.alert('Hata', 'Çıkış yapılamadı');
            }
          },
        },
      ]
    );
  };

  const handleToggleNotifications = async (value) => {
    if (value) {
      // Bildirimleri aç
      const permResult = await requestNotificationPermissions();
      
      if (permResult.success) {
        const scheduleResult = await scheduleMealReminders(userData.mealTimes);
        
        if (scheduleResult.success) {
          setNotificationsEnabled(true);
          await checkNotificationStatus();
          Alert.alert('Başarılı', scheduleResult.message);
        } else {
          Alert.alert('Hata', 'Bildirimler ayarlanamadı');
        }
      } else {
        Alert.alert('İzin Gerekli', 'Bildirimler için izin vermelisiniz');
        setNotificationsEnabled(false);
      }
    } else {
      // Bildirimleri kapat
      const result = await cancelAllNotifications();
      
      if (result.success) {
        setNotificationsEnabled(false);
        setScheduledCount(0);
        Alert.alert('Başarılı', 'Tüm bildirimler iptal edildi');
      }
    }
  };

  const handleTestNotification = async () => {
    const result = await sendTestNotification();
    
    if (result.success) {
      Alert.alert('Başarılı', 'Test bildirimi 1 saniye içinde gelecek!');
    } else {
      Alert.alert('Hata', 'Test bildirimi gönderilemedi');
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
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Profilim</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Kullanıcı Bilgileri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap Bilgileri</Text>
          
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
            <Text style={styles.label}>Boy (cm) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: 175"
              placeholderTextColor="#666"
              value={userData.height}
              onChangeText={(value) => setUserData({ ...userData, height: value })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kilo (kg) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: 70"
              placeholderTextColor="#666"
              value={userData.weight}
              onChangeText={(value) => setUserData({ ...userData, weight: value })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Doğum Tarihi (GG/AA/YYYY) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: 15/06/1990"
              placeholderTextColor="#666"
              value={userData.birthDate}
              onChangeText={(value) => setUserData({ ...userData, birthDate: value })}
              keyboardType="numeric"
              maxLength={10}
            />
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

        {/* Bildirim Ayarları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bildirimler 🔔</Text>
          
          <View style={styles.notificationCard}>
            <View style={styles.notificationRow}>
              <View style={styles.notificationInfo}>
                <Text style={styles.notificationTitle}>Öğün Hatırlatmaları</Text>
                <Text style={styles.notificationSubtitle}>
                  {scheduledCount > 0 
                    ? `${scheduledCount} hatırlatma aktif` 
                    : 'Kapalı'}
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#2a3447', true: '#4CAF50' }}
                thumbColor={notificationsEnabled ? '#fff' : '#888'}
              />
            </View>
          </View>

          {notificationsEnabled && (
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestNotification}
            >
              <Text style={styles.testButtonText}>🧪 Test Bildirimi Gönder</Text>
            </TouchableOpacity>
          )}
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#16213e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
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
  // Notification Styles
  notificationCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  notificationSubtitle: {
    fontSize: 13,
    color: '#888',
  },
  testButton: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  testButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
});
