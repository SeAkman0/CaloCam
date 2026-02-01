import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getUserData } from '../services/authService';
import { getTodayMeals, getTodayTotalCalories } from '../services/mealService';
import { auth } from '../config/firebase';

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [dailyCalories, setDailyCalories] = useState(0);
  const [targetCalories, setTargetCalories] = useState(2000);
  const [todayMeals, setTodayMeals] = useState([]);

  useEffect(() => {
    loadUserData();
    loadTodayMeals();
    
    // Screen'e her focus olduğunda verileri yenile
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData(); // Profil güncellendiğinde hedef kalori de güncellenir
      loadTodayMeals();
    });

    return unsubscribe;
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı');
        navigation.navigate('Login');
        return;
      }

      const result = await getUserData(currentUser.uid);
      if (result.success) {
        setUserData(result.data);
        calculateTargetCalories(result.data);
      } else {
        Alert.alert('Hata', 'Kullanıcı verileri yüklenemedi');
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      Alert.alert('Hata', 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadTodayMeals = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Bugünün öğünlerini getir
      const mealsResult = await getTodayMeals(currentUser.uid);
      if (mealsResult.success) {
        setTodayMeals(mealsResult.meals);
      }

      // Bugünün toplam kalorisini getir
      const caloriesResult = await getTodayTotalCalories(currentUser.uid);
      if (caloriesResult.success) {
        setDailyCalories(caloriesResult.totalCalories || 0);
      } else {
        setDailyCalories(0);
      }
    } catch (error) {
      console.error('Öğün yükleme hatası:', error);
      setDailyCalories(0); // Hata durumunda 0 göster
    }
  };

  const calculateTargetCalories = (data) => {
    // Veri kontrolü
    if (!data || !data.weight || !data.height || !data.birthDate) {
      setTargetCalories(2000); // Varsayılan değer
      return;
    }

    // Yaş hesaplama
    const age = calculateAge(data.birthDate);
    
    // BMR (Basal Metabolic Rate) hesaplama - Harris-Benedict formülü
    // Erkek için: BMR = 88.362 + (13.397 × kilo) + (4.799 × boy) - (5.677 × yaş)
    const weight = parseFloat(data.weight) || 70;
    const height = parseFloat(data.height) || 170;
    
    const bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    
    // Aktivite faktörü (1.2 = sedanter)
    let target = bmr * 1.2;

    // Hedefe göre ayarlama
    if (data.goal === 'lose') {
      target -= 500; // Günlük 500 kalori açığı (haftada ~0.5kg)
    } else if (data.goal === 'gain') {
      target += 500; // Günlük 500 kalori fazlası
    }

    setTargetCalories(Math.round(target) || 2000);
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 30; // Varsayılan yaş
    
    // Doğum tarihini parse et (GG/AA/YYYY formatında)
    const parts = birthDate.split('/');
    if (parts.length !== 3) return 30;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JavaScript ayları 0-11 arası
    const year = parseInt(parts[2], 10);
    
    const birth = new Date(year, month, day);
    const today = new Date();
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    // Doğum günü henüz gelmemişse 1 yaş düş
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age > 0 ? age : 30; // Geçersiz tarih için varsayılan
  };

  const formatMealTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getMealTypeLabel = (mealType) => {
    const types = {
      breakfast: '🌅 Kahvaltı',
      lunch: '☀️ Öğle',
      dinner: '🌙 Akşam',
      snack: '🍎 Atıştırmalık',
    };
    return types[mealType] || '🍽️ Öğün';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

  const getProgress = () => {
    return targetCalories > 0 ? (dailyCalories / targetCalories) * 100 : 0;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
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
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{userData?.name || 'Kullanıcı'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Kalori Kartı */}
        <View style={styles.calorieCard}>
          <Text style={styles.calorieLabel}>Günlük Kalori</Text>
          <View style={styles.calorieInfo}>
            <Text style={styles.currentCalories}>{dailyCalories}</Text>
            <Text style={styles.calorieSlash}>/</Text>
            <Text style={styles.targetCalories}>{targetCalories}</Text>
          </View>
          <Text style={styles.calorieSubtext}>kcal</Text>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${Math.min(getProgress(), 100)}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(getProgress())}% tamamlandı
            </Text>
          </View>

          {/* Kalan Kalori */}
          <View style={styles.remainingContainer}>
            <Text style={styles.remainingText}>
              {targetCalories - dailyCalories > 0 
                ? `${targetCalories - dailyCalories} kcal kaldı` 
                : 'Hedefe ulaşıldı! 🎉'}
            </Text>
          </View>
        </View>

        {/* Öğün Ekle Butonu */}
        <TouchableOpacity 
          style={styles.addMealButton}
          onPress={() => navigation.navigate('AddMeal')}
        >
          <Text style={styles.addMealIcon}>📸</Text>
          <Text style={styles.addMealText}>Öğün Ekle</Text>
        </TouchableOpacity>

        {/* Bugünün Öğünleri */}
        <View style={styles.mealsSection}>
          <Text style={styles.sectionTitle}>Bugünün Öğünleri</Text>
          
          {todayMeals.length === 0 ? (
            <View style={styles.emptyMeals}>
              <Text style={styles.emptyMealsIcon}>🍽️</Text>
              <Text style={styles.emptyMealsText}>Henüz öğün eklenmedi</Text>
              <Text style={styles.emptyMealsSubtext}>
                Günlük takibine başlamak için öğün ekle
              </Text>
            </View>
          ) : (
            todayMeals.map((meal) => (
              <View key={meal.id} style={styles.mealCard}>
                <View style={styles.mealInfo}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealType}>{getMealTypeLabel(meal.mealType)}</Text>
                    <Text style={styles.mealTime}>{formatMealTime(meal.date)}</Text>
                  </View>
                  
                  {/* Yiyecek listesi */}
                  {meal.items && meal.items.map((item, index) => (
                    <View key={index} style={styles.mealItemRow}>
                      <Text style={styles.mealItemName}>
                        • {item.name}
                        {item.portion && <Text style={styles.mealPortion}> ({item.portion})</Text>}
                      </Text>
                      <Text style={styles.mealItemCalories}>{item.calories} kcal</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.mealTotalCalories}>
                  <Text style={styles.mealTotalLabel}>Toplam</Text>
                  <Text style={styles.mealCalories}>{meal.totalCalories} kcal</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Hızlı İstatistikler */}
        <View style={styles.statsSection}>
          <View style={styles.statsSectionHeader}>
            <Text style={styles.sectionTitle}>Hızlı Bakış</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Stats')}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>Detaylı İstatistikler</Text>
              <Text style={styles.viewAllIcon}>→</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🎯</Text>
              <Text style={styles.statLabel}>Hedef</Text>
              <Text style={styles.statValue}>
                {userData?.goal === 'lose' ? 'Kilo Ver' : 
                 userData?.goal === 'gain' ? 'Kilo Al' : 'Koru'}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statIcon}>⚖️</Text>
              <Text style={styles.statLabel}>Kilo</Text>
              <Text style={styles.statValue}>{userData?.weight} kg</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🍽️</Text>
              <Text style={styles.statLabel}>Öğün Sayısı</Text>
              <Text style={styles.statValue}>{userData?.mealsPerDay}</Text>
            </View>
          </View>
        </View>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#b4b4b4',
    fontSize: 16,
    marginTop: 16,
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
  greeting: {
    fontSize: 16,
    color: '#b4b4b4',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#16213e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  profileIcon: {
    fontSize: 24,
  },
  calorieCard: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  calorieLabel: {
    fontSize: 16,
    color: '#b4b4b4',
    marginBottom: 12,
    textAlign: 'center',
  },
  calorieInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  currentCalories: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  calorieSlash: {
    fontSize: 32,
    color: '#b4b4b4',
    marginHorizontal: 8,
  },
  targetCalories: {
    fontSize: 32,
    color: '#fff',
  },
  calorieSubtext: {
    fontSize: 16,
    color: '#b4b4b4',
    textAlign: 'center',
    marginBottom: 24,
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: '#2a3447',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#b4b4b4',
    textAlign: 'center',
    marginTop: 8,
  },
  remainingContainer: {
    alignItems: 'center',
  },
  remainingText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  addMealButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addMealIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  addMealText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  mealsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  emptyMeals: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  emptyMealsIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyMealsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptyMealsSubtext: {
    fontSize: 14,
    color: '#b4b4b4',
    textAlign: 'center',
  },
  mealCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  mealInfo: {
    flex: 1,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a3447',
  },
  mealType: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  mealTime: {
    fontSize: 13,
    color: '#888',
  },
  mealItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  mealItemName: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
  mealPortion: {
    fontSize: 12,
    color: '#888',
  },
  mealItemCalories: {
    fontSize: 13,
    color: '#b4b4b4',
    marginLeft: 8,
  },
  mealTotalCalories: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a3447',
    alignItems: 'flex-end',
  },
  mealTotalLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  mealCalories: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statsSection: {
    marginBottom: 32,
  },
  statsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  viewAllText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  viewAllIcon: {
    color: '#4CAF50',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#b4b4b4',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
