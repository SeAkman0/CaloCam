import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../config/firebase';
import { addMeal } from '../services/mealService';
import { analyzeFoodImage } from '../services/foodAIService';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Kahvaltı', icon: '🌅' },
  { id: 'lunch', label: 'Öğle', icon: '☀️' },
  { id: 'dinner', label: 'Akşam', icon: '🌙' },
  { id: 'snack', label: 'Atıştırmalık', icon: '🍎' },
];

export default function AddMealScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [mealType, setMealType] = useState('breakfast');
  const [foodItems, setFoodItems] = useState([
    { id: '1', name: '', portion: '', calories: '' }
  ]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageOptions, setShowImageOptions] = useState(false);

  const addFoodItem = () => {
    const newId = String(Date.now());
    setFoodItems([...foodItems, { id: newId, name: '', portion: '', calories: '' }]);
  };

  const removeFoodItem = (id) => {
    if (foodItems.length === 1) {
      Alert.alert('Uyarı', 'En az bir yiyecek eklemelisiniz');
      return;
    }
    setFoodItems(foodItems.filter(item => item.id !== id));
  };

  const updateFoodItem = (id, field, value) => {
    setFoodItems(foodItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kamera ve galeri erişimi için izin vermelisiniz');
      return false;
    }
    return true;
  };

  const pickImageFromCamera = async () => {
    setShowImageOptions(false);
    
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      analyzeImage(result.assets[0].uri);
    }
  };

  const pickImageFromGallery = async () => {
    setShowImageOptions(false);
    
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      analyzeImage(result.assets[0].uri);
    }
  };

  const analyzeImage = async (imageUri) => {
    setAnalyzing(true);
    try {
      const result = await analyzeFoodImage(imageUri);
      
      if (result.success && result.foods.length > 0) {
        // AI sonuçlarını foodItems'a ekle
        const newFoodItems = result.foods.map(food => ({
          id: food.id,
          name: food.name,
          portion: food.portion,
          calories: food.calories.toString(),
        }));
        
        setFoodItems(newFoodItems);
        Alert.alert('Başarılı! 🎉', result.message);
      } else {
        // Hata mesajını göster
        const errorMessage = result.error || 'Yiyecek tespit edilemedi. Manuel olarak ekleyebilirsin.';
        Alert.alert('❌ Analiz Başarısız', errorMessage);
      }
    } catch (error) {
      console.error('Analiz hatası:', error);
      Alert.alert('❌ Hata', `Görüntü analiz edilemedi: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const calculateTotalCalories = () => {
    return foodItems.reduce((total, item) => {
      const calories = parseInt(item.calories) || 0;
      return total + calories;
    }, 0);
  };

  const handleSaveMeal = async () => {
    // Validasyon
    const validItems = foodItems.filter(item => item.name && item.calories);
    
    if (validItems.length === 0) {
      Alert.alert('Hata', 'En az bir yiyecek ekleyip ismini ve kalorisini girin');
      return;
    }

    // Tüm itemların kalori bilgisi var mı kontrol et
    const hasEmptyCalories = validItems.some(item => !item.calories || isNaN(item.calories));
    if (hasEmptyCalories) {
      Alert.alert('Hata', 'Lütfen tüm yiyeceklerin kalori bilgisini girin');
      return;
    }

    setLoading(true);
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı');
        return;
      }

      const totalCalories = calculateTotalCalories();

      const mealData = {
        mealType,
        items: validItems.map(item => ({
          name: item.name,
          portion: item.portion || '',
          calories: parseInt(item.calories)
        })),
        totalCalories,
      };

      const result = await addMeal(currentUser.uid, mealData);
      
      if (result.success) {
        Alert.alert(
          'Başarılı', 
          `${validItems.length} yiyecek eklendi!\nToplam: ${totalCalories} kcal`,
          [
            {
              text: 'Tamam',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Hata', result.error || 'Öğün eklenirken bir hata oluştu');
      }
    } catch (error) {
      Alert.alert('Hata', 'Öğün eklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const totalCalories = calculateTotalCalories();

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
          <Text style={styles.title}>Öğün Ekle</Text>
          <View style={styles.placeholder} />
        </View>

        {/* AI Fotoğraf Analizi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fotoğraftan Ekle (AI) 🤖</Text>
          
          {selectedImage && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={() => setSelectedImage(null)}
              >
                <Text style={styles.removeImageText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {analyzing ? (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.analyzingText}>AI görüntüyü analiz ediyor...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.aiButton}
              onPress={() => setShowImageOptions(true)}
            >
              <Text style={styles.aiButtonIcon}>📸</Text>
              <Text style={styles.aiButtonText}>Fotoğraf Çek veya Seç</Text>
            </TouchableOpacity>
          )}
          
          <Text style={styles.inputHint}>
            AI yiyecekleri tespit edip kalori tahmin edecek
          </Text>
        </View>

        {/* Öğün Türü Seçimi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Öğün Türü</Text>
          <View style={styles.mealTypeContainer}>
            {MEAL_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.mealTypeButton,
                  mealType === type.id && styles.mealTypeButtonActive
                ]}
                onPress={() => setMealType(type.id)}
              >
                <Text style={styles.mealTypeIcon}>{type.icon}</Text>
                <Text style={[
                  styles.mealTypeLabel,
                  mealType === type.id && styles.mealTypeLabelActive
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Yiyecek Listesi */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Yiyecekler</Text>
            {totalCalories > 0 && (
              <View style={styles.totalCaloriesBadge}>
                <Text style={styles.totalCaloriesText}>{totalCalories} kcal</Text>
              </View>
            )}
          </View>

          {foodItems.map((item, index) => (
            <View key={item.id} style={styles.foodItemCard}>
              <View style={styles.foodItemHeader}>
                <Text style={styles.foodItemNumber}>#{index + 1}</Text>
                {foodItems.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeFoodItem(item.id)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Yiyecek Adı *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Örn: Domates"
                  placeholderTextColor="#666"
                  value={item.name}
                  onChangeText={(value) => updateFoodItem(item.id, 'name', value)}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Porsiyon / Gramaj</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="100g"
                    placeholderTextColor="#666"
                    value={item.portion}
                    onChangeText={(value) => updateFoodItem(item.id, 'portion', value)}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Kalori (kcal) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="50"
                    placeholderTextColor="#666"
                    value={item.calories}
                    onChangeText={(value) => updateFoodItem(item.id, 'calories', value)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          ))}

          {/* Yiyecek Ekle Butonu */}
          <TouchableOpacity
            style={styles.addFoodButton}
            onPress={addFoodItem}
          >
            <Text style={styles.addFoodIcon}>+</Text>
            <Text style={styles.addFoodText}>Yiyecek Ekle</Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Bir öğünde birden fazla yiyecek ekleyebilirsin. Örneğin kahvaltıda peynir, domates, sucuk ayrı ayrı.
          </Text>
        </View>

        {/* Kaydet Butonu */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.buttonDisabled]}
          onPress={handleSaveMeal}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.saveButtonText}>Öğünü Kaydet</Text>
              {totalCalories > 0 && (
                <Text style={styles.saveButtonSubtext}>
                  Toplam: {totalCalories} kcal
                </Text>
              )}
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Fotoğraf Seçim Modalı */}
      <Modal
        visible={showImageOptions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Fotoğraf Seç</Text>
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={pickImageFromCamera}
            >
              <Text style={styles.modalButtonIcon}>📷</Text>
              <Text style={styles.modalButtonText}>Kamera ile Çek</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={pickImageFromGallery}
            >
              <Text style={styles.modalButtonIcon}>🖼️</Text>
              <Text style={styles.modalButtonText}>Galeriden Seç</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowImageOptions(false)}
            >
              <Text style={styles.modalCancelText}>İptal</Text>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  totalCaloriesBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  totalCaloriesText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mealTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mealTypeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a3447',
  },
  mealTypeButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#1e3a28',
  },
  mealTypeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  mealTypeLabel: {
    fontSize: 14,
    color: '#b4b4b4',
    fontWeight: '600',
  },
  mealTypeLabelActive: {
    color: '#4CAF50',
  },
  foodItemCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  foodItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  foodItemNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    color: '#b4b4b4',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0f1724',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  addFoodButton: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  addFoodIcon: {
    fontSize: 24,
    color: '#4CAF50',
    marginRight: 8,
  },
  addFoodText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#b4b4b4',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButtonSubtext: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
  // AI & Image Styles
  imagePreview: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  analyzingContainer: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  analyzingText: {
    color: '#4CAF50',
    fontSize: 14,
    marginTop: 12,
  },
  aiButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 8,
  },
  aiButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  aiButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#16213e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  modalButtonIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelButton: {
    backgroundColor: '#2a3447',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
