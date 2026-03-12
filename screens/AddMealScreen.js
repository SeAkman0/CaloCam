import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { useAlert } from '../context/AlertContext';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../config/firebase';
import { addMeal, getTodayMeals } from '../services/mealService';
import { cancelMealNotification } from '../services/notificationService';
import { analyzeFoodImage, analyzeRecipeWithAI } from '../services/foodAIService';
import { searchFoodInUSDA, translateFoodName } from '../services/usdaFoodService';
import { getProductByBarcode } from '../services/openFoodFactsService';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { allowOnlyNumbers } from '../utils/validation';
import ReadyMealsModal from '../components/ReadyMealsModal';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Kahvaltı', icon: '🌅' },
  { id: 'lunch', label: 'Öğle', icon: '☀️' },
  { id: 'dinner', label: 'Akşam', icon: '🌙' },
  { id: 'snack', label: 'Atıştırmalık', icon: '🍎' },
];

export default function AddMealScreen({ navigation }) {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [mealType, setMealType] = useState('breakfast');
  const [foodItems, setFoodItems] = useState([
    { id: '1', name: '', portion: '', calories: '', protein: '', carbs: '', fat: '', querying: false, photoId: null, ingredients: null, showIngredients: false }
  ]);
  const [photos, setPhotos] = useState([]);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [showBarcodeError, setShowBarcodeError] = useState(false);
  const [barcodeErrorMessage, setBarcodeErrorMessage] = useState('');
  const [showBarcodeConfirm, setShowBarcodeConfirm] = useState(false);
  const [barcodeConfirmData, setBarcodeConfirmData] = useState(null);
  const barcodeScannedRef = useRef(false);
  const barcodeErrorShowingRef = useRef(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [highlightInvalidId, setHighlightInvalidId] = useState(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const FOOD_LOAD_EMOJIS = ['🍽️', '🍳', '🥗', '🍲', '🥘', '🍴', '🧑‍🍳', '🔥', '🥄', '🫕'];
  const ANALYZING_MESSAGES = [
    'Sofra hazırlanıyor...', 'Malzemeler inceleniyor...', 'Besin değerleri hesaplanıyor...',
    'Tarifler araştırılıyor...', 'Porsiyonlar ayarlanıyor...', 'Kalori tablosu oluşturuluyor...',
    'AI şef çalışıyor...', 'Neredeyse hazır...', 'Makrolar hesaplanıyor...',
  ];
  const QUERY_EMOJIS = ['🧑‍🍳', '🔍', '📊', '🍽️', '⚡', '🧮'];
  const QUERY_MESSAGES = [
    'Analiz ediliyor...', 'Malzemeler ayrıştırılıyor...', 'Besin değerleri bulunuyor...',
    'Tarifler kontrol ediliyor...', 'Hesaplamalar yapılıyor...', 'Neredeyse hazır...',
  ];
  const foodLoadEmojiOpacity = useRef(new Animated.Value(1)).current;
  const foodLoadEmojiScale = useRef(new Animated.Value(1)).current;
  const [foodLoadEmojiIndex, setFoodLoadEmojiIndex] = useState(0);
  const [analyzingMsgIndex, setAnalyzingMsgIndex] = useState(0);
  const [queryAnimIndex, setQueryAnimIndex] = useState(0);
  const analyzingRef = useRef(analyzing);
  analyzingRef.current = analyzing;

  // Ready Meals State
  const [showReadyMealsModal, setShowReadyMealsModal] = useState(false);

  const handleSelectReadyMeal = (meal) => {
    setShowReadyMealsModal(false);

    // YENİ: Hazır öğünün içeriğini mevcut listeye ekle
    const newItems = meal.items.map(item => ({
      id: String(Date.now() + Math.random()),
      name: item.name,
      portion: item.portion,
      calories: String(item.calories),
      protein: String(item.protein || 0),
      carbs: String(item.carbs || 0),
      fat: String(item.fat || 0),
      querying: false,
      photoId: null
    }));

    setFoodItems(newItems);


  };

  useEffect(() => {
    if (!analyzing) return;
    const cycleEmoji = () => {
      if (!analyzingRef.current) return;
      Animated.parallel([
        Animated.timing(foodLoadEmojiOpacity, {
          toValue: 0, duration: 250, useNativeDriver: true, easing: Easing.out(Easing.ease),
        }),
        Animated.timing(foodLoadEmojiScale, {
          toValue: 0.6, duration: 250, useNativeDriver: true, easing: Easing.in(Easing.ease),
        }),
      ]).start(() => {
        if (!analyzingRef.current) return;
        setFoodLoadEmojiIndex((prev) => (prev + 1) % FOOD_LOAD_EMOJIS.length);
        foodLoadEmojiScale.setValue(0.6);
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(foodLoadEmojiOpacity, {
              toValue: 1, duration: 250, useNativeDriver: true, easing: Easing.out(Easing.ease),
            }),
            Animated.timing(foodLoadEmojiScale, {
              toValue: 1, duration: 250, useNativeDriver: true, easing: Easing.out(Easing.back(1.2)),
            }),
          ]).start();
        }, 30);
      });
    };
    const emojiInterval = setInterval(cycleEmoji, 1800);
    const msgInterval = setInterval(() => {
      if (!analyzingRef.current) return;
      setAnalyzingMsgIndex((prev) => (prev + 1) % ANALYZING_MESSAGES.length);
    }, 2500);
    return () => { clearInterval(emojiInterval); clearInterval(msgInterval); };
  }, [analyzing]);

  // Query animasyonu (manuel AI analiz)
  useEffect(() => {
    const hasQuerying = foodItems.some(f => f.querying);
    if (!hasQuerying) return;
    const interval = setInterval(() => {
      setQueryAnimIndex(prev => (prev + 1) % QUERY_MESSAGES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [foodItems]);

  const getFirstInvalidItemId = () => {
    const inv = foodItems.find(item => {
      const nameOk = (item.name || '').trim();
      const cal = (item.calories || '').trim();
      const calNum = parseInt(cal, 10);
      return !nameOk || !cal || isNaN(calNum);
    });
    return inv ? inv.id : null;
  };

  const runShakeAndHighlight = (invalidId) => {
    setHighlightInvalidId(invalidId);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true, easing: Easing.linear }),
    ]).start(() => {
      setTimeout(() => setHighlightInvalidId(null), 2000);
    });
  };

  const removePhoto = (photoId) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
    setFoodItems(prev => {
      const next = prev.filter(item => item.photoId !== photoId);
      return next.length ? next : [{ id: '1', name: '', portion: '', calories: '', protein: '', carbs: '', fat: '', querying: false, photoId: null, ingredients: null, showIngredients: false }];
    });
  };

  const addFoodItem = () => {
    const firstInvalidId = getFirstInvalidItemId();
    if (firstInvalidId) {
      runShakeAndHighlight(firstInvalidId);
      return;
    }
    const newId = String(Date.now());
    setFoodItems([...foodItems, { id: newId, name: '', portion: '', calories: '', protein: '', carbs: '', fat: '', querying: false, photoId: null, ingredients: null, showIngredients: false }]);
  };

  const removeFoodItem = (id) => {
    if (foodItems.length === 1) {
      showAlert('Girdinizi Kontrol Edin', 'En az bir yiyecek kalmalıdır. Öğünü kaydetmek istemiyorsanız geri dönün.');
      return;
    }
    setFoodItems(foodItems.filter(item => item.id !== id));
  };

  const updateFoodItem = (id, field, value) => {
    if ((field === 'name' || field === 'calories') && id === highlightInvalidId) {
      setHighlightInvalidId(null);
    }
    setFoodItems(foodItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const queryFoodNutrients = async (itemId) => {
    const item = foodItems.find(f => f.id === itemId);

    const nameStr = (item.name || '').trim();
    const portionStr = (item.portion || '').trim();
    if (!nameStr) {
      showAlert('Girdinizi Kontrol Edin', 'Bu yiyecek için ad girin, ardından "Besin Değerlerini Sorgula"ya basın. Boş bırakamazsınız.');
      return;
    }

    const gramsMatch = portionStr.match(/(\d+)/);
    const grams = gramsMatch ? parseInt(gramsMatch[1]) : null;

    // Loading state'i aktif et
    setFoodItems(prev => prev.map(f =>
      f.id === itemId ? { ...f, querying: true } : f
    ));

    try {
      // === AI TARİF ANALİZİ ===
      // Gramaj girilmişse de girilmemişse de AI ile tarif analizi yap
      console.log(`\n🧑‍🍳 ═══════════════════════════════════════`);
      console.log(`🔍 "${nameStr}" için AI tarif analizi başlıyor...`);
      console.log(`   ${grams ? `Porsiyon: ${grams}g` : 'Porsiyon belirtilmedi, standart porsiyon kullanılacak'}`);
      console.log(`🧑‍🍳 ═══════════════════════════════════════\n`);

      const recipeResult = await analyzeRecipeWithAI(nameStr, grams);

      if (recipeResult.success && recipeResult.ingredients.length > 0) {
        const ingredients = recipeResult.ingredients;
        const totals = recipeResult.totals;

        // Eğer AI sadece 1 malzeme döndürdüyse (basit gıda), malzeme listesi ekleme
        if (ingredients.length === 1) {
          const ing = ingredients[0];
          setFoodItems(prev => prev.map(f =>
            f.id === itemId ? {
              ...f,
              portion: ing.grams.toString(),
              calories: ing.calories.toString(),
              protein: ing.protein.toString(),
              carbs: ing.carbs.toString(),
              fat: ing.fat.toString(),
              querying: false,
              ingredients: null,
              showIngredients: false,
            } : f
          ));

          console.log(`✅ "${nameStr}" basit gıda olarak eklendi:`);
          console.log(`   📏 ${ing.grams}g | 🔥 ${ing.calories} kcal | 💪 ${ing.protein}g P | 🍞 ${ing.carbs}g K | 🧈 ${ing.fat}g Y`);
        } else {
          // Birden fazla malzeme: ana item'ın içine alt malzeme olarak ekle
          setFoodItems(prev => prev.map(f =>
            f.id === itemId ? {
              ...f,
              portion: totals.grams.toString(),
              calories: totals.calories.toString(),
              protein: totals.protein.toString(),
              carbs: totals.carbs.toString(),
              fat: totals.fat.toString(),
              querying: false,
              ingredients: ingredients,
              showIngredients: true,
            } : f
          ));

          console.log(`\n🎉 ═══════════════════════════════════════`);
          console.log(`✅ "${nameStr}" ${ingredients.length} malzeme ile analiz edildi (alt madde olarak eklendi)`);
          console.log(`🎉 ═══════════════════════════════════════`);
          ingredients.forEach((ing, i) => {
            console.log(`   ${i + 1}. ${ing.name}`);
            console.log(`      📏 ${ing.grams}g | 🔥 ${ing.calories} kcal | 💪 ${ing.protein}g P | 🍞 ${ing.carbs}g K | 🧈 ${ing.fat}g Y`);
          });
          console.log(`   ─────────────────────────────────────`);
          console.log(`   📊 TOPLAM: ${totals.grams}g | ${totals.calories} kcal | ${totals.protein}g P | ${totals.carbs}g K | ${totals.fat}g Y`);
          console.log(`═══════════════════════════════════════\n`);
        }
      } else {
        // AI tarif analizi başarısız olduysa
        if (recipeResult.isQuotaError) {
          showAlert('Kota Doldu', 'Kota doldu daha sonra tekrar deneyin');
          setFoodItems(prev => prev.map(f =>
            f.id === itemId ? { ...f, querying: false } : f
          ));
          return;
        } else if (recipeResult.error) {
          showAlert('Hata', recipeResult.error);
        }
        
        // USDA'dan dene (gramaj varsa)
        if (grams) {
          console.log(`⚠️ AI tarif analizi başarısız, USDA'dan sorgulanıyor...`);
          const englishName = translateFoodName(nameStr);
          console.log(`🔍 USDA Sorgulanıyor: "${nameStr}" → "${englishName}"`);

          const result = await searchFoodInUSDA(englishName);

          if (result.success) {
            const food = result.food;
            const calories = Math.round((food.calories * grams) / 100);
            const protein = Math.round((food.protein * grams) / 100);
            const carbs = Math.round((food.carbs * grams) / 100);
            const fat = Math.round((food.fat * grams) / 100);

            setFoodItems(prev => prev.map(f =>
              f.id === itemId ? {
                ...f,
                calories: calories.toString(),
                protein: protein.toString(),
                carbs: carbs.toString(),
                fat: fat.toString(),
                querying: false
              } : f
            ));

            console.log(`✅ USDA'dan "${nameStr}" için besin değerleri bulundu:`);
            console.log(`   🔥 Kalori: ${calories} kcal`);
            console.log(`   💪 Protein: ${protein}g`);
            console.log(`   🍞 Karbonhidrat: ${carbs}g`);
            console.log(`   🧈 Yağ: ${fat}g`);
          } else {
            setFoodItems(prev => prev.map(f =>
              f.id === itemId ? { ...f, querying: false } : f
            ));
            console.log(`❌ "${nameStr}" için besin değerleri bulunamadı (hem AI hem USDA)`);
            showAlert('Bulunamadı', `"${nameStr}" için besin değerleri bulunamadı. Lütfen değerleri manuel girin.`);
          }
        } else {
          setFoodItems(prev => prev.map(f =>
            f.id === itemId ? { ...f, querying: false } : f
          ));
          console.log(`❌ "${nameStr}" için AI tarif analizi başarısız oldu`);
          showAlert('Bulunamadı', `"${nameStr}" için malzeme analizi yapılamadı. Gramaj girip tekrar deneyin veya değerleri manuel girin.`);
        }
      }
    } catch (error) {
      console.error('❌ Sorgulama hatası:', error);
      setFoodItems(prev => prev.map(f =>
        f.id === itemId ? { ...f, querying: false } : f
      ));
      showAlert('Hata', 'Sorgulama sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const toggleIngredients = (itemId) => {
    setFoodItems(prev => prev.map(f =>
      f.id === itemId ? { ...f, showIngredients: !f.showIngredients } : f
    ));
  };

  const removeIngredient = (itemId, ingredientId) => {
    setFoodItems(prev => prev.map(f => {
      if (f.id !== itemId || !f.ingredients) return f;

      const newIngredients = f.ingredients.filter(ing => ing.id !== ingredientId);

      // Toplamları yeniden hesapla
      if (newIngredients.length === 0) {
        return { ...f, ingredients: null, showIngredients: false };
      }

      const totals = newIngredients.reduce((acc, ing) => ({
        grams: acc.grams + ing.grams,
        calories: acc.calories + ing.calories,
        protein: acc.protein + ing.protein,
        carbs: acc.carbs + ing.carbs,
        fat: acc.fat + ing.fat,
      }), { grams: 0, calories: 0, protein: 0, carbs: 0, fat: 0 });

      return {
        ...f,
        ingredients: newIngredients,
        portion: totals.grams.toString(),
        calories: totals.calories.toString(),
        protein: totals.protein.toString(),
        carbs: totals.carbs.toString(),
        fat: totals.fat.toString(),
      };
    }));
  };

  const pickImageFromCamera = async () => {
    try {
      console.log('📸 Kamera butonuna basıldı');
      setShowImageOptions(false);

      console.log('🔐 Kamera izni kontrol ediliyor...');
      const permissionResult = await ImagePicker.getCameraPermissionsAsync();
      console.log('📋 Mevcut izin durumu:', permissionResult.status);

      if (permissionResult.status !== 'granted') {
        console.log('⚠️ İzin yok, izin isteniyor...');
        const requestResult = await ImagePicker.requestCameraPermissionsAsync();
        console.log('📋 İzin isteği sonucu:', requestResult.status);

        if (requestResult.status !== 'granted') {
          console.log('❌ Kamera erişimi reddedildi');
          return;
        }
      }

      console.log('✅ İzin alındı, kamera açılıyor...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('📷 Kamera sonucu:', result);

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        const photoId = String(Date.now());
        const append = photos.length > 0;
        setPhotos(prev => append ? [...prev, { id: photoId, uri }] : [{ id: photoId, uri }]);
        analyzeImage(uri, append, photoId);
      } else {
        console.log('⚠️ Kullanıcı fotoğraf çekmeyi iptal etti');
      }
    } catch (error) {
      console.error('❌ Kamera hatası:', error);
      console.error('Hata detayı:', error.message);
    }
  };

  const pickImageFromGallery = async () => {
    try {
      console.log('📸 Galeriden seç butonuna basıldı');
      setShowImageOptions(false);

      console.log('🔐 Galeri izni kontrol ediliyor...');
      const permissionResult = await ImagePicker.getMediaLibraryPermissionsAsync();
      console.log('📋 Mevcut izin durumu:', permissionResult.status);

      if (permissionResult.status !== 'granted') {
        console.log('⚠️ İzin yok, izin isteniyor...');
        const requestResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log('📋 İzin isteği sonucu:', requestResult.status);

        if (requestResult.status !== 'granted') {
          console.log('❌ Galeri erişimi reddedildi');
          return;
        }
      }

      console.log('✅ İzin alındı, galeri açılıyor...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('📷 Galeri sonucu:', result);

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        const photoId = String(Date.now());
        const append = photos.length > 0;
        setPhotos(prev => append ? [...prev, { id: photoId, uri }] : [{ id: photoId, uri }]);
        analyzeImage(uri, append, photoId);
      } else {
        console.log('⚠️ Kullanıcı fotoğraf seçimini iptal etti');
      }
    } catch (error) {
      console.error('❌ Galeri hatası:', error);
      console.error('Hata detayı:', error.message);
    }
  };

  const analyzeImage = async (imageUri, append = false, photoId = null) => {
    setAnalyzing(true);
    try {
      const result = await analyzeFoodImage(imageUri);

      if (result.success && result.foods.length > 0) {
        console.log('🎉 AI Fotoğraf Analizi Başarılı:', result.message);
        console.log(`📋 ${result.foods.length} yemek tespit edildi, malzeme analizi başlıyor...\n`);

        // Her tespit edilen yemek için malzeme analizi yap
        const newFoodItems = [];

        for (let foodIdx = 0; foodIdx < result.foods.length; foodIdx++) {
          const food = result.foods[foodIdx];
          const foodName = food.name;
          const foodGrams = food.grams || parseInt(food.portion) || null;

          // Ardışık çağrılar arası bekleme (rate limit önleme)
          if (foodIdx > 0) {
            console.log(`   ⏳ API rate limit önlemi: 1.5s bekleniyor...`);
            await new Promise(resolve => setTimeout(resolve, 1500));
          }

          console.log(`\n🧑‍🍳 ═══════════════════════════════════════`);
          console.log(`📸 "${foodName}" (${foodGrams || '?'}g) için malzeme analizi... (${foodIdx + 1}/${result.foods.length})`);
          console.log(`🧑‍🍳 ═══════════════════════════════════════`);

          try {
            const recipeResult = await analyzeRecipeWithAI(foodName, foodGrams);

            if (recipeResult.success && recipeResult.ingredients.length > 0) {
              const ingredients = recipeResult.ingredients;
              const totals = recipeResult.totals;

              if (ingredients.length === 1) {
                // Basit gıda - malzeme listesi yok
                const ing = ingredients[0];
                newFoodItems.push({
                  id: food.id || String(Date.now() + Math.random()),
                  name: foodName,
                  portion: ing.grams.toString(),
                  calories: ing.calories.toString(),
                  protein: ing.protein.toString(),
                  carbs: ing.carbs.toString(),
                  fat: ing.fat.toString(),
                  querying: false,
                  photoId,
                  ingredients: null,
                  showIngredients: false,
                });

                console.log(`✅ "${foodName}" basit gıda:`);
                console.log(`   📏 ${ing.grams}g | 🔥 ${ing.calories} kcal | 💪 ${ing.protein}g P | 🍞 ${ing.carbs}g K | 🧈 ${ing.fat}g Y`);
              } else {
                // Karmaşık yemek - malzeme listesi ile
                newFoodItems.push({
                  id: food.id || String(Date.now() + Math.random()),
                  name: foodName,
                  portion: totals.grams.toString(),
                  calories: totals.calories.toString(),
                  protein: totals.protein.toString(),
                  carbs: totals.carbs.toString(),
                  fat: totals.fat.toString(),
                  querying: false,
                  photoId,
                  ingredients: ingredients,
                  showIngredients: true,
                });

                console.log(`✅ "${foodName}" ${ingredients.length} malzeme ile eklendi:`);
                ingredients.forEach((ing, i) => {
                  console.log(`   ${i + 1}. ${ing.name} - ${ing.grams}g - ${ing.calories} kcal`);
                });
                console.log(`   📊 TOPLAM: ${totals.grams}g | ${totals.calories} kcal`);
              }
            } else {
              // AI tarif analizi başarısız - orijinal verileri kullan
              console.log(`⚠️ "${foodName}" için malzeme analizi yapılamadı, orijinal veriler kullanılıyor`);
              if (recipeResult.isQuotaError) {
                showAlert('Kota Doldu', 'Kota doldu daha sonra tekrar deneyin');
              } else if (recipeResult.error) {
                showAlert('Uyarı', `${foodName} için analiz başarısız: ${recipeResult.error}`);
              }
              newFoodItems.push({
                id: food.id || String(Date.now() + Math.random()),
                name: foodName,
                portion: food.portion || (foodGrams ? foodGrams.toString() : ''),
                calories: food.calories.toString(),
                protein: food.protein ? food.protein.toString() : '',
                carbs: food.carbs ? food.carbs.toString() : '',
                fat: food.fat ? food.fat.toString() : '',
                querying: false,
                photoId,
                ingredients: null,
                showIngredients: false,
              });
              
              if (recipeResult.isQuotaError) {
                break;
              }
            }
          } catch (recipeError) {
            console.error(`❌ "${foodName}" malzeme analizi hatası:`, recipeError.message);
            // Hata durumunda orijinal verileri kullan
            newFoodItems.push({
              id: food.id || String(Date.now() + Math.random()),
              name: foodName,
              portion: food.portion || '',
              calories: food.calories.toString(),
              protein: food.protein ? food.protein.toString() : '',
              carbs: food.carbs ? food.carbs.toString() : '',
              fat: food.fat ? food.fat.toString() : '',
              querying: false,
              photoId,
              ingredients: null,
              showIngredients: false,
            });
          }
        }

        if (newFoodItems.length > 0) {
          if (append) {
            setFoodItems((prev) => [...prev, ...newFoodItems]);
          } else {
            setFoodItems(newFoodItems);
          }

          // Toplam log
          console.log(`\n🎉 ═══════════════════════════════════════`);
          console.log(`📸 FOTOĞRAF ANALİZİ TAMAMLANDI`);
          console.log(`🎉 ═══════════════════════════════════════`);
          newFoodItems.forEach((food, index) => {
            const ingCount = food.ingredients ? food.ingredients.length : 0;
            console.log(`   ${index + 1}. ${food.name} - ${food.portion}g - ${food.calories} kcal${ingCount > 0 ? ` (${ingCount} malzeme)` : ''}`);
          });
          const totalCal = newFoodItems.reduce((sum, f) => sum + parseInt(f.calories || 0), 0);
          console.log(`   ─────────────────────────────────────`);
          console.log(`   💰 TOPLAM KALORİ: ${totalCal} kcal`);
          console.log(`═══════════════════════════════════════\n`);
        }
      } else {
        const errorMessage = result.error || 'Yiyecek tespit edilemedi. Manuel olarak ekleyebilirsin.';
        console.log('❌ Analiz Başarısız:', errorMessage);
        if (result.isQuotaError) {
          showAlert('Kota Doldu', 'Kota doldu daha sonra tekrar deneyin');
        } else {
          showAlert('Analiz Başarısız', errorMessage);
        }
      }
    } catch (error) {
      console.error('❌ Görüntü analiz hatası:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const openBarcodeScanner = () => {
    barcodeScannedRef.current = false;
    if (!cameraPermission?.granted) {
      requestCameraPermission().then((result) => {
        if (result?.granted) setShowBarcodeScanner(true);
        else showAlert('Kamera İzni', 'Barkod okutmak için kameraya izin vermeniz gerekir.');
      });
    } else {
      setShowBarcodeScanner(true);
    }
  };

  const closeBarcodeErrorModal = () => {
    setShowBarcodeError(false);
    barcodeErrorShowingRef.current = false;
  };

  const confirmBarcodeAdd = () => {
    if (!barcodeConfirmData) return;
    const itemData = {
      name: barcodeConfirmData.name,
      portion: barcodeConfirmData.portion,
      calories: barcodeConfirmData.calories,
      protein: barcodeConfirmData.protein,
      carbs: barcodeConfirmData.carbs,
      fat: barcodeConfirmData.fat,
      querying: false,
      photoId: null,
    };
    setFoodItems((prev) => {
      const first = prev[0];
      const firstEmpty = first && !(first.name || '').trim() && !(first.portion || '').trim() && !(first.calories || '').trim();
      if (firstEmpty) {
        return [{ ...prev[0], ...itemData }, ...prev.slice(1)];
      }
      return [...prev, { id: String(Date.now()), ...itemData }];
    });
    setShowBarcodeConfirm(false);
    setBarcodeConfirmData(null);
  };

  const cancelBarcodeConfirm = () => {
    setShowBarcodeConfirm(false);
    setBarcodeConfirmData(null);
  };

  const onBarcodeScanned = async ({ data }) => {
    if (barcodeErrorShowingRef.current) return;
    if (barcodeScannedRef.current || barcodeLoading) return;
    barcodeScannedRef.current = true;
    setBarcodeLoading(true);
    setShowBarcodeError(false);
    try {
      const result = await getProductByBarcode(data);
      if (result.success) {
        setShowBarcodeScanner(false);
        setBarcodeConfirmData({
          name: result.productName || '',
          portion: String(result.portion ?? 100),
          calories: String(result.calories ?? 0),
          protein: String(result.protein ?? 0),
          carbs: String(result.carbs ?? 0),
          fat: String(result.fat ?? 0),
          imageUrl: result.imageUrl || null,
        });
        setShowBarcodeConfirm(true);
      } else {
        setBarcodeErrorMessage(result.error || 'Bu barkod için besin verisi yok.');
        barcodeErrorShowingRef.current = true;
        setShowBarcodeError(true);
      }
    } catch (err) {
      setShowBarcodeScanner(false);
      setBarcodeErrorMessage(err.message || 'Barkod sorgulanırken hata oluştu.');
      barcodeErrorShowingRef.current = true;
      setShowBarcodeError(true);
    } finally {
      setBarcodeLoading(false);
      barcodeScannedRef.current = false;
    }
  };

  const calculateTotalCalories = () => {
    return foodItems.reduce((total, item) => {
      const calories = parseInt(item.calories) || 0;
      return total + calories;
    }, 0);
  };

  const handleSaveMeal = async () => {
    const validItems = foodItems.filter(item => (item.name || '').trim() && (item.calories || '').trim());
    const firstInvalidId = getFirstInvalidItemId();

    if (validItems.length === 0 || firstInvalidId) {
      if (firstInvalidId) {
        runShakeAndHighlight(firstInvalidId);
      } else {
        showAlert('Girdinizi Kontrol Edin', 'En az bir yiyecek ekleyin; her biri için yiyecek adı ve kalori (kcal) girin. Boş bırakamazsınız.');
      }
      return;
    }

    const hasEmptyCalories = validItems.some(item => {
      const cal = (item.calories || '').trim();
      return !cal || isNaN(parseInt(cal, 10));
    });
    if (hasEmptyCalories) {
      if (firstInvalidId) runShakeAndHighlight(firstInvalidId);
      else showAlert('Girdinizi Kontrol Edin', 'Tüm yiyeceklerin kalori bilgisi girilmiş olmalı. Eksik veya boş bırakılamaz.');
      return;
    }

    setLoading(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('❌ Kullanıcı oturumu bulunamadı');
        setLoading(false);
        return;
      }

      const totalCalories = calculateTotalCalories();

      const mealData = {
        mealType,
        items: validItems.map(item => ({
          name: item.name,
          portion: item.portion || '',
          calories: parseInt(item.calories),
          protein: item.protein ? parseInt(item.protein) : 0,
          carbs: item.carbs ? parseInt(item.carbs) : 0,
          fat: item.fat ? parseInt(item.fat) : 0,
        })),
        totalCalories,
      };

      console.log('💾 Öğün kaydediliyor...');
      const result = await addMeal(currentUser.uid, mealData);

      if (result.success) {
        console.log(`✅ Öğün başarıyla eklendi!`);
        console.log(`   ${validItems.length} yiyecek eklendi`);
        console.log(`   Toplam: ${totalCalories} kcal`);
        console.log(`   Toplam: ${totalCalories} kcal`);

        // NOT: Buradaki cancelMealNotification çağrısı tekrarlayan bildirimleri tamamen iptal ettiği için kaldırıldı.
        // Gelecekte sadece "bugünü" iptal eden bir mantık eklenebilir.

        navigation.goBack();
      } else {
        console.log('❌ Öğün eklenirken hata:', result.error);
      }
    } catch (error) {
      console.log('❌ Öğün eklenirken hata:', error.message);
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
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Öğün Ekle</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Hazır Öğünler (Yeni Özellik) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hızlı Ekle ⚡</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <TouchableOpacity
              style={[styles.aiButton, { flex: 1, backgroundColor: '#3F51B5', marginBottom: 0 }]}
              onPress={() => setShowReadyMealsModal(true)}
            >
              <Text style={{ fontSize: 20, marginRight: 8 }}>🍱</Text>
              <Text style={styles.aiButtonText}>Hazır Öğünlerim</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.aiButton, { flex: 1, backgroundColor: '#2a3447', marginBottom: 0, borderWidth: 1, borderColor: '#3F51B5', borderStyle: 'dashed' }]}
              onPress={() => navigation.navigate('CreateReadyMeal')}
            >
              <Text style={{ fontSize: 20, marginRight: 8 }}>➕</Text>
              <Text style={styles.aiButtonText}>Yeni Oluştur</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.inputHint}>
            Sık yediğiniz öğünleri kaydedip buradan tek tıkla ekleyebilirsiniz.
          </Text>
        </View>

        {/* AI Fotoğraf Analizi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fotoğraftan Ekle (AI) 🤖</Text>

          {photos.length > 0 && (
            <View style={styles.photosGrid}>
              {photos.map((photo) => (
                <View key={photo.id} style={styles.photoGridItem}>
                  <Image source={{ uri: photo.uri }} style={styles.photoGridImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removePhoto(photo.id)}
                  >
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {analyzing ? (
            <View style={styles.analyzingContainer}>
              <Animated.View style={[styles.foodLoadIconWrap, { opacity: foodLoadEmojiOpacity, transform: [{ scale: foodLoadEmojiScale }] }]}>
                <Text style={styles.foodLoadEmoji}>{FOOD_LOAD_EMOJIS[foodLoadEmojiIndex]}</Text>
              </Animated.View>
              <Text style={styles.analyzingText}>{ANALYZING_MESSAGES[analyzingMsgIndex]}</Text>
              <Text style={styles.analyzingSubtext}>AI yemekleri tanıyor ve analiz ediyor</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.aiButton}
              onPress={() => setShowImageOptions(true)}
            >
              <Text style={styles.aiButtonIcon}>📸</Text>
              <Text style={styles.aiButtonText}>
                {photos.length > 0 ? 'Bir fotoğraf daha ekle' : 'Fotoğraf Çek veya Seç'}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.inputHint}>
            AI tabaktaki her yiyeceği ayrı ayrı tespit edip besin değerlerini getirecek.
          </Text>
        </View>

        {/* Barkod ile Paketli Gıda */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Barkod ile Ekle 📦</Text>
          <TouchableOpacity
            style={styles.barcodeButton}
            onPress={openBarcodeScanner}
            disabled={barcodeLoading}
          >
            {barcodeLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.barcodeButtonIcon}>📷</Text>
                <Text style={styles.barcodeButtonText}>Barkod Okut</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.inputHint}>
            Paketli ürünün barkodunu okutun; kalori, protein, karbonhidrat ve yağ otomatik doldurulur (Open Food Facts).
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
                <Text style={styles.totalCaloriesLabel}>TOPLAM</Text>
                <Text style={styles.totalCaloriesText}>{totalCalories} kcal</Text>
              </View>
            )}
          </View>

          {foodItems.map((item, index) => {
            const isHighlighted = item.id === highlightInvalidId;
            const cardStyle = [
              styles.foodItemCard,
              isHighlighted && styles.foodItemCardInvalid,
            ];
            const animatedStyle = isHighlighted ? {
              transform: [{
                translateX: shakeAnim.interpolate({
                  inputRange: [0, 0.25, 0.5, 0.75, 1],
                  outputRange: [0, -8, 8, -8, 0],
                }),
              }],
            } : {};
            return (
              <Animated.View key={item.id} style={[cardStyle, animatedStyle]}>
                {isHighlighted && (
                  <View style={styles.fillFirstHint}>
                    <Text style={styles.fillFirstHintText}>⬇ Önce bu yiyeceği doldurun</Text>
                  </View>
                )}
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
                    placeholder="Örn: Trileçe, Domates, vb."
                    placeholderTextColor="#666"
                    value={item.name}
                    onChangeText={(value) => updateFoodItem(item.id, 'name', value)}
                  />
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Gramaj (g) - opsiyonel</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="100"
                      placeholderTextColor="#666"
                      value={item.portion}
                      onChangeText={(value) => updateFoodItem(item.id, 'portion', allowOnlyNumbers(value).slice(0, 6))}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Kalori (kcal) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Sorgula"
                      placeholderTextColor="#666"
                      value={item.calories}
                      onChangeText={(value) => updateFoodItem(item.id, 'calories', allowOnlyNumbers(value).slice(0, 6))}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                </View>

                {/* Sorgula Butonu */}
                <TouchableOpacity
                  style={styles.queryButton}
                  onPress={() => queryFoodNutrients(item.id)}
                  disabled={item.querying}
                >
                  {item.querying ? (
                    <View style={styles.queryLoadingContainer}>
                      <Text style={styles.queryLoadingEmoji}>{QUERY_EMOJIS[queryAnimIndex % QUERY_EMOJIS.length]}</Text>
                      <Text style={styles.queryLoadingText}>{QUERY_MESSAGES[queryAnimIndex % QUERY_MESSAGES.length]}</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.queryButtonIcon}>🧑‍🍳</Text>
                      <Text style={styles.queryButtonText}>
                        AI ile Malzeme Analizi Yap
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Besin Değerleri */}
                <View style={styles.nutrientsContainer}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 4 }]}>
                    <Text style={styles.label}>Protein (g)</Text>
                    <TextInput
                      style={[styles.input, styles.smallInput]}
                      placeholder="0"
                      placeholderTextColor="#666"
                      value={item.protein}
                      onChangeText={(value) => updateFoodItem(item.id, 'protein', allowOnlyNumbers(value).slice(0, 5))}
                      keyboardType="number-pad"
                      maxLength={5}
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginHorizontal: 4 }]}>
                    <Text style={styles.label}>Karb. (g)</Text>
                    <TextInput
                      style={[styles.input, styles.smallInput]}
                      placeholder="0"
                      placeholderTextColor="#666"
                      value={item.carbs}
                      onChangeText={(value) => updateFoodItem(item.id, 'carbs', allowOnlyNumbers(value).slice(0, 5))}
                      keyboardType="number-pad"
                      maxLength={5}
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 4 }]}>
                    <Text style={styles.label}>Yağ (g)</Text>
                    <TextInput
                      style={[styles.input, styles.smallInput]}
                      placeholder="0"
                      placeholderTextColor="#666"
                      value={item.fat}
                      onChangeText={(value) => updateFoodItem(item.id, 'fat', allowOnlyNumbers(value).slice(0, 5))}
                      keyboardType="number-pad"
                      maxLength={5}
                    />
                  </View>
                </View>

                {/* Malzeme Listesi (Alt Maddeler) */}
                {item.ingredients && item.ingredients.length > 1 && (
                  <View style={styles.ingredientsSection}>
                    <TouchableOpacity
                      style={styles.ingredientsToggle}
                      onPress={() => toggleIngredients(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.ingredientsToggleLeft}>
                        <Text style={styles.ingredientsToggleIcon}>
                          {item.showIngredients ? '▼' : '▶'}
                        </Text>
                        <Text style={styles.ingredientsToggleText}>
                          İçindekiler ({item.ingredients.length} malzeme)
                        </Text>
                      </View>
                      <Text style={styles.ingredientsToggleHint}>
                        {item.showIngredients ? 'Gizle' : 'Göster'}
                      </Text>
                    </TouchableOpacity>

                    {item.showIngredients && (
                      <View style={styles.ingredientsList}>
                        {item.ingredients.map((ing, ingIdx) => (
                          <View key={ing.id || ingIdx} style={styles.ingredientRow}>
                            <TouchableOpacity
                              style={styles.ingredientRemoveBtn}
                              onPress={() => removeIngredient(item.id, ing.id)}
                              activeOpacity={0.6}
                            >
                              <Text style={styles.ingredientRemoveText}>−</Text>
                            </TouchableOpacity>
                            <View style={styles.ingredientNameCol}>
                              <Text style={styles.ingredientName}>{ing.name}</Text>
                            </View>
                            <View style={styles.ingredientValues}>
                              <Text style={styles.ingredientGrams}>{ing.grams}g</Text>
                              <Text style={styles.ingredientCalories}>{ing.calories} kcal</Text>
                            </View>
                            <View style={styles.ingredientMacros}>
                              <Text style={styles.ingredientMacroP}>{ing.protein}P</Text>
                              <Text style={styles.ingredientMacroC}>{ing.carbs}K</Text>
                              <Text style={styles.ingredientMacroF}>{ing.fat}Y</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </Animated.View>
            );
          })}

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
            📸 Fotoğraftan AI her yiyeceği AYRI AYRI tespit eder.
            {'\n'}📦 Barkod ile paketli gıdaların kalori ve makro değerleri otomatik gelir.
            {'\n'}🔍 Manuel girişte yiyecek adı ve gramajını gir, "Sorgula" butonuna bas!
            {'\n'}✅ Toplam kalori otomatik hesaplanır, istersen manuel düzenle.
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

      {/* Barkod Tarayıcı Modalı */}
      <Modal
        visible={showBarcodeScanner}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowBarcodeScanner(false)}
      >
        <View style={styles.barcodeModalContainer}>
          <View style={styles.barcodeModalHeader}>
            <Text style={styles.barcodeModalTitle}>Barkod Okut</Text>
            <TouchableOpacity
              style={styles.barcodeCloseButton}
              onPress={() => setShowBarcodeScanner(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          {cameraPermission?.granted ? (
            <View style={styles.cameraWrapper}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
                }}
                onBarcodeScanned={onBarcodeScanned}
              />
              <View style={styles.barcodeOverlay}>
                <Text style={styles.barcodeOverlayText}>Barkodu çerçeve içine alın</Text>
              </View>
            </View>
          ) : (
            <View style={styles.barcodePermissionBox}>
              <Text style={styles.barcodePermissionText}>Kamera erişimi gerekli</Text>
              <TouchableOpacity style={styles.barcodeButton} onPress={requestCameraPermission}>
                <Text style={styles.barcodeButtonText}>İzin Ver</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Barkod Ürün Onay Modalı (foto + bilgi, Tamam = ekle) */}
      <Modal
        visible={showBarcodeConfirm}
        transparent
        animationType="fade"
        onRequestClose={cancelBarcodeConfirm}
      >
        <View style={styles.barcodeConfirmOverlay}>
          <View style={styles.barcodeConfirmCard}>
            <Text style={styles.barcodeConfirmTitle}>Ürünü ekleyelim mi?</Text>
            {barcodeConfirmData?.imageUrl ? (
              <Image source={{ uri: barcodeConfirmData.imageUrl }} style={styles.barcodeConfirmImage} />
            ) : (
              <View style={styles.barcodeConfirmImagePlaceholder}>
                <Ionicons name="nutrition-outline" size={56} color="#4CAF50" />
              </View>
            )}
            <Text style={styles.barcodeConfirmName} numberOfLines={2}>{barcodeConfirmData?.name}</Text>
            <View style={styles.barcodeConfirmRow}>
              <Text style={styles.barcodeConfirmLabel}>{barcodeConfirmData?.portion}g</Text>
              <Text style={styles.barcodeConfirmLabel}> • </Text>
              <Text style={styles.barcodeConfirmLabel}>{barcodeConfirmData?.calories} kcal</Text>
            </View>
            <View style={styles.barcodeConfirmMacros}>
              <Text style={styles.barcodeConfirmMacro}>P: {barcodeConfirmData?.protein}g</Text>
              <Text style={styles.barcodeConfirmMacro}>K: {barcodeConfirmData?.carbs}g</Text>
              <Text style={styles.barcodeConfirmMacro}>Y: {barcodeConfirmData?.fat}g</Text>
            </View>
            <View style={styles.barcodeConfirmButtons}>
              <TouchableOpacity style={styles.barcodeConfirmCancelBtn} onPress={cancelBarcodeConfirm} activeOpacity={0.8}>
                <Text style={styles.barcodeConfirmCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.barcodeConfirmOkBtn} onPress={confirmBarcodeAdd} activeOpacity={0.8}>
                <Text style={styles.barcodeConfirmOkText}>Tamam, Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Barkod Ürün Bulunamadı / Hata Modalı */}
      <Modal
        visible={showBarcodeError}
        transparent
        animationType="fade"
        onRequestClose={closeBarcodeErrorModal}
      >
        <View style={styles.barcodeErrorOverlay}>
          <View style={styles.barcodeErrorCard}>
            <View style={styles.barcodeErrorIconWrap}>
              <Ionicons name="barcode-outline" size={48} color="#f59e0b" />
            </View>
            <Text style={styles.barcodeErrorTitle}>Ürün Bulunamadı</Text>
            <Text style={styles.barcodeErrorMessage}>{barcodeErrorMessage}</Text>
            <Text style={styles.barcodeErrorHint}>Tamam'a basıp tekrar barkod okutabilirsiniz.</Text>
            <TouchableOpacity
              style={styles.barcodeErrorButton}
              onPress={closeBarcodeErrorModal}
              activeOpacity={0.8}
            >
              <Text style={styles.barcodeErrorButtonText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <StatusBar style="light" />
      {/* Ready Meals Modal */}
      <ReadyMealsModal
        visible={showReadyMealsModal}
        onClose={() => setShowReadyMealsModal(false)}
        onSelectMeal={handleSelectReadyMeal}
      />

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
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 100,
  },
  totalCaloriesLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.9,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  totalCaloriesText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
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
  foodItemCardInvalid: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  fillFirstHint: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  fillFirstHintText: {
    fontSize: 13,
    color: '#fca5a5',
    fontWeight: '600',
    textAlign: 'center',
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
  nutrientsContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  smallInput: {
    paddingVertical: 10,
    fontSize: 14,
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
  barcodeButton: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2a3447',
  },
  barcodeButtonIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  barcodeButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  barcodeModalContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  barcodeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#16213e',
  },
  barcodeModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  barcodeCloseButton: {
    padding: 8,
  },
  cameraWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  barcodeOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  barcodeOverlayText: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  barcodePermissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  barcodePermissionText: {
    color: '#b4b4b4',
    fontSize: 16,
    marginBottom: 16,
  },
  barcodeErrorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  barcodeErrorCard: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  barcodeErrorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  barcodeErrorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  barcodeErrorMessage: {
    fontSize: 15,
    color: '#b4b4b4',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  barcodeErrorHint: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  barcodeErrorButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  barcodeErrorButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  barcodeConfirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  barcodeConfirmCard: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  barcodeConfirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  barcodeConfirmImage: {
    width: 140,
    height: 140,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#0f1724',
  },
  barcodeConfirmImagePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#0f1724',
    justifyContent: 'center',
    alignItems: 'center',
  },
  barcodeConfirmName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  barcodeConfirmRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  barcodeConfirmLabel: {
    fontSize: 14,
    color: '#b4b4b4',
  },
  barcodeConfirmMacros: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  barcodeConfirmMacro: {
    fontSize: 13,
    color: '#888',
  },
  barcodeConfirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  barcodeConfirmCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2a3447',
    alignItems: 'center',
  },
  barcodeConfirmCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#b4b4b4',
  },
  barcodeConfirmOkBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  barcodeConfirmOkText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
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
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  photoGridItem: {
    position: 'relative',
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#16213e',
  },
  photoGridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
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
  foodLoadIconWrap: {
    marginBottom: 8,
  },
  foodLoadEmoji: {
    fontSize: 56,
  },
  analyzingText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  analyzingSubtext: {
    color: '#888',
    fontSize: 13,
    marginTop: 6,
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
  inputHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  queryButton: {
    backgroundColor: '#2a3447',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  queryLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queryLoadingEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  queryLoadingText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '600',
  },
  queryButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  queryButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
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
  // Ingredient Sub-items Styles
  ingredientsSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a3447',
    paddingTop: 10,
  },
  ingredientsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  ingredientsToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ingredientsToggleIcon: {
    fontSize: 12,
    color: '#4CAF50',
    marginRight: 8,
    width: 14,
  },
  ingredientsToggleText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  ingredientsToggleHint: {
    fontSize: 12,
    color: '#888',
  },
  ingredientsList: {
    marginTop: 6,
    backgroundColor: '#0f1724',
    borderRadius: 10,
    padding: 10,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42, 52, 71, 0.5)',
  },
  ingredientNameCol: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ingredientBullet: {
    fontSize: 10,
    color: '#4CAF50',
    marginRight: 6,
  },
  ingredientName: {
    fontSize: 13,
    color: '#e0e0e0',
    fontWeight: '500',
    flexShrink: 1,
  },
  ingredientValues: {
    flex: 0.8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  ingredientGrams: {
    fontSize: 12,
    color: '#b4b4b4',
    fontWeight: '500',
  },
  ingredientCalories: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
    minWidth: 48,
    textAlign: 'right',
  },
  ingredientMacros: {
    flex: 0.7,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
  },
  ingredientMacroP: {
    fontSize: 11,
    color: '#60a5fa',
    fontWeight: '500',
  },
  ingredientMacroC: {
    fontSize: 11,
    color: '#f97316',
    fontWeight: '500',
  },
  ingredientMacroF: {
    fontSize: 11,
    color: '#a78bfa',
    fontWeight: '500',
  },
  ingredientRemoveBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  ingredientRemoveText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18,
  },
});
