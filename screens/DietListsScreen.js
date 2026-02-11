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
import { getDiets, seedDietsToFirebase, getLocalDiets } from '../services/dietService';

export default function DietListsScreen({ navigation }) {
  const [diets, setDiets] = useState([]);
  const [loading, setLoading] = useState(true);

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
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {diets.map((diet) => (
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
                  <Text style={styles.cardTitle}>{diet.name}</Text>
                  <Text style={styles.cardDesc}>{diet.shortDesc || ''}</Text>
                  <Text style={styles.cardCal}>{diet.calorieRange || ''}</Text>
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
          </ScrollView>
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
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  cardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#2a3447',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardIcon: {
    fontSize: 26,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#b4b4b4',
    marginBottom: 4,
  },
  cardCal: {
    fontSize: 12,
    color: '#4FC3F7',
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#2a3447',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#9ca3af',
  },
});
