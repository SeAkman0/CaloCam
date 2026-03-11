import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../config/firebase';
import { updateUserProfile, getUserData } from '../services/authService';
import { useAlert } from '../context/AlertContext';
import { addDietReview, getDietReviews } from '../services/dietService';

export default function DietDetailScreen({ route, navigation }) {
  const { diet } = route.params || {};
  const { showAlert } = useAlert();
  const [applying, setApplying] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  // Puanlama ve Yorum States
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    checkIfActive();
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoadingReviews(true);
    const result = await getDietReviews(diet.id);
    if (result.success) {
      setReviews(result.reviews);
    }
    setLoadingReviews(false);
  };

  const handleSubmitReview = async () => {
    const user = auth.currentUser;
    if (!user) {
      showAlert('Hata', 'Yorum yapmak için giriş yapmalısınız.');
      return;
    }

    if (!userComment.trim()) {
      showAlert('Uyarı', 'Lütfen bir yorum yazın.');
      return;
    }

    setSubmittingReview(true);
    try {
      const result = await addDietReview(
        diet.id,
        user.uid,
        user.displayName || 'Anonim',
        userRating,
        userComment
      );

      if (result.success) {
        setModalVisible(false);
        setUserComment('');
        setUserRating(5);
        showAlert('Başarılı', 'Yorumun için teşekkürler!');
        loadReviews(); // Refresh
      } else {
        showAlert('Hata', 'Yorum gönderilemedi.');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmittingReview(false);
    }
  };

  const checkIfActive = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const result = await getUserData(user.uid);
      if (result.success && result.data.activeDietId === diet.id) {
        setIsActive(true);
      }
    } catch (e) {
      console.log('User check error:', e);
    } finally {
      setLoadingUser(false);
    }
  };

  const handleRemoveDiet = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setApplying(true);
    try {
      const result = await updateUserProfile(user.uid, {
        activeDietId: null,
        activeDietName: null,
      });

      if (result.success) {
        setIsActive(false);
        showAlert('Bilgi', 'Diyet takibi durduruldu. Hedeflerin eski haline dönecek.', [
          { text: 'Tamam', onPress: () => navigation.navigate('MainTabs', { screen: 'Dashboard' }) }
        ]);
      }
    } catch (error) {
      showAlert('Hata', 'İşlem başarısız oldu.');
    } finally {
      setApplying(false);
    }
  };

  const handleApplyDiet = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setApplying(true);
    try {
      const result = await updateUserProfile(user.uid, {
        activeDietId: diet.id,
        activeDietName: diet.name,
      });

      if (result.success) {
        showAlert('Başarılı', `"${diet.name}" artık aktif diyetin olarak belirlendi. Günlük kalori hedefin buna göre güncellenecek.`, [
          { text: 'Harika!', onPress: () => navigation.navigate('MainTabs', { screen: 'Dashboard' }) }
        ]);
      } else {
        showAlert('Hata', 'Diyet uygulanırken bir sorun oluştu.');
      }
    } catch (error) {
      console.error('Diyet uygulama hatası:', error);
      showAlert('Hata', 'Beklenmedik bir hata oluştu.');
    } finally {
      setApplying(false);
    }
  };

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

            <View style={styles.ratingRow}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons
                    key={s}
                    name={s <= Math.floor(diet.rating) ? "star" : s - 0.5 <= diet.rating ? "star-half" : "star-outline"}
                    size={16}
                    color="#FFD700"
                  />
                ))}
              </View>
              <Text style={styles.ratingValue}>{diet.rating}</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.reviewCount}>{diet.reviews} yorum</Text>
            </View>

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

          <Section title="Kullanıcı Deneyimleri">
            <View style={styles.ratingSummary}>
              <View style={styles.ratingLarge}>
                <Text style={styles.ratingNum}>{diet.rating}</Text>
                <Text style={styles.ratingTotal}>/ 5</Text>
              </View>
              <TouchableOpacity
                style={styles.rateButton}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.rateButtonIcon}>🌟</Text>
                <Text style={styles.rateButtonText}>Puan Ver & Yorum Yap</Text>
              </TouchableOpacity>
            </View>

            {loadingReviews ? (
              <ActivityIndicator color="#4FC3F7" />
            ) : reviews.length === 0 ? (
              <Text style={styles.noReviews}>Henüz yorum yapılmamış. İlk yorumu sen yap!</Text>
            ) : (
              reviews.map((rev) => (
                <View key={rev.id} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUser}>{rev.userName}</Text>
                    <View style={styles.commentStars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons
                          key={s}
                          name={s <= rev.rating ? "star" : "star-outline"}
                          size={12}
                          color="#FFD700"
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.commentText}>{rev.comment}</Text>
                </View>
              ))
            )}
          </Section>

          {isActive ? (
            <TouchableOpacity
              style={[styles.removeButton, applying && styles.buttonDisabled]}
              onPress={handleRemoveDiet}
              disabled={applying}
              activeOpacity={0.8}
            >
              {applying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.applyButtonIcon}>👋</Text>
                  <Text style={styles.applyButtonText}>Bu Diyeti Bırak</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.applyButton, applying && styles.buttonDisabled]}
              onPress={handleApplyDiet}
              disabled={applying || loadingUser}
              activeOpacity={0.8}
            >
              {applying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.applyButtonIcon}>✨</Text>
                  <Text style={styles.applyButtonText}>Bu Diyeti Uygula</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Puan Verme Modalı */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Diyeti Puanla</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <View style={styles.ratingPicker}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} onPress={() => setUserRating(s)}>
                    <Ionicons
                      name={s <= userRating ? "star" : "star-outline"}
                      size={36}
                      color="#FFD700"
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.commentInput}
                placeholder="Deneyiminizi paylaşın..."
                placeholderTextColor="#6b7280"
                multiline
                numberOfLines={4}
                value={userComment}
                onChangeText={setUserComment}
              />

              <TouchableOpacity
                style={[styles.submitButton, submittingReview && styles.buttonDisabled]}
                onPress={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Yorumu Gönder</Text>
                )}
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </View>
        </Modal>
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
    height: 40,
  },
  applyButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 10,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  applyButtonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  removeButton: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 10,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  dot: {
    color: '#4b5563',
    marginHorizontal: 8,
    fontSize: 16,
  },
  reviewCount: {
    color: '#9ca3af',
    fontSize: 14,
  },
  ratingSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#252542',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  ratingLarge: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  ratingNum: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  ratingTotal: {
    fontSize: 16,
    color: '#9ca3af',
    marginLeft: 4,
  },
  rateButton: {
    backgroundColor: 'rgba(79, 195, 247, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.4)',
    shadowColor: '#4FC3F7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  rateButtonIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  rateButtonText: {
    color: '#4FC3F7',
    fontWeight: '700',
    fontSize: 14,
  },
  commentCard: {
    backgroundColor: '#252542',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUser: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  commentStars: {
    flexDirection: 'row',
    gap: 2,
  },
  commentText: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  noReviews: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  ratingPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  commentInput: {
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    textAlignVertical: 'top',
    height: 120,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  submitButton: {
    backgroundColor: '#4FC3F7',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#4FC3F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
