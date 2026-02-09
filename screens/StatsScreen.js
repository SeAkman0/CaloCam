import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { auth } from '../config/firebase';
import { getWeeklyStats, getMonthlyStats, getGoalProgress } from '../services/statsService';
import { getUserData } from '../services/authService';

const screenWidth = Dimensions.get('window').width;

export default function StatsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('week'); // 'week' or 'month'
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [goalProgress, setGoalProgress] = useState(null);
  const [targetCalories, setTargetCalories] = useState(2000);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Kullanıcı hedef kalorisini ve goal'ını al
      const userData = await getUserData(currentUser.uid);
      let target = 2000;
      let userGoal = 'maintain';
      
      if (userData.success && userData.data) {
        target = calculateTargetCalories(userData.data);
        userGoal = userData.data.goal || 'maintain';
        setTargetCalories(target);
      }

      // İstatistikleri yükle (target ve goal'ı kullan)
      const [weekResult, monthResult, progressResult] = await Promise.all([
        getWeeklyStats(currentUser.uid),
        getMonthlyStats(currentUser.uid),
        getGoalProgress(currentUser.uid, target, userGoal),
      ]);

      if (weekResult.success) setWeeklyStats(weekResult);
      if (monthResult.success) setMonthlyStats(monthResult);
      if (progressResult.success) setGoalProgress(progressResult);
    } catch (error) {
      console.error('İstatistik yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTargetCalories = (data) => {
    if (!data || !data.weight || !data.height || !data.birthDate) {
      return 2000;
    }

    const age = calculateAge(data.birthDate);
    const weight = parseFloat(data.weight) || 70;
    const height = parseFloat(data.height) || 170;
    
    const bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    let target = bmr * 1.2;

    if (data.goal === 'lose') {
      target -= 500;
    } else if (data.goal === 'gain') {
      target += 500;
    }

    return Math.round(target) || 2000;
  };

  const calculateAge = (birthDateString) => {
    if (!birthDateString) return 30;
    const parts = birthDateString.split('/');
    if (parts.length !== 3) return 30;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? age : 30;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>İstatistikler yükleniyor...</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: '#16213e',
    backgroundGradientFrom: '#16213e',
    backgroundGradientTo: '#1a1a2e',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#4CAF50',
    },
  };

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
          <Text style={styles.title}>İstatistikler</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Tab Buttons */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, tab === 'week' && styles.tabButtonActive]}
            onPress={() => setTab('week')}
          >
            <Text style={[styles.tabText, tab === 'week' && styles.tabTextActive]}>
              Haftalık
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, tab === 'month' && styles.tabButtonActive]}
            onPress={() => setTab('month')}
          >
            <Text style={[styles.tabText, tab === 'month' && styles.tabTextActive]}>
              Aylık
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'week' && weeklyStats && (
          <>
            {/* Haftalık Grafik */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Son 7 Gün Kalori</Text>
              <LineChart
                data={{
                  labels: weeklyStats.weekData.map(d => d.dayName),
                  datasets: [{
                    data: weeklyStats.weekData.map(d => d.calories),
                  }],
                }}
                width={screenWidth - 40}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withVerticalLabels={true}
                withHorizontalLabels={true}
                withDots={true}
                withShadow={false}
                withInnerLines={true}
                withOuterLines={true}
                yAxisSuffix=" kcal"
                formatYLabel={(value) => Math.round(value).toString()}
              />
            </View>

            {/* Haftalık Özet */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Haftalık Özet</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}>📊</Text>
                  <Text style={styles.statValue}>{weeklyStats.summary.totalCalories}</Text>
                  <Text style={styles.statLabel}>Toplam Kalori</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}>📈</Text>
                  <Text style={styles.statValue}>{weeklyStats.summary.avgCalories}</Text>
                  <Text style={styles.statLabel}>Ortalama/Gün</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}>🍽️</Text>
                  <Text style={styles.statValue}>{weeklyStats.summary.totalMeals}</Text>
                  <Text style={styles.statLabel}>Toplam Öğün</Text>
                </View>
              </View>
            </View>

            {/* Hedef Başarısı */}
            {goalProgress && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hedef Başarısı</Text>
                <View style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalPercentage}>{goalProgress.successRate}%</Text>
                    <Text style={styles.goalEmoji}>
                      {goalProgress.successRate >= 80 ? '🔥' : 
                       goalProgress.successRate >= 60 ? '👍' : '💪'}
                    </Text>
                  </View>
                  <Text style={styles.goalText}>
                    {goalProgress.successfulDays}/7 gün hedefe ulaştın
                  </Text>
                  <View style={styles.progressBar}>
                    <View 
                      style={[styles.progressFill, { width: `${goalProgress.successRate}%` }]} 
                    />
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {tab === 'month' && monthlyStats && (
          <>
            {/* Aylık Özet */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Son 30 Gün Özet</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}>📊</Text>
                  <Text style={styles.statValue}>{monthlyStats.summary.totalCalories}</Text>
                  <Text style={styles.statLabel}>Toplam Kalori</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}>📈</Text>
                  <Text style={styles.statValue}>{monthlyStats.summary.avgCalories}</Text>
                  <Text style={styles.statLabel}>Ortalama/Gün</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}>🍽️</Text>
                  <Text style={styles.statValue}>{monthlyStats.summary.totalMeals}</Text>
                  <Text style={styles.statLabel}>Toplam Öğün</Text>
                </View>
              </View>
            </View>

            {/* En Çok Yenen Yiyecekler */}
            {monthlyStats.summary.topFoods && monthlyStats.summary.topFoods.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>En Çok Yenen Yiyecekler</Text>
                {monthlyStats.summary.topFoods.map((food, index) => (
                  <View key={index} style={styles.foodItem}>
                    <View style={styles.foodRank}>
                      <Text style={styles.rankNumber}>#{index + 1}</Text>
                    </View>
                    <View style={styles.foodInfo}>
                      <Text style={styles.foodName}>{food.name}</Text>
                      <Text style={styles.foodStats}>
                        {food.count} kez · {food.totalCalories} kcal
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Öğün Türü Dağılımı */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Öğün Türü Dağılımı</Text>
              <View style={styles.mealDistribution}>
                {Object.entries(monthlyStats.summary.mealTypeDistribution).map(([type, count]) => (
                  <View key={type} style={styles.distributionItem}>
                    <Text style={styles.distributionEmoji}>
                      {type === 'breakfast' ? '🌅' : 
                       type === 'lunch' ? '☀️' : 
                       type === 'dinner' ? '🌙' : '🍎'}
                    </Text>
                    <Text style={styles.distributionLabel}>
                      {type === 'breakfast' ? 'Kahvaltı' : 
                       type === 'lunch' ? 'Öğle' : 
                       type === 'dinner' ? 'Akşam' : 'Atıştırmalık'}
                    </Text>
                    <Text style={styles.distributionCount}>{count}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

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
  loadingText: {
    color: '#4CAF50',
    fontSize: 14,
    marginTop: 12,
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
    marginBottom: 24,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
  },
  tabTextActive: {
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
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
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  goalCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalPercentage: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  goalEmoji: {
    fontSize: 32,
  },
  goalText: {
    fontSize: 14,
    color: '#b4b4b4',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#2a3447',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  foodRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  foodStats: {
    fontSize: 13,
    color: '#888',
  },
  mealDistribution: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a3447',
  },
  distributionEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  distributionLabel: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
  },
  distributionCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});
