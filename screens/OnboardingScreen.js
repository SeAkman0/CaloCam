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
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { updateUserProfile } from '../services/authService';
import { auth } from '../config/firebase';

export default function OnboardingScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(null);
  
  // Kullanıcı verileri
  const [userData, setUserData] = useState({
    height: '',
    weight: '',
    birthDate: '',
    mealsPerDay: '',
    mealTimes: [], // Dinamik öğün saatleri
    goal: 'maintain', // maintain, lose, gain
  });

  const updateData = (key, value) => {
    setUserData({ ...userData, [key]: value });
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios'); // iOS'da açık kalsın
    if (date) {
      setSelectedDate(date);
      const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      updateData('birthDate', formattedDate);
    }
  };

  const handleMealsPerDayChange = (count) => {
    // Öğün sayısına göre varsayılan saatler oluştur
    const defaultTimes = [];
    const startHour = 8; // Sabah 8'den başla
    const interval = Math.floor(12 / count); // Gün içinde eşit aralıkla dağıt
    
    for (let i = 0; i < count; i++) {
      const hour = startHour + (interval * i);
      defaultTimes.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    
    // Her ikisini aynı anda güncelle
    setUserData({
      ...userData,
      mealsPerDay: count.toString(),
      mealTimes: defaultTimes
    });
  };

  const updateMealTime = (index, time) => {
    const newTimes = [...userData.mealTimes];
    newTimes[index] = time;
    updateData('mealTimes', newTimes);
  };

  const handleTimeChange = (event, time) => {
    setShowTimePicker(Platform.OS === 'ios'); // iOS'da açık kalsın
    if (time && selectedTimeIndex !== null) {
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      updateMealTime(selectedTimeIndex, `${hours}:${minutes}`);
    }
  };

  const openTimePicker = (index) => {
    setSelectedTimeIndex(index);
    setShowTimePicker(true);
  };

  const nextStep = () => {
    // Validasyon
    if (step === 1 && (!userData.height || !userData.weight || !userData.birthDate)) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }
    if (step === 2 && (!userData.mealsPerDay || userData.mealTimes.length === 0)) {
      Alert.alert('Hata', 'Lütfen günlük öğün sayısını seçin');
      return;
    }
    if (step === 3 && !userData.goal) {
      Alert.alert('Hata', 'Lütfen hedefinizi seçin');
      return;
    }

    if (step < 4) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.uid) {
        throw new Error('Kullanıcı bilgisi bulunamadı');
      }

      // Firebase'e kullanıcı bilgilerini kaydet
      const result = await updateUserProfile(currentUser.uid, {
        height: parseInt(userData.height),
        weight: parseInt(userData.weight),
        birthDate: userData.birthDate,
        mealsPerDay: parseInt(userData.mealsPerDay),
        mealTimes: userData.mealTimes,
        goal: userData.goal,
        onboardingCompleted: true,
      });

      if (result.success) {
        Alert.alert(
          'Başarılı! 🎉', 
          'Profiliniz oluşturuldu!',
          [
            {
              text: 'Tamam',
              onPress: () => {
                navigation.replace('Dashboard');
              }
            }
          ]
        );
      } else {
        throw new Error(result.error || 'Profil kaydedilemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Fiziksel Bilgileriniz</Text>
            <Text style={styles.stepSubtitle}>
              Kalori hedefini hesaplamak için bilgilerinize ihtiyacımız var
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Doğum Tarihi</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.datePickerText}>
                  {userData.birthDate || 'Tarih Seçin'}
                </Text>
                <Text style={styles.datePickerIcon}>📅</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1940, 0, 1)}
                />
              )}
              <Text style={styles.inputHint}>Yaşınıza göre kalori hesaplanacak</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Boy (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="170"
                placeholderTextColor="#666"
                value={userData.height}
                onChangeText={(value) => updateData('height', value)}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kilo (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="70"
                placeholderTextColor="#666"
                value={userData.weight}
                onChangeText={(value) => updateData('weight', value)}
                keyboardType="numeric"
              />
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Öğün Alışkanlıklarınız</Text>
            <Text style={styles.stepSubtitle}>
              Günde kaç öğün yersiniz ve genellikle ne zaman?
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Günlük Öğün Sayısı</Text>
              <View style={styles.mealButtonContainer}>
                {[2, 3, 4, 5, 6].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.mealButton,
                      userData.mealsPerDay === num.toString() && styles.mealButtonActive
                    ]}
                    onPress={() => handleMealsPerDayChange(num)}
                  >
                    <Text style={[
                      styles.mealButtonText,
                      userData.mealsPerDay === num.toString() && styles.mealButtonTextActive
                    ]}>
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Dinamik Öğün Saatleri */}
            {userData.mealTimes.length > 0 && (
              <View style={styles.mealTimesContainer}>
                <Text style={styles.label}>Öğün Saatleri</Text>
                {userData.mealTimes.map((time, index) => (
                  <View key={index} style={styles.timeInputGroup}>
                    <Text style={styles.timeLabel}>
                      {index + 1}. Öğün:
                    </Text>
                    <TouchableOpacity
                      style={styles.timePickerButton}
                      onPress={() => openTimePicker(index)}
                    >
                      <Text style={styles.timePickerText}>{time}</Text>
                      <Text style={styles.timePickerIcon}>🕐</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {showTimePicker && selectedTimeIndex !== null && (
                  <DateTimePicker
                    value={new Date()}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                  />
                )}
              </View>
            )}
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Hedefiniz Nedir?</Text>
            <Text style={styles.stepSubtitle}>
              Kalori hedefini buna göre ayarlayacağız
            </Text>

            <TouchableOpacity
              style={[
                styles.goalCard,
                userData.goal === 'lose' && styles.goalCardActive
              ]}
              onPress={() => updateData('goal', 'lose')}
            >
              <Text style={styles.goalEmoji}>🔽</Text>
              <Text style={styles.goalTitle}>Kilo Vermek</Text>
              <Text style={styles.goalSubtitle}>Günlük kalori açığı oluşturacağız</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.goalCard,
                userData.goal === 'maintain' && styles.goalCardActive
              ]}
              onPress={() => updateData('goal', 'maintain')}
            >
              <Text style={styles.goalEmoji}>⚖️</Text>
              <Text style={styles.goalTitle}>Kilomu Korumak</Text>
              <Text style={styles.goalSubtitle}>Mevcut kilonuzu koruyacağız</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.goalCard,
                userData.goal === 'gain' && styles.goalCardActive
              ]}
              onPress={() => updateData('goal', 'gain')}
            >
              <Text style={styles.goalEmoji}>🔼</Text>
              <Text style={styles.goalTitle}>Kilo Almak</Text>
              <Text style={styles.goalSubtitle}>Günlük kalori fazlası oluşturacağız</Text>
            </TouchableOpacity>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>🎉 Her Şey Hazır!</Text>
            <Text style={styles.stepSubtitle}>
              Profiliniz oluşturuldu. Artık kalori takibine başlayabilirsiniz!
            </Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Doğum Tarihi:</Text>
                <Text style={styles.summaryValue}>{userData.birthDate}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Boy:</Text>
                <Text style={styles.summaryValue}>{userData.height} cm</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Kilo:</Text>
                <Text style={styles.summaryValue}>{userData.weight} kg</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Günlük Öğün:</Text>
                <Text style={styles.summaryValue}>{userData.mealsPerDay}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Öğün Saatleri:</Text>
                <Text style={styles.summaryValue}>
                  {userData.mealTimes.join(', ')}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Hedef:</Text>
                <Text style={styles.summaryValue}>
                  {userData.goal === 'lose' ? 'Kilo Vermek' : 
                   userData.goal === 'gain' ? 'Kilo Almak' : 'Kilomu Korumak'}
                </Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(step / 4) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>Adım {step} / 4</Text>
        </View>

        {/* Step Content */}
        {renderStep()}

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          {step > 1 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={prevStep}
              disabled={loading}
            >
              <Text style={styles.backButtonText}>Geri</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.nextButton, step === 1 && styles.nextButtonFull]}
            onPress={nextStep}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextButtonText}>
                {step === 4 ? 'Tamamla' : 'İleri'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
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
  progressContainer: {
    marginBottom: 40,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#2a3447',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    color: '#b4b4b4',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#b4b4b4',
    marginBottom: 32,
    lineHeight: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#b4b4b4',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  inputHint: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 6,
  },
  datePickerButton: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  datePickerText: {
    fontSize: 16,
    color: '#fff',
  },
  datePickerIcon: {
    fontSize: 20,
  },
  mealButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  mealButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#2a3447',
    alignItems: 'center',
  },
  mealButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  mealButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#b4b4b4',
  },
  mealButtonTextActive: {
    color: '#fff',
  },
  mealTimesContainer: {
    marginTop: 24,
  },
  timeInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  timeLabel: {
    fontSize: 14,
    color: '#b4b4b4',
    fontWeight: '600',
    flex: 1,
  },
  timeInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    color: '#fff',
    width: 80,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#2a3447',
  },
  timePickerButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    gap: 8,
  },
  timePickerText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  timePickerIcon: {
    fontSize: 18,
  },
  goalCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2a3447',
  },
  goalCardActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#1e3a28',
  },
  goalEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  goalSubtitle: {
    fontSize: 14,
    color: '#b4b4b4',
  },
  summaryCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a3447',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#b4b4b4',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    marginBottom: 20,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#2a3447',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
