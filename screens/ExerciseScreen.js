import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { auth } from '../config/firebase';
import { EXERCISE_TYPES, getExerciseTypeById, calculateBurnedCalories } from '../data/exerciseTypes';
import {
  addExerciseLog,
  getTodayExerciseLogs,
  deleteExerciseLog,
} from '../services/exerciseService';
import { allowOnlyNumbers } from '../utils/validation';

export default function ExerciseScreen({ navigation }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState(EXERCISE_TYPES[0]?.id || 'steps');
  const [value, setValue] = useState('');

  const loadLogs = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    const result = await getTodayExerciseLogs(user.uid);
    setLoading(false);
    if (result.success) setLogs(result.logs || []);
    else setLogs([]);
  };

  useEffect(() => {
    loadLogs();
    const unsubscribe = navigation.addListener('focus', loadLogs);
    return unsubscribe;
  }, []);

  const selectedType = getExerciseTypeById(selectedTypeId);
  const previewBurned = value ? calculateBurnedCalories(selectedTypeId, value) : 0;

  const handleAdd = async () => {
    const valueTrim = (value || '').trim();
    const num = parseInt(valueTrim, 10);
    if (!valueTrim || isNaN(num) || num <= 0) {
      Alert.alert('Girdinizi Kontrol Edin', `${selectedType?.unitLabel || 'Miktar'} alanına geçerli bir sayı girin (1 ve üzeri). Boş bırakamazsınız.`);
      return;
    }
    const user = auth.currentUser;
    if (!user || saving) return;
    setSaving(true);
    const result = await addExerciseLog(user.uid, { exerciseTypeId: selectedTypeId, value: num });
    setSaving(false);
    if (result.success) {
      setValue('');
      await loadLogs();
    }
  };

  const handleDelete = async (logId) => {
    const user = auth.currentUser;
    if (!user) return;
    await deleteExerciseLog(user.uid, logId);
    await loadLogs();
  };

  const totalBurned = logs.reduce((sum, log) => sum + (log.burnedCalories || 0), 0);

  return (
    <>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Egzersiz</Text>
          <Text style={styles.subtitle}>Yakılan kalori takibi</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Egzersiz tipi seçimi */}
          <Text style={styles.sectionLabel}>Egzersiz türü</Text>
          <View style={styles.typeRow}>
            {EXERCISE_TYPES.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.typeChip, selectedTypeId === t.id && styles.typeChipActive]}
                onPress={() => setSelectedTypeId(t.id)}
              >
                <Text style={styles.typeChipIcon}>{t.icon}</Text>
                <Text style={[styles.typeChipText, selectedTypeId === t.id && styles.typeChipTextActive]} numberOfLines={1}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Miktar girişi */}
          <Text style={styles.sectionLabel}>{selectedType?.unitLabel} (yaklaşık yakılan kalori)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={(v) => setValue(allowOnlyNumbers(v).slice(0, 6))}
              placeholder={selectedType?.unit === 'steps' ? 'Örn. 5000' : selectedType?.unit === 'minutes' ? 'Örn. 30' : 'Örn. 20'}
              placeholderTextColor="#6b7280"
              keyboardType="number-pad"
              maxLength={6}
            />
            <Text style={styles.inputSuffix}>{selectedType?.unitLabel}</Text>
            {previewBurned > 0 && (
              <Text style={styles.previewBurned}>≈ {previewBurned} kcal</Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.addButton, saving && styles.addButtonDisabled]}
            onPress={handleAdd}
            disabled={saving || !value || parseInt(value, 10) <= 0}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.addButtonText}>Ekle</Text>
            )}
          </TouchableOpacity>

          {/* Bugünkü özet */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Bugün yakılan</Text>
            <Text style={styles.summaryValue}>-{totalBurned} kcal</Text>
          </View>

          {/* Bugünün kayıtları */}
          <Text style={styles.sectionLabel}>Bugünkü kayıtlar</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#4FC3F7" style={{ marginVertical: 16 }} />
          ) : logs.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Henüz egzersiz eklenmedi</Text>
              <Text style={styles.emptySub}>Yukarıdan ekleyerek başla</Text>
            </View>
          ) : (
            logs.map((log) => {
              const type = getExerciseTypeById(log.exerciseTypeId);
              return (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.logLeft}>
                    <Text style={styles.logIcon}>{type?.icon || '🏋️'}</Text>
                    <View>
                      <Text style={styles.logName}>{type?.name || log.exerciseTypeId}</Text>
                      <Text style={styles.logDetail}>
                        {log.value} {type?.unitLabel} · -{log.burnedCalories || 0} kcal
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(log.id)} style={styles.logDelete}>
                    <Text style={styles.logDeleteText}>Sil</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 16,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 10,
    marginTop: 8,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252542',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  typeChipActive: {
    backgroundColor: '#4FC3F7',
  },
  typeChipIcon: {
    fontSize: 18,
  },
  typeChipText: {
    fontSize: 14,
    color: '#d1d5db',
  },
  typeChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252542',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 48,
    color: '#fff',
    fontSize: 16,
  },
  inputSuffix: {
    fontSize: 14,
    color: '#9ca3af',
  },
  previewBurned: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#4FC3F7',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  summaryCard: {
    backgroundColor: '#252542',
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ef4444',
  },
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 14,
    color: '#6b7280',
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#252542',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logIcon: {
    fontSize: 24,
  },
  logName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  logDetail: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  logDelete: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logDeleteText: {
    fontSize: 14,
    color: '#ef4444',
  },
  bottomSpacer: {
    height: 24,
  },
});
