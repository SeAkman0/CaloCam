import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { deleteMeal } from '../services/mealService';

export default function MealDetailScreen({ navigation, route }) {
  const { meal } = route.params;
  const [deleting, setDeleting] = useState(false);

  const formatMealTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const getMealTypeLabel = (mealType) => {
    const types = {
      breakfast: '🌅 Kahvaltı',
      lunch: '☀️ Öğle Yemeği',
      dinner: '🌙 Akşam Yemeği',
      snack: '🍎 Atıştırmalık',
    };
    return types[mealType] || '🍽️ Öğün';
  };

  // Toplam besin değerlerini hesapla
  const calculateTotalNutrients = () => {
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    meal.items?.forEach(item => {
      totalProtein += item.protein || 0;
      totalCarbs += item.carbs || 0;
      totalFat += item.fat || 0;
    });

    return { totalProtein, totalCarbs, totalFat };
  };

  const { totalProtein, totalCarbs, totalFat } = calculateTotalNutrients();

  const handleDeleteMeal = async () => {
    setDeleting(true);
    
    try {
      const result = await deleteMeal(meal.id);
      
      if (result.success) {
        console.log('✅ Öğün başarıyla silindi');
        navigation.goBack(); // Dashboard'a dön
      } else {
        console.log('❌ Öğün silinirken hata:', result.error);
      }
    } catch (error) {
      console.error('❌ Öğün silme hatası:', error);
    } finally {
      setDeleting(false);
    }
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
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Öğün Detayı</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Meal Info Card */}
        <View style={styles.mealInfoCard}>
          <Text style={styles.mealTypeLabel}>{getMealTypeLabel(meal.mealType)}</Text>
          <View style={styles.dateTimeRow}>
            <Text style={styles.dateText}>📅 {formatDate(meal.date)}</Text>
            <Text style={styles.timeText}>🕐 {formatMealTime(meal.date)}</Text>
          </View>
        </View>

        {/* Toplam Kalori Card */}
        <View style={styles.totalCalorieCard}>
          <Text style={styles.totalCalorieLabel}>Toplam Kalori</Text>
          <Text style={styles.totalCalorieValue}>{meal.totalCalories}</Text>
          <Text style={styles.totalCalorieUnit}>kcal</Text>
        </View>

        {/* Besin Değerleri - Toplam */}
        <View style={styles.nutrientsSection}>
          <Text style={styles.sectionTitle}>Toplam Besin Değerleri</Text>
          <View style={styles.nutrientsGrid}>
            <View style={styles.nutrientCard}>
              <Text style={styles.nutrientIcon}>🥩</Text>
              <Text style={styles.nutrientLabel}>Protein</Text>
              <Text style={styles.nutrientValue}>{totalProtein}g</Text>
            </View>

            <View style={styles.nutrientCard}>
              <Text style={styles.nutrientIcon}>🍞</Text>
              <Text style={styles.nutrientLabel}>Karbonhidrat</Text>
              <Text style={styles.nutrientValue}>{totalCarbs}g</Text>
            </View>

            <View style={styles.nutrientCard}>
              <Text style={styles.nutrientIcon}>🥑</Text>
              <Text style={styles.nutrientLabel}>Yağ</Text>
              <Text style={styles.nutrientValue}>{totalFat}g</Text>
            </View>
          </View>
        </View>

        {/* Yiyecekler */}
        <View style={styles.foodItemsSection}>
          <Text style={styles.sectionTitle}>Yiyecekler ({meal.items?.length || 0})</Text>
          
          {meal.items?.map((item, index) => (
            <View key={index} style={styles.foodItemCard}>
              <View style={styles.foodItemHeader}>
                <Text style={styles.foodItemNumber}>#{index + 1}</Text>
                <Text style={styles.foodItemName}>{item.name}</Text>
              </View>

              {item.portion && (
                <View style={styles.portionBadge}>
                  <Text style={styles.portionText}>📏 {item.portion}</Text>
                </View>
              )}

              {/* Kalori */}
              <View style={styles.foodItemRow}>
                <Text style={styles.foodItemLabel}>🔥 Kalori</Text>
                <Text style={styles.foodItemValue}>{item.calories} kcal</Text>
              </View>

              {/* Besin Değerleri */}
              {(item.protein > 0 || item.carbs > 0 || item.fat > 0) && (
                <View style={styles.itemNutrientsContainer}>
                  <Text style={styles.itemNutrientsTitle}>Besin Değerleri</Text>
                  
                  <View style={styles.itemNutrientsGrid}>
                    {item.protein > 0 && (
                      <View style={styles.itemNutrientBadge}>
                        <Text style={styles.itemNutrientLabel}>Protein</Text>
                        <Text style={styles.itemNutrientValue}>{item.protein}g</Text>
                      </View>
                    )}

                    {item.carbs > 0 && (
                      <View style={styles.itemNutrientBadge}>
                        <Text style={styles.itemNutrientLabel}>Karb.</Text>
                        <Text style={styles.itemNutrientValue}>{item.carbs}g</Text>
                      </View>
                    )}

                    {item.fat > 0 && (
                      <View style={styles.itemNutrientBadge}>
                        <Text style={styles.itemNutrientLabel}>Yağ</Text>
                        <Text style={styles.itemNutrientValue}>{item.fat}g</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Besin değerleri, AI tarafından tespit edilen yiyeceklerin USDA FoodData Central 
            veritabanından alınmıştır.
          </Text>
        </View>

        {/* Öğün Sil Butonu */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteMeal}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.deleteButtonIcon}>🗑️</Text>
              <Text style={styles.deleteButtonText}>Öğünü Sil</Text>
            </>
          )}
        </TouchableOpacity>
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
  mealInfoCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  mealTypeLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 12,
    textAlign: 'center',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#b4b4b4',
  },
  timeText: {
    fontSize: 14,
    color: '#b4b4b4',
  },
  totalCalorieCard: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  totalCalorieLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  totalCalorieValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
  },
  totalCalorieUnit: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  nutrientsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  nutrientsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  nutrientCard: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  nutrientIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  nutrientLabel: {
    fontSize: 12,
    color: '#b4b4b4',
    marginBottom: 4,
  },
  nutrientValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  foodItemsSection: {
    marginBottom: 24,
  },
  foodItemCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  foodItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  foodItemNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 8,
  },
  foodItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  portionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2a3447',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  portionText: {
    fontSize: 12,
    color: '#b4b4b4',
  },
  foodItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a3447',
    marginBottom: 12,
  },
  foodItemLabel: {
    fontSize: 14,
    color: '#b4b4b4',
  },
  foodItemValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  itemNutrientsContainer: {
    backgroundColor: '#0f1724',
    borderRadius: 8,
    padding: 12,
  },
  itemNutrientsTitle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
    fontWeight: '600',
  },
  itemNutrientsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  itemNutrientBadge: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  itemNutrientLabel: {
    fontSize: 10,
    color: '#888',
    marginBottom: 4,
  },
  itemNutrientValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  infoBox: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#b4b4b4',
    lineHeight: 18,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
