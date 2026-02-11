import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

export default function DietDetailScreen({ route, navigation }) {
  const { diet } = route.params || {};

  if (!diet) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Diyet bilgisi bulunamadı.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#4FC3F7" />
          <Text style={styles.backBtnText}>Geri</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{diet.name}</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroIconWrap}>
              <Text style={styles.heroIcon}>{diet.icon}</Text>
            </View>
            <Text style={styles.calorieRange}>{diet.calorieRange}</Text>
            <View style={styles.tagRow}>
              {diet.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          <Section title="Hakkında">
            <Text style={styles.paragraph}>{diet.description}</Text>
          </Section>

          {diet.benefits && diet.benefits.length > 0 && (
            <Section title="Faydalar">
              {diet.benefits.map((item, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </Section>
          )}

          {diet.tips && diet.tips.length > 0 && (
            <Section title="İpuçları">
              {diet.tips.map((item, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </Section>
          )}

          {diet.foodsToEat && diet.foodsToEat.length > 0 && (
            <Section title="Tüketilebilecekler">
              <View style={styles.chipWrap}>
                {diet.foodsToEat.map((food) => (
                  <View key={food} style={styles.chipGreen}>
                    <Text style={styles.chipText}>{food}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {diet.foodsToAvoid && diet.foodsToAvoid.length > 0 && (
            <Section title="Kaçınılması Gerekenler">
              <View style={styles.chipWrap}>
                {diet.foodsToAvoid.map((food) => (
                  <View key={food} style={styles.chipRed}>
                    <Text style={styles.chipText}>{food}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  center: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  error: {
    color: '#9ca3af',
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#252542',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  backBtnText: {
    color: '#4FC3F7',
    fontWeight: '600',
    marginLeft: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a3447',
  },
  headerBack: {
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerPlaceholder: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#252542',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroIcon: {
    fontSize: 36,
  },
  calorieRange: {
    fontSize: 15,
    color: '#4FC3F7',
    marginBottom: 10,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  tag: {
    backgroundColor: '#2a3447',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 15,
    color: '#d1d5db',
    lineHeight: 24,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  bullet: {
    color: '#4FC3F7',
    marginRight: 8,
    fontSize: 16,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: '#d1d5db',
    lineHeight: 22,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipGreen: {
    backgroundColor: 'rgba(79, 195, 247, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chipRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 13,
    color: '#e5e7eb',
  },
  bottomSpacer: {
    height: 32,
  },
});
