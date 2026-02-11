// Egzersiz tipleri: birim başına yaklaşık yakılan kalori (kcal)
export const EXERCISE_TYPES = [
  { id: 'steps', name: 'Yürüme', icon: '🚶', unit: 'steps', unitLabel: 'Adım', kcalPerUnit: 0.04 },
  { id: 'pushup', name: 'Şınav', icon: '💪', unit: 'reps', unitLabel: 'Tekrar', kcalPerUnit: 0.35 },
  { id: 'situp', name: 'Mekik', icon: '🏃', unit: 'reps', unitLabel: 'Tekrar', kcalPerUnit: 0.5 },
  { id: 'squat', name: 'Squat', icon: '🦵', unit: 'reps', unitLabel: 'Tekrar', kcalPerUnit: 0.4 },
  { id: 'running', name: 'Koşu', icon: '🏃‍♂️', unit: 'minutes', unitLabel: 'Dakika', kcalPerUnit: 10 },
  { id: 'cycling', name: 'Bisiklet', icon: '🚴', unit: 'minutes', unitLabel: 'Dakika', kcalPerUnit: 7 },
  { id: 'jumping', name: 'İp Atlama', icon: '⏭️', unit: 'reps', unitLabel: 'Tekrar', kcalPerUnit: 0.15 },
];

export const getExerciseTypeById = (id) => EXERCISE_TYPES.find((t) => t.id === id);

export const calculateBurnedCalories = (exerciseTypeId, value) => {
  const type = getExerciseTypeById(exerciseTypeId);
  if (!type || value == null || value < 0) return 0;
  return Math.round(type.kcalPerUnit * Number(value));
};
