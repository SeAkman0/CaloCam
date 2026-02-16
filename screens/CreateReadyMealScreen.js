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
    Alert,
    Animated,
    Easing,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../config/firebase';
import { addReadyMeal } from '../services/readyMealService'; // YENİ SERVİS
import { analyzeFoodImage } from '../services/foodAIService';
import { searchFoodInUSDA, translateFoodName } from '../services/usdaFoodService';
import { getProductByBarcode } from '../services/openFoodFactsService';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { allowOnlyNumbers } from '../utils/validation';

const MEAL_TYPES = [
    { id: 'breakfast', label: 'Kahvaltı', icon: '🌅' },
    { id: 'lunch', label: 'Öğle', icon: '☀️' },
    { id: 'dinner', label: 'Akşam', icon: '🌙' },
    { id: 'snack', label: 'Atıştırmalık', icon: '🍎' },
];

export default function CreateReadyMealScreen({ navigation }) {
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [mealName, setMealName] = useState(''); // YENİ: Hazır Öğün Adı
    const [mealCategory, setMealCategory] = useState('breakfast'); // YENİ: Kategori (mealType yerine)
    const [foodItems, setFoodItems] = useState([
        { id: '1', name: '', portion: '', calories: '', protein: '', carbs: '', fat: '', querying: false, photoId: null }
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
    const FOOD_LOAD_EMOJIS = ['🍽️', '🍳', '🥗', '🍲', '🥘', '🍴'];
    const foodLoadEmojiOpacity = useRef(new Animated.Value(1)).current;
    const foodLoadEmojiScale = useRef(new Animated.Value(1)).current;
    const [foodLoadEmojiIndex, setFoodLoadEmojiIndex] = useState(0);
    const analyzingRef = useRef(analyzing);
    analyzingRef.current = analyzing;

    useEffect(() => {
        if (!analyzing) return;
        const cycleEmoji = () => {
            if (!analyzingRef.current) return;
            Animated.parallel([
                Animated.timing(foodLoadEmojiOpacity, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.ease),
                }),
                Animated.timing(foodLoadEmojiScale, {
                    toValue: 0.6,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.in(Easing.ease),
                }),
            ]).start(() => {
                if (!analyzingRef.current) return;
                setFoodLoadEmojiIndex((prev) => (prev + 1) % FOOD_LOAD_EMOJIS.length);
                foodLoadEmojiScale.setValue(0.6);
                setTimeout(() => {
                    Animated.parallel([
                        Animated.timing(foodLoadEmojiOpacity, {
                            toValue: 1,
                            duration: 400,
                            useNativeDriver: true,
                            easing: Easing.out(Easing.ease),
                        }),
                        Animated.timing(foodLoadEmojiScale, {
                            toValue: 1,
                            duration: 400,
                            useNativeDriver: true,
                            easing: Easing.out(Easing.back(1.2)),
                        }),
                    ]).start();
                }, 50);
            });
        };
        const interval = setInterval(cycleEmoji, 3500);
        return () => clearInterval(interval);
    }, [analyzing]);

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
            return next.length ? next : [{ id: '1', name: '', portion: '', calories: '', protein: '', carbs: '', fat: '', querying: false, photoId: null }];
        });
    };

    const addFoodItem = () => {
        const firstInvalidId = getFirstInvalidItemId();
        if (firstInvalidId) {
            runShakeAndHighlight(firstInvalidId);
            return;
        }
        const newId = String(Date.now());
        setFoodItems([...foodItems, { id: newId, name: '', portion: '', calories: '', protein: '', carbs: '', fat: '', querying: false, photoId: null }]);
    };

    const removeFoodItem = (id) => {
        if (foodItems.length === 1) {
            setCustomAlert({
                visible: true,
                title: 'Uyarı',
                message: 'En az bir yiyecek kalmalıdır.'
            });
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
            setCustomAlert({
                visible: true,
                title: 'Uyarı',
                message: 'Yiyecek adı girin.'
            });
            return;
        }

        if (!portionStr) {
            setCustomAlert({
                visible: true,
                title: 'Uyarı',
                message: 'Gramaj (porsiyon) girin.'
            });
            return;
        }

        const gramsMatch = portionStr.match(/(\d+)/);
        if (!gramsMatch) {
            setCustomAlert({
                visible: true,
                title: 'Uyarı',
                message: 'Gramaj sadece rakam olmalıdır.'
            });
            return;
        }
        const grams = parseInt(gramsMatch[1]);

        setFoodItems(foodItems.map(f =>
            f.id === itemId ? { ...f, querying: true } : f
        ));

        try {
            const englishName = translateFoodName(item.name);
            const result = await searchFoodInUSDA(englishName);

            if (result.success) {
                const food = result.food;
                const calories = Math.round((food.calories * grams) / 100);
                const protein = Math.round((food.protein * grams) / 100);
                const carbs = Math.round((food.carbs * grams) / 100);
                const fat = Math.round((food.fat * grams) / 100);

                setFoodItems(foodItems.map(f =>
                    f.id === itemId ? {
                        ...f,
                        calories: calories.toString(),
                        protein: protein.toString(),
                        carbs: carbs.toString(),
                        fat: fat.toString(),
                        querying: false
                    } : f
                ));
            } else {
                setFoodItems(foodItems.map(f =>
                    f.id === itemId ? { ...f, querying: false } : f
                ));
                setCustomAlert({
                    visible: true,
                    title: 'Bulunamadı',
                    message: 'Besin değerleri bulunamadı.'
                });
            }
        } catch (error) {
            setFoodItems(foodItems.map(f =>
                f.id === itemId ? { ...f, querying: false } : f
            ));
            setCustomAlert({
                visible: true,
                title: 'Hata',
                message: 'Sorgulama sırasında bir hata oluştu.'
            });
        }
    };

    // Kamera ve Galeri fonksiyonları AddMealScreen ile aynı, kopyası burada (teknik borç: ortak hook yapılmalı)
    const pickImageFromCamera = async () => {
        try {
            setShowImageOptions(false);
            const permissionResult = await ImagePicker.getCameraPermissionsAsync();
            if (permissionResult.status !== 'granted') {
                const requestResult = await ImagePicker.requestCameraPermissionsAsync();
                if (requestResult.status !== 'granted') return;
            }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });
            if (!result.canceled) {
                const uri = result.assets[0].uri;
                const photoId = String(Date.now());
                const append = photos.length > 0;
                setPhotos(prev => append ? [...prev, { id: photoId, uri }] : [{ id: photoId, uri }]);
                analyzeImage(uri, append, photoId);
            }
        } catch (error) {
            console.error('Kamera hatası:', error);
        }
    };

    const pickImageFromGallery = async () => {
        try {
            setShowImageOptions(false);
            const permissionResult = await ImagePicker.getMediaLibraryPermissionsAsync();
            if (permissionResult.status !== 'granted') {
                const requestResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (requestResult.status !== 'granted') return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });
            if (!result.canceled) {
                const uri = result.assets[0].uri;
                const photoId = String(Date.now());
                const append = photos.length > 0;
                setPhotos(prev => append ? [...prev, { id: photoId, uri }] : [{ id: photoId, uri }]);
                analyzeImage(uri, append, photoId);
            }
        } catch (error) {
            console.error('Galeri hatası:', error);
        }
    };

    const analyzeImage = async (imageUri, append = false, photoId = null) => {
        setAnalyzing(true);
        try {
            const result = await analyzeFoodImage(imageUri);
            if (result.success && result.foods.length > 0) {
                const newFoodItems = result.foods.map(food => ({
                    id: food.id || String(Date.now() + Math.random()),
                    name: food.name,
                    portion: food.portion,
                    calories: food.calories.toString(),
                    protein: food.protein ? food.protein.toString() : '',
                    carbs: food.carbs ? food.carbs.toString() : '',
                    fat: food.fat ? food.fat.toString() : '',
                    querying: false,
                    photoId,
                }));
                if (append) {
                    setFoodItems((prev) => [...prev, ...newFoodItems]);
                } else {
                    setFoodItems(newFoodItems);
                }
            } else {
                setCustomAlert({
                    visible: true,
                    title: 'Uyarı',
                    message: 'Resimden yiyecek tespit edilemedi.'
                });
            }
        } catch (error) {
            console.error('Analiz hatası:', error);
        } finally {
            setAnalyzing(false);
        }
    };

    const openBarcodeScanner = () => {
        barcodeScannedRef.current = false;
        if (!cameraPermission?.granted) {
            requestCameraPermission().then((result) => {
                if (result?.granted) setShowBarcodeScanner(true);
                else setCustomAlert({
                    visible: true,
                    title: 'Kamera İzni',
                    message: 'Barkod okutmak için kameraya izin vermeniz gerekir.'
                });
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

    // Custom Alert State
    const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '' });

    const handleSaveReadyMeal = async () => {
        if (!mealName.trim()) {
            setCustomAlert({
                visible: true,
                title: 'Eksik Bilgi',
                message: 'Lütfen hazır öğüne bir isim verin (Örn: Kahvaltım).'
            });
            return;
        }

        const validItems = foodItems.filter(item => (item.name || '').trim() && (item.calories || '').trim());
        const firstInvalidId = getFirstInvalidItemId();

        if (validItems.length === 0 || firstInvalidId) {
            if (firstInvalidId) {
                runShakeAndHighlight(firstInvalidId);
            } else {
                setCustomAlert({
                    visible: true,
                    title: 'Uyarı',
                    message: 'Lütfen en az bir yiyecek ekleyin.'
                });
            }
            return;
        }

        setLoading(true);

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            const totalCalories = calculateTotalCalories();

            const mealData = {
                name: mealName.trim(),
                category: mealCategory,
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

            const result = await addReadyMeal(currentUser.uid, mealData);

            if (result.success) {
                // Başarılı durumda alert verme, direkt geri dön
                navigation.goBack();
            } else {
                setCustomAlert({
                    visible: true,
                    title: 'Hata',
                    message: 'Hazır öğün kaydedilemedi.'
                });
            }
        } catch (error) {
            console.error(error);
            setCustomAlert({
                visible: true,
                title: 'Hata',
                message: 'Bir sorun oluştu.'
            });
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
                    <Text style={styles.title}>Hazır Öğün Oluştur</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Öğün Adı */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Öğün Adı *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Örn: Pazartesi Kahvaltım"
                        placeholderTextColor="#666"
                        value={mealName}
                        onChangeText={setMealName}
                    />
                </View>

                {/* Kategori Seçimi */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Kategori</Text>
                    <View style={styles.mealTypeContainer}>
                        {MEAL_TYPES.map((type) => (
                            <TouchableOpacity
                                key={type.id}
                                style={[
                                    styles.mealTypeButton,
                                    mealCategory === type.id && styles.mealTypeButtonActive
                                ]}
                                onPress={() => setMealCategory(type.id)}
                            >
                                <Text style={styles.mealTypeIcon}>{type.icon}</Text>
                                <Text style={[
                                    styles.mealTypeLabel,
                                    mealCategory === type.id && styles.mealTypeLabelActive
                                ]}>
                                    {type.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
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
                            <Text style={styles.analyzingText}>Sofra hazırlanıyor...</Text>
                            <Text style={styles.analyzingSubtext}>AI yemekleri tanıyor</Text>
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
                </View>

                {/* Barkod */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Barkod ile Ekle 📦</Text>
                    <TouchableOpacity
                        style={styles.barcodeButton}
                        onPress={openBarcodeScanner}
                        disabled={barcodeLoading}
                    >
                        {barcodeLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.barcodeButtonText}>📷 Barkod Okut</Text>}
                    </TouchableOpacity>
                </View>

                {/* Yiyecek Listesi */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>İçerik</Text>
                        {totalCalories > 0 && (
                            <View style={styles.totalCaloriesBadge}>
                                <Text style={styles.totalCaloriesLabel}>TOPLAM</Text>
                                <Text style={styles.totalCaloriesText}>{totalCalories} kcal</Text>
                            </View>
                        )}
                    </View>

                    {foodItems.map((item, index) => {
                        const isHighlighted = item.id === highlightInvalidId;
                        return (
                            <Animated.View
                                key={item.id}
                                style={[
                                    styles.foodItemCard,
                                    isHighlighted && styles.foodItemCardInvalid,
                                    isHighlighted ? { transform: [{ translateX: shakeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 5] }) }] } : {}
                                ]}
                            >
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
                                        placeholder="Örn: Yumurta"
                                        placeholderTextColor="#666"
                                        value={item.name}
                                        onChangeText={(value) => updateFoodItem(item.id, 'name', value)}
                                    />
                                </View>

                                <View style={styles.inputRow}>
                                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                        <Text style={styles.label}>Porsiyon (g) *</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="100"
                                            placeholderTextColor="#666"
                                            value={item.portion}
                                            onChangeText={(value) => updateFoodItem(item.id, 'portion', allowOnlyNumbers(value).slice(0, 6))}
                                            keyboardType="number-pad"
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
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.queryButton}
                                    onPress={() => queryFoodNutrients(item.id)}
                                    disabled={item.querying}
                                >
                                    {item.querying ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.queryButtonText}>🔍 Besin Değerlerini Sorgula</Text>
                                    )}
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}

                    <TouchableOpacity
                        style={styles.addFoodButton}
                        onPress={addFoodItem}
                    >
                        <Text style={styles.addFoodIcon}>+</Text>
                        <Text style={styles.addFoodText}>Yiyecek Ekle</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveReadyMeal}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>💾 Hazır Öğünü Kaydet</Text>
                    )}
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Image Options Modal */}
            <Modal
                visible={showImageOptions}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowImageOptions(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Fotoğraf Ekle</Text>
                        <TouchableOpacity style={styles.modalButton} onPress={pickImageFromCamera}>
                            <Text style={styles.modalButtonText}>📷 Kamera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalButton} onPress={pickImageFromGallery}>
                            <Text style={styles.modalButtonText}>🖼️ Galeri</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowImageOptions(false)}>
                            <Text style={styles.cancelButtonText}>İptal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Barcode Scanner Modal - Simplified for brevity, similar structure to AddMealScreen */}
            {showBarcodeScanner && (
                <Modal visible={true} onRequestClose={() => setShowBarcodeScanner(false)}>
                    <CameraView
                        style={styles.camera}
                        onBarcodeScanned={barcodeLoading ? undefined : onBarcodeScanned}
                    />
                    <TouchableOpacity style={styles.closeCameraButton} onPress={() => setShowBarcodeScanner(false)}>
                        <Text style={styles.closeCameraText}>Kapat</Text>
                    </TouchableOpacity>
                </Modal>
            )}

            {/* Barcode Error Modal */}
            <Modal
                transparent={true}
                visible={showBarcodeError}
                animationType="fade"
                onRequestClose={closeBarcodeErrorModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.errorModalContainer}>
                        <View style={styles.errorIconContainer}>
                            <Ionicons name="alert-circle" size={40} color="#FF5252" />
                        </View>
                        <Text style={styles.errorModalTitle}>Bulunamadı</Text>
                        <Text style={styles.errorModalMessage}>{barcodeErrorMessage}</Text>
                        <TouchableOpacity
                            style={styles.errorModalButton}
                            onPress={closeBarcodeErrorModal}
                        >
                            <Text style={styles.errorModalButtonText}>Tamam</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Barcode Confirm Modal */}
            <Modal
                transparent={true}
                visible={showBarcodeConfirm}
                animationType="slide"
                onRequestClose={cancelBarcodeConfirm}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.confirmModalContainer}>
                        <Text style={styles.confirmModalTitle}>Ürün Bulundu ✅</Text>

                        {barcodeConfirmData?.imageUrl && (
                            <Image
                                source={{ uri: barcodeConfirmData.imageUrl }}
                                style={styles.confirmModalImage}
                                resizeMode="contain"
                            />
                        )}

                        <Text style={styles.confirmProductName}>{barcodeConfirmData?.name}</Text>

                        <View style={styles.confirmNutrientsRow}>
                            <View style={styles.confirmNutrientItem}>
                                <Text style={styles.confirmNutrientVal}>{barcodeConfirmData?.calories}</Text>
                                <Text style={styles.confirmNutrientLabel}>kcal</Text>
                            </View>
                            <View style={styles.confirmNutrientItem}>
                                <Text style={styles.confirmNutrientVal}>{barcodeConfirmData?.protein}g</Text>
                                <Text style={styles.confirmNutrientLabel}>Prot</Text>
                            </View>
                            <View style={styles.confirmNutrientItem}>
                                <Text style={styles.confirmNutrientVal}>{barcodeConfirmData?.carbs}g</Text>
                                <Text style={styles.confirmNutrientLabel}>Karb</Text>
                            </View>
                            <View style={styles.confirmNutrientItem}>
                                <Text style={styles.confirmNutrientVal}>{barcodeConfirmData?.fat}g</Text>
                                <Text style={styles.confirmNutrientLabel}>Yağ</Text>
                            </View>
                        </View>

                        <View style={styles.confirmModalButtons}>
                            <TouchableOpacity
                                style={[styles.confirmButton, styles.confirmCancelButton]}
                                onPress={cancelBarcodeConfirm}
                            >
                                <Text style={styles.confirmCancelText}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmButton, styles.confirmAddButton]}
                                onPress={confirmBarcodeAdd}
                            >
                                <Text style={styles.confirmAddText}>Ekle</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Custom Alert Modal */}
            <Modal
                transparent={true}
                visible={customAlert.visible}
                animationType="fade"
                onRequestClose={() => setCustomAlert({ ...customAlert, visible: false })}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.errorModalContainer}>
                        <View style={styles.errorIconContainer}>
                            <Ionicons name="alert-circle" size={40} color="#FF5252" />
                        </View>
                        <Text style={styles.errorModalTitle}>{customAlert.title}</Text>
                        <Text style={styles.errorModalMessage}>{customAlert.message}</Text>
                        <TouchableOpacity
                            style={styles.errorModalButton}
                            onPress={() => setCustomAlert({ ...customAlert, visible: false })}
                        >
                            <Text style={styles.errorModalButtonText}>Tamam</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        paddingTop: 50,
    },
    scrollContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
        backgroundColor: '#252542',
        borderRadius: 12,
    },
    title: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    placeholder: {
        width: 40,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    input: {
        backgroundColor: '#252542',
        borderRadius: 12,
        padding: 12,
        color: '#fff',
        borderWidth: 1,
        borderColor: '#2a3447',
        fontSize: 16,
    },
    mealTypeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    mealTypeButton: {
        alignItems: 'center',
        padding: 10,
        borderRadius: 12,
        backgroundColor: '#252542',
        flex: 1,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    mealTypeButtonActive: {
        borderColor: '#4FC3F7',
        backgroundColor: 'rgba(79, 195, 247, 0.15)',
    },
    mealTypeIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    mealTypeLabel: {
        color: '#8b9bb4',
        fontSize: 12,
    },
    mealTypeLabelActive: {
        color: '#4FC3F7',
        fontWeight: 'bold',
    },
    foodItemCard: {
        backgroundColor: '#252542',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2a3447',
    },
    foodItemCardInvalid: {
        borderColor: '#FF5252',
        borderWidth: 2,
    },
    foodItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    foodItemNumber: {
        color: '#4FC3F7',
        fontWeight: 'bold',
    },
    removeButtonText: {
        color: '#FF5252',
        fontSize: 16,
        fontWeight: 'bold',
    },
    inputGroup: {
        marginBottom: 12,
    },
    inputRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    label: {
        color: '#8b9bb4',
        fontSize: 12,
        marginBottom: 6,
    },
    addFoodButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2a3447',
        padding: 16,
        borderRadius: 12,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#4FC3F7',
    },
    addFoodIcon: {
        color: '#4FC3F7',
        fontSize: 20,
        marginRight: 8,
    },
    addFoodText: {
        color: '#4FC3F7',
        fontWeight: 'bold',
    },
    saveButton: {
        backgroundColor: '#4CAF50',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    queryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#353550',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
    },
    queryButtonText: {
        color: '#ccc',
        fontSize: 14,
        marginLeft: 6,
    },
    aiButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2a3447',
        padding: 20,
        borderRadius: 16,
        marginBottom: 10,
    },
    aiButtonIcon: {
        fontSize: 24,
        marginRight: 10,
    },
    aiButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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
    photosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 15,
    },
    photoGridItem: {
        position: 'relative',
        width: 80,
        height: 80,
    },
    photoGridImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    removeImageButton: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: 'red',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeImageText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#252542',
        borderRadius: 20,
        padding: 20,
    },
    modalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalButton: {
        backgroundColor: '#2a3447',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    cancelButton: {
        backgroundColor: '#FF5252',
        marginTop: 10,
    },
    cancelButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    barcodeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3F51B5',
        padding: 15,
        borderRadius: 12,
    },
    barcodeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    camera: {
        flex: 1,
    },
    closeCameraButton: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        backgroundColor: '#FF5252',
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 20,
    },
    closeCameraText: {
        color: '#fff',
        fontWeight: 'bold',
    },

    // Barcode Error Modal Styles
    errorModalContainer: {
        backgroundColor: '#252542',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        width: '85%',
        alignSelf: 'center',
    },
    errorIconContainer: {
        marginBottom: 15,
    },
    errorModalTitle: {
        color: '#FF5252',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    errorModalMessage: {
        color: '#ddd',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    errorModalButton: {
        backgroundColor: '#FF5252',
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 10,
    },
    errorModalButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },

    // Barcode Confirm Modal Styles
    confirmModalContainer: {
        backgroundColor: '#252542',
        borderRadius: 20,
        padding: 20,
        width: '90%',
        alignSelf: 'center',
    },
    confirmModalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
    },
    confirmModalImage: {
        width: '100%',
        height: 150,
        marginBottom: 15,
        borderRadius: 10,
        backgroundColor: '#1a1a2e',
    },
    confirmProductName: {
        color: '#4FC3F7',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
    },
    confirmNutrientsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        backgroundColor: '#1a1a2e',
        padding: 10,
        borderRadius: 12,
    },
    confirmNutrientItem: {
        alignItems: 'center',
        flex: 1,
    },
    confirmNutrientVal: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    confirmNutrientLabel: {
        color: '#8b9bb4',
        fontSize: 12,
    },
    confirmModalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    confirmCancelButton: {
        backgroundColor: '#353550',
        borderWidth: 1,
        borderColor: '#4d4d6e',
    },
    confirmAddButton: {
        backgroundColor: '#4CAF50',
    },
    confirmCancelText: {
        color: '#ddd',
        fontWeight: '600',
    },
    confirmAddText: {
        color: 'white',
        fontWeight: 'bold',
    },
    totalCaloriesBadge: {
        backgroundColor: '#2a3447',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    totalCaloriesLabel: {
        color: '#8b9bb4',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    totalCaloriesText: {
        color: '#4CAF50',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
