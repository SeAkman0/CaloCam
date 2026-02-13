import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
} from 'react-native';

// Android'de LayoutAnimation için (eski sürümler)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { getUserData } from '../services/authService';
import { getTodayMeals, getTodayTotalCalories } from '../services/mealService';
import { getTodayWaterIntake, addWaterIntake, calculateDailyWaterGoal, QUICK_ADD_AMOUNTS } from '../services/waterService';
import { getTodayBurnedCalories } from '../services/exerciseService';
import { getWidgetOrder, setWidgetOrder, WIDGET_IDS, WIDGET_LABELS } from '../services/dashboardLayoutService';
import { auth } from '../config/firebase';

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [dailyCalories, setDailyCalories] = useState(0);
  const [targetCalories, setTargetCalories] = useState(2000);
  const [burnedCalories, setBurnedCalories] = useState(0);
  const [todayMeals, setTodayMeals] = useState([]);
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2500);
  const [addingWater, setAddingWater] = useState(false);
  const [widgetOrder, setWidgetOrderState] = useState([...WIDGET_IDS]);
  const [editMode, setEditMode] = useState(false);
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false);
  const [draggingWidgetId, setDraggingWidgetId] = useState(null);
  const dragOffset = useRef(new Animated.Value(0)).current;
  const itemLayoutsRef = useRef([]);
  const lastTranslationYRef = useRef(0);
  const dragStartLayoutRef = useRef(null);
  const dragIndexRef = useRef(0);

  const loadLayout = useCallback(async () => {
    const order = await getWidgetOrder();
    setWidgetOrderState(order);
  }, []);

  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  useEffect(() => {
    loadUserData();
    loadTodayMeals();
    loadTodayWater();
    loadTodayBurned();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData();
      loadTodayMeals();
      loadTodayWater();
      loadTodayBurned();
    });
    return unsubscribe;
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('❌ Kullanıcı oturumu bulunamadı');
        navigation.navigate('Login');
        return;
      }

      const result = await getUserData(currentUser.uid);
      if (result.success) {
        setUserData(result.data);
        calculateTargetCalories(result.data);
        calculateWaterGoal(result.data);
        console.log('✅ Kullanıcı verileri yüklendi');
      } else {
        console.log('❌ Kullanıcı verileri yüklenemedi');
      }
    } catch (error) {
      console.error('❌ Veri yükleme hatası:', error);
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

  const loadTodayWater = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const result = await getTodayWaterIntake(currentUser.uid);
      if (result.success) {
        setWaterIntake(result.totalWater || 0);
      } else {
        setWaterIntake(0);
      }
    } catch (error) {
      console.error('❌ Su verisi yükleme hatası:', error);
      setWaterIntake(0);
    }
  };

  const loadTodayBurned = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const result = await getTodayBurnedCalories(currentUser.uid);
      if (result.success) setBurnedCalories(result.totalBurned || 0);
      else setBurnedCalories(0);
    } catch (error) {
      console.error('❌ Yakılan kalori yükleme hatası:', error);
      setBurnedCalories(0);
    }
  };

  const calculateWaterGoal = (data) => {
    if (!data || !data.weight || !data.birthDate || !data.gender) {
      setWaterGoal(2500); // Varsayılan değer
      return;
    }

    const age = calculateAge(data.birthDate);
    const weight = parseFloat(data.weight) || 70;
    const height = parseFloat(data.height) || 170;
    const gender = data.gender || 'male';

    const goal = calculateDailyWaterGoal(weight, height, age, gender);
    setWaterGoal(goal);
  };

  const handleQuickAddWater = async (amount) => {
    if (addingWater) return;
    
    setAddingWater(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const result = await addWaterIntake(currentUser.uid, amount);
      if (result.success) {
        setWaterIntake(waterIntake + amount);
        console.log(`✅ ${amount}ml su eklendi`);
      }
    } catch (error) {
      console.error('❌ Su ekleme hatası:', error);
    } finally {
      setAddingWater(false);
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

  const MEAL_ORDER = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };

  const getMealTypeLabel = (mealType) => {
    const types = {
      breakfast: '🌅 Kahvaltı',
      lunch: '☀️ Öğle',
      dinner: '🌙 Akşam',
      snack: '🍎 Atıştırmalık',
    };
    return types[mealType] || '🍽️ Öğün';
  };

  const sortedTodayMeals = [...(todayMeals || [])].sort((a, b) => {
    const orderA = MEAL_ORDER[a.mealType] ?? 99;
    const orderB = MEAL_ORDER[b.mealType] ?? 99;
    return orderA - orderB;
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

  const netCalories = dailyCalories - burnedCalories;
  const getProgress = () => {
    return targetCalories > 0 ? Math.min((netCalories / targetCalories) * 100, 100) : 0;
  };
  const remaining = targetCalories - netCalories;

  const handleMoveWidget = (index, direction) => {
    const newOrder = [...widgetOrder];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setWidgetOrderState(newOrder);
  };

  const handleDragEndWithPosition = useCallback((widgetId) => {
    const fromIndex = widgetOrder.indexOf(widgetId);
    if (fromIndex < 0) return;
    const layouts = itemLayoutsRef.current;
    const startLayout = dragStartLayoutRef.current;
    const ty = lastTranslationYRef.current;
    if (!startLayout || !layouts.length) {
      setDraggingWidgetId(null);
      return;
    }
    const releasedCenterY = startLayout.y + startLayout.height / 2 + ty;
    let targetIndex = fromIndex;
    for (let j = 0; j < layouts.length; j++) {
      if (!layouts[j]) continue;
      if (releasedCenterY < layouts[j].y) {
        targetIndex = j;
        break;
      }
      if (releasedCenterY < layouts[j].y + layouts[j].height) {
        targetIndex = j;
        break;
      }
      targetIndex = j;
    }
    targetIndex = Math.max(0, Math.min(targetIndex, layouts.length - 1));
    if (targetIndex !== fromIndex) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const newOrder = widgetOrder.filter((_, i) => i !== fromIndex);
      newOrder.splice(targetIndex, 0, widgetId);
      setWidgetOrderState(newOrder);
    }
    Animated.spring(dragOffset, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start(() => setDraggingWidgetId(null));
  }, [widgetOrder]);

  const handleRemoveWidget = (index) => {
    if (widgetOrder.length <= 1) {
      Alert.alert('En az bir widget kalmalı', 'Dashboard\'da en az bir alan görünür olmalıdır.');
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newOrder = widgetOrder.filter((_, i) => i !== index);
    setWidgetOrderState(newOrder);
  };

  const handleAddWidget = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setWidgetOrderState([...widgetOrder, id]);
    setShowAddWidgetModal(false);
  };

  const handleFinishEdit = async () => {
    await setWidgetOrder(widgetOrder);
    setEditMode(false);
  };

  const availableToAdd = WIDGET_IDS.filter((id) => !widgetOrder.includes(id));

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
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{userData?.name || 'Kullanıcı'}</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.editModeButton}
              onPress={() => (editMode ? handleFinishEdit() : setEditMode(true))}
              activeOpacity={0.7}
            >
              <Text style={[styles.editModeButtonText, editMode && styles.editModeButtonTextActive]}>{editMode ? 'Bitti' : 'Düzenle'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.profileIcon}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>
        {editMode && (
          <View style={styles.editModeHint}>
            <Text style={styles.editModeHintText}>Üst çubuğu tutup sürükle  •  ↑↓ ile de taşıyabilirsin</Text>
          </View>
        )}
        {widgetOrder.length === 0 ? (
          <View style={styles.placeholderWidget}>
            <Text style={styles.placeholderWidgetText}>Widget eklemek için Düzenle → +</Text>
          </View>
        ) : (
          widgetOrder.map((widgetId, index) => (
            <View
              key={widgetId}
              style={styles.widgetWrapper}
              onLayout={(e) => {
                const { layout } = e.nativeEvent;
                itemLayoutsRef.current[index] = { y: layout.y, height: layout.height };
              }}
            >
              <Animated.View
                style={
                  draggingWidgetId === widgetId
                    ? { transform: [{ translateY: dragOffset }], zIndex: 1000, elevation: 10 }
                    : undefined
                }
              >
              {editMode && (
                <PanGestureHandler
                  minDistance={10}
                  onGestureEvent={(e) => {
                    const ty = e.nativeEvent.translationY;
                    dragOffset.setValue(ty);
                    lastTranslationYRef.current = ty;
                  }}
                  onHandlerStateChange={(e) => {
                    const { state } = e.nativeEvent;
                    if (state === State.ACTIVE) {
                      setDraggingWidgetId(widgetId);
                      dragOffset.setValue(0);
                      lastTranslationYRef.current = 0;
                      const layout = itemLayoutsRef.current[index];
                      dragStartLayoutRef.current = layout ? { y: layout.y, height: layout.height } : null;
                      dragIndexRef.current = index;
                    } else if (state === State.END || state === State.CANCELLED) {
                      handleDragEndWithPosition(widgetId);
                    }
                  }}
                >
                  <View style={styles.widgetEditBar}>
                    <View style={styles.dragHandle}>
                      <Ionicons name="reorder-three" size={24} color="#4FC3F7" />
                    </View>
                    <TouchableOpacity
                    style={[styles.widgetEditBtn, index === 0 && styles.widgetEditBtnDisabled]}
                    onPress={() => handleMoveWidget(index, 'up')}
                    disabled={index === 0}
                  >
                    <Ionicons name="chevron-up" size={22} color={index === 0 ? '#555' : '#4FC3F7'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.widgetEditBtn, index === widgetOrder.length - 1 && styles.widgetEditBtnDisabled]}
                    onPress={() => handleMoveWidget(index, 'down')}
                    disabled={index === widgetOrder.length - 1}
                  >
                    <Ionicons name="chevron-down" size={22} color={index === widgetOrder.length - 1 ? '#555' : '#4FC3F7'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.widgetRemoveBtn}
                    onPress={() => handleRemoveWidget(index)}
                    disabled={widgetOrder.length <= 1}
                  >
                    <Ionicons name="remove-circle" size={24} color={widgetOrder.length <= 1 ? '#555' : '#f59e0b'} />
                  </TouchableOpacity>
                  <Text style={styles.widgetEditLabel}>{WIDGET_LABELS[widgetId] || widgetId}</Text>
                  </View>
                </PanGestureHandler>
              )}
              {widgetId === 'calories' && (
        <View style={styles.calorieCard}>
          <Text style={styles.calorieLabel}>Günlük Kalori</Text>
          <View style={styles.calorieSummary}>
            <View style={styles.calorieRow}>
              <Text style={styles.calorieRowLabel}>Aldığın</Text>
              <Text style={styles.currentCalories}>{dailyCalories} kcal</Text>
            </View>
            <View style={styles.calorieRow}>
              <Text style={styles.calorieRowLabel}>Yaktığın</Text>
              <Text style={styles.burnedCalories}>-{burnedCalories} kcal</Text>
            </View>
            <View style={[styles.calorieRow, styles.calorieRowNet]}>
              <Text style={styles.calorieRowLabel}>Net (sende kalan)</Text>
              <Text style={styles.netCalories}>{netCalories} kcal</Text>
            </View>
          </View>
          <Text style={styles.calorieSubtext}>Hedef: {targetCalories} kcal</Text>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${Math.max(0, Math.min(getProgress(), 100))}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(getProgress())}% tamamlandı
            </Text>
          </View>

          {/* Kalan Kalori */}
          <View style={styles.remainingContainer}>
            <Text style={[styles.remainingText, remaining < 0 && styles.remainingTextReached]}>
              {remaining > 0 
                ? `${remaining} kcal kaldı` 
                : remaining < 0 
                  ? `${Math.abs(remaining)} kcal fazla`
                  : 'Hedefe ulaşıldı! 🎉'}
            </Text>
          </View>
        </View>
              )}
              {widgetId === 'water' && (
        <View style={styles.waterCard}>
          <View style={styles.waterHeader}>
            <Text style={styles.waterLabel}>💧 Günlük Su Tüketimi</Text>
            <Text style={styles.waterGoalText}>
              Hedef: {waterGoal}ml ({(waterGoal/1000).toFixed(1)}L)
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.waterProgressRow}>
            <View style={styles.waterProgressContainer}>
              <View style={styles.waterProgressBg}>
                <View 
                  style={[
                    styles.waterProgressFill, 
                    { width: `${Math.min((waterIntake / waterGoal) * 100, 100)}%` }
                  ]} 
                />
              </View>
              <View style={styles.waterStatsRow}>
                <Text style={styles.waterCurrentText}>{waterIntake}ml</Text>
                <Text style={styles.waterPercentText}>
                  {Math.round((waterIntake / waterGoal) * 100)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Hızlı Ekle Butonları */}
          <View style={styles.quickAddContainer}>
            {QUICK_ADD_AMOUNTS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.quickAddButton}
                onPress={() => handleQuickAddWater(item.amount)}
                disabled={addingWater}
              >
                <Text style={styles.quickAddIcon}>{item.icon}</Text>
                <Text style={styles.quickAddLabel}>{item.label}</Text>
                <Text style={styles.quickAddAmount}>{item.amount}ml</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
              )}
              {widgetId === 'meals' && (
        <>
        <TouchableOpacity 
          style={styles.addMealButton}
          onPress={() => navigation.navigate('AddMeal')}
        >
          <Text style={styles.addMealIcon}>📸</Text>
          <Text style={styles.addMealText}>Öğün Ekle</Text>
        </TouchableOpacity>

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
            sortedTodayMeals.map((meal) => (
              <TouchableOpacity 
                key={meal.id} 
                style={styles.mealCard}
                onPress={() => navigation.navigate('MealDetail', { meal })}
                activeOpacity={0.7}
              >
                <View style={styles.mealInfo}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealType}>{getMealTypeLabel(meal.mealType)}</Text>
                    <Text style={styles.mealTime}>{formatMealTime(meal.date)}</Text>
                  </View>
                  
                  {/* Yiyecek listesi — en fazla 3 madde, fazlası "..." */}
                  {meal.items && meal.items.slice(0, 3).map((item, index) => (
                    <View key={index} style={styles.mealItemRow}>
                      <Text style={styles.mealItemName}>
                        • {item.name}
                        {item.portion && <Text style={styles.mealPortion}> ({item.portion})</Text>}
                      </Text>
                      <Text style={styles.mealItemCalories}>{item.calories} kcal</Text>
                    </View>
                  ))}
                  {meal.items && meal.items.length > 3 && (
                    <View style={styles.mealItemRow}>
                      <Text style={styles.mealItemMore}>... ve {meal.items.length - 3} madde daha</Text>
                    </View>
                  )}
                </View>
                <View style={styles.mealTotalCalories}>
                  <Text style={styles.mealTotalLabel}>Toplam</Text>
                  <Text style={styles.mealCalories}>{meal.totalCalories} kcal</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
        </>
              )}
              {widgetId === 'exercise' && (
        <View style={styles.exerciseWidgetCard}>
          <Text style={styles.exerciseWidgetLabel}>🔥 Yakılan Kalori</Text>
          <Text style={styles.exerciseWidgetValue}>-{burnedCalories} kcal</Text>
          <TouchableOpacity style={styles.exerciseWidgetLink} onPress={() => navigation.navigate('Egzersiz')}>
            <Text style={styles.exerciseWidgetLinkText}>Egzersiz ekle →</Text>
          </TouchableOpacity>
        </View>
              )}
              {widgetId === 'stats' && (
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
              )}
              </Animated.View>
            </View>
          ))
        )}
        {editMode && availableToAdd.length > 0 && (
          <TouchableOpacity style={styles.addWidgetButton} onPress={() => setShowAddWidgetModal(true)}>
            <Ionicons name="add-circle" size={24} color="#4CAF50" style={{ marginRight: 8 }} />
            <Text style={styles.addWidgetButtonText}>Widget Ekle</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
        {/* Widget Ekle Modal */}
        <Modal visible={showAddWidgetModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAddWidgetModal(false)} />
            <View style={styles.addWidgetModalContent}>
              <Text style={styles.addWidgetModalTitle}>Widget Ekle</Text>
              {availableToAdd.map((id) => (
                <TouchableOpacity
                  key={id}
                  style={styles.addWidgetModalItem}
                  onPress={() => handleAddWidget(id)}
                >
                  <Text style={styles.addWidgetModalItemText}>{WIDGET_LABELS[id] || id}</Text>
                  <Ionicons name="add" size={22} color="#4CAF50" />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.addWidgetModalCancel} onPress={() => setShowAddWidgetModal(false)}>
                <Text style={styles.addWidgetModalCancelText}>İptal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editModeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  editModeButtonText: {
    color: '#888',
    fontSize: 13,
  },
  editModeButtonTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
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
  editModeHint: {
    backgroundColor: 'rgba(79, 195, 247, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  editModeHintText: {
    fontSize: 13,
    color: '#4FC3F7',
    textAlign: 'center',
  },
  widgetWrapper: {
    marginBottom: 24,
  },
  widgetEditBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#4FC3F7',
    gap: 8,
    minHeight: 48,
  },
  dragHandle: {
    padding: 8,
    marginLeft: 4,
  },
  widgetEditBtn: {
    padding: 4,
  },
  widgetEditBtnDisabled: {
    opacity: 0.5,
  },
  widgetRemoveBtn: {
    padding: 4,
  },
  widgetEditLabel: {
    fontSize: 13,
    color: '#b4b4b4',
    marginLeft: 4,
    flex: 1,
  },
  placeholderWidget: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3447',
    borderStyle: 'dashed',
  },
  placeholderWidgetText: {
    color: '#888',
    fontSize: 14,
  },
  addWidgetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  addWidgetButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  exerciseWidgetCard: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  exerciseWidgetLabel: {
    fontSize: 16,
    color: '#b4b4b4',
    marginBottom: 8,
  },
  exerciseWidgetValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  exerciseWidgetLink: {
    marginTop: 12,
  },
  exerciseWidgetLinkText: {
    fontSize: 14,
    color: '#4CAF50',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  addWidgetModalContent: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  addWidgetModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  addWidgetModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    marginBottom: 8,
  },
  addWidgetModalItemText: {
    fontSize: 16,
    color: '#fff',
  },
  addWidgetModalCancel: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addWidgetModalCancelText: {
    fontSize: 16,
    color: '#888',
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
  calorieSummary: {
    marginBottom: 8,
  },
  calorieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  calorieRowNet: {
    borderTopWidth: 1,
    borderTopColor: '#2a3447',
    marginTop: 4,
    paddingTop: 10,
  },
  calorieRowLabel: {
    fontSize: 14,
    color: '#b4b4b4',
  },
  currentCalories: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
  },
  burnedCalories: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
  },
  netCalories: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  calorieSubtext: {
    fontSize: 14,
    color: '#b4b4b4',
    textAlign: 'center',
    marginBottom: 16,
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
  remainingTextReached: {
    color: '#ef4444',
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
  waterCard: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  waterHeader: {
    marginBottom: 16,
  },
  waterLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4FC3F7',
    marginBottom: 4,
  },
  waterGoalText: {
    fontSize: 12,
    color: '#b4b4b4',
  },
  waterProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  waterProgressContainer: {
    flex: 1,
  },
  waterProgressBg: {
    height: 12,
    backgroundColor: '#2a3447',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  waterProgressFill: {
    height: '100%',
    backgroundColor: '#4FC3F7',
    borderRadius: 6,
  },
  waterStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waterCurrentText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4FC3F7',
  },
  waterPercentText: {
    fontSize: 14,
    color: '#b4b4b4',
  },
  quickAddContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAddButton: {
    flex: 1,
    backgroundColor: '#1e3a3a',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4FC3F7',
  },
  quickAddIcon: {
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 4,
  },
  quickAddLabel: {
    fontSize: 10,
    color: '#b4b4b4',
    marginBottom: 2,
  },
  quickAddAmount: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#4FC3F7',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
  mealItemMore: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
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
