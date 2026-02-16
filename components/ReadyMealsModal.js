import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    FlatList,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getReadyMeals, deleteReadyMeal } from '../services/readyMealService';
import { auth } from '../config/firebase';

const MEAL_TYPES = [
    { id: 'all', label: 'Tümü', icon: '∞' },
    { id: 'breakfast', label: 'Kahvaltı', icon: '🌅' },
    { id: 'lunch', label: 'Öğle', icon: '☀️' },
    { id: 'dinner', label: 'Akşam', icon: '🌙' },
    { id: 'snack', label: 'Atıştırmalık', icon: '🍎' },
];

export default function ReadyMealsModal({ visible, onClose, onSelectMeal }) {
    const [loading, setLoading] = useState(false);
    const [meals, setMeals] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');

    useEffect(() => {
        if (visible) {
            loadReadyMeals();
        }
    }, [visible]);

    const loadReadyMeals = async () => {
        setLoading(true);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            const result = await getReadyMeals(currentUser.uid);
            if (result.success) {
                setMeals(result.meals);
            } else {
                console.error(result.error);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (mealId, mealName) => {
        Alert.alert(
            'Öğünü Sil',
            `"${mealName}" adlı hazır öğünü silmek istediğinize emin misiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await deleteReadyMeal(mealId);
                        if (result.success) {
                            setMeals(prev => prev.filter(m => m.id !== mealId));
                        } else {
                            Alert.alert('Hata', 'Silinirken bir hata oluştu');
                        }
                    }
                }
            ]
        );
    };

    const filteredMeals = selectedCategory === 'all'
        ? meals
        : meals.filter(m => m.category === selectedCategory);

    const renderItem = ({ item }) => (
        <View style={styles.mealCard}>
            <TouchableOpacity
                style={styles.mealContent}
                onPress={() => onSelectMeal(item)}
            >
                <View style={styles.mealHeader}>
                    <Text style={styles.mealName}>{item.name}</Text>
                    <View style={styles.calorieBadge}>
                        <Text style={styles.calorieText}>{item.totalCalories} kcal</Text>
                    </View>
                </View>

                <Text style={styles.mealItems}>
                    {item.items.map(i => i.name).join(', ')}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id, item.name)}
            >
                <Ionicons name="trash-outline" size={20} color="#FF5252" />
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Hazır Öğünlerim</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Kategori Filtresi */}
                    <View style={styles.categoriesContainer}>
                        <FlatList
                            data={MEAL_TYPES}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.categoriesContent}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.categoryChip,
                                        selectedCategory === item.id && styles.categoryChipActive
                                    ]}
                                    onPress={() => setSelectedCategory(item.id)}
                                >
                                    <Text style={styles.categoryIcon}>{item.icon}</Text>
                                    <Text style={[
                                        styles.categoryLabel,
                                        selectedCategory === item.id && styles.categoryLabelActive
                                    ]}>{item.label}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#4FC3F7" style={{ marginTop: 20 }} />
                    ) : filteredMeals.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                {selectedCategory === 'all'
                                    ? 'Henüz hazır öğününüz yok.'
                                    : 'Bu kategoride hazır öğün yok.'}
                            </Text>
                            <Text style={styles.emptySubtext}>
                                "Yeni Hazır Öğün Oluştur" diyerek sık yediğiniz menüleri kaydedebilirsiniz.
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredMeals}
                            keyExtractor={item => item.id}
                            renderItem={renderItem}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        />
                    )}

                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#1a1a2e',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        padding: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    categoriesContainer: {
        marginBottom: 16,
        height: 50,
    },
    categoriesContent: {
        gap: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#252542',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2a3447',
        marginRight: 8,
    },
    categoryChipActive: {
        backgroundColor: 'rgba(79, 195, 247, 0.15)',
        borderColor: '#4FC3F7',
    },
    categoryIcon: {
        marginRight: 6,
        fontSize: 14,
    },
    categoryLabel: {
        color: '#8b9bb4',
        fontSize: 14,
    },
    categoryLabelActive: {
        color: '#4FC3F7',
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 40,
    },
    mealCard: {
        flexDirection: 'row',
        backgroundColor: '#252542',
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2a3447',
    },
    mealContent: {
        flex: 1,
        padding: 16,
    },
    mealHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    mealName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    calorieBadge: {
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    calorieText: {
        color: '#4CAF50',
        fontSize: 12,
        fontWeight: 'bold',
    },
    mealItems: {
        color: '#8b9bb4',
        fontSize: 13,
    },
    deleteButton: {
        width: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderLeftWidth: 1,
        borderLeftColor: '#2a3447',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubtext: {
        color: '#8b9bb4',
        fontSize: 14,
        textAlign: 'center',
    }
});
