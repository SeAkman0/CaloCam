import React, { useState, useEffect } from 'react';
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
import { getDiets, seedDietsToFirebase, getLocalDiets } from '../services/dietService';

const CATEGORIES = ['Hepsi', 'Popüler', 'Kilo Verme', 'Bitkisel', 'Sağlık'];

export default function DietListsScreen({ navigation }) {
  const [diets, setDiets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Hepsi');

  const loadDiets = async () => {
    setLoading(true);
    let result = await getDiets();
    // Firebase boşsa otomatik seed yap, sonra tekrar çek
    if ((result.diets || []).length === 0) {
      await seedDietsToFirebase();
      result = await getDiets();
    }
    // Hâlâ boşsa (örn. izin yok) yerel listeyi kullan
    const list = (result.diets || []).length > 0 ? result.diets : getLocalDiets().diets;
    setDiets(list);
    setLoading(false);
  };

  useEffect(() => {
    loadDiets();
    const unsubscribe = navigation.addListener('focus', loadDiets);
    return unsubscribe;
  }, []);

  const tags = (diet) => Array.isArray(diet.tags) ? diet.tags : [];

  const filteredDiets = selectedCategory === 'Hepsi'
    ? diets
    : diets.filter(d => d.category === selectedCategory);

  return (
    <>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Diyet Listeleri</Text>
          <Text style={styles.subtitle}>Tıklayarak diyet detaylarını görüntüleyin</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#4FC3F7" />
            <Text style={styles.loadingText}>Diyetler yükleniyor...</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Kategoriler */}
            <View style={styles.categoryWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
              >
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat && styles.categoryChipActive
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      selectedCategory === cat && styles.categoryChipTextActive
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {filteredDiets.map((diet) => (
                <TouchableOpacity
                  key={diet.id}
                  style={styles.card}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('DietDetail', { diet })}
                >
                  <View style={styles.cardIconWrap}>
                    <Text style={styles.cardIcon}>{diet.icon || '🥗'}</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>{diet.name}</Text>
                      <View style={styles.ratingBox}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={styles.ratingText}>{diet.rating || 0}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardDesc} numberOfLines={1}>{diet.shortDesc || ''}</Text>
                    <View style={styles.cardMeta}>
                      <Text style={styles.cardCal}>{diet.calorieRange || ''}</Text>
                      <Text style={styles.dot}>•</Text>
                      <Text style={styles.cardReviews}>{diet.reviews || 0} yorum</Text>
                    </View>
                    <View style={styles.tagRow}>
                      {tags(diet).map((tag) => (
                        <View key={tag} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              {filteredDiets.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Bu kategoride diyet bulunamadı.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#b4b4b4',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9ca3af',
  },
  categoryWrap: {
    marginBottom: 16,
  },
  categoryScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#252542',
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  categoryChipActive: {
    backgroundColor: '#4FC3F7',
    borderColor: '#4FC3F7',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  cardIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#2a3447',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardBody: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#b4b4b4',
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardCal: {
    fontSize: 12,
    color: '#4FC3F7',
    fontWeight: '600',
  },
  dot: {
    color: '#4b5563',
    marginHorizontal: 6,
    fontSize: 12,
  },
  cardReviews: {
    fontSize: 12,
    color: '#9ca3af',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  tagText: {
    fontSize: 10,
    color: '#9ca3af',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
});
