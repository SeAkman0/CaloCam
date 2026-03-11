// Egzersiz tipleri: birim başına yaklaşık yakılan kalori (kcal)
export const EXERCISE_TYPES = [
  {
    id: 'steps',
    name: 'Yürüme',
    icon: '🚶',
    unit: 'steps',
    unitLabel: 'Adım',
    kcalPerUnit: 0.04,
    description: 'Hafif tempo yürüyüş kalp sağlığını destekler ve stresi azaltır.'
  },
  {
    id: 'pushup',
    name: 'Şınav',
    icon: '💪',
    unit: 'reps',
    unitLabel: 'Tekrar',
    kcalPerUnit: 0.35,
    description: 'Göğüs, omuz ve arka kol kaslarını güçlendiren temel bir üst vücut egzersizidir.'
  },
  {
    id: 'situp',
    name: 'Mekik',
    icon: '🧘',
    unit: 'reps',
    unitLabel: 'Tekrar',
    kcalPerUnit: 0.5,
    description: 'Karın kaslarını hedefleyen klasik bir core bölgesi egzersizidir.'
  },
  {
    id: 'squat',
    name: 'Squat',
    icon: '🦵',
    unit: 'reps',
    unitLabel: 'Tekrar',
    kcalPerUnit: 0.4,
    description: 'Bacak ve kalça kaslarını en etkili çalıştıran temel alt vücut hareketidir.'
  },
  {
    id: 'running',
    name: 'Koşu',
    icon: '🏃‍♂️',
    unit: 'minutes',
    unitLabel: 'Dakika',
    kcalPerUnit: 10,
    description: 'Yüksek yoğunluklu kardiyo egzersizi; hızlı yağ yakımı sağlar.'
  },
  {
    id: 'cycling',
    name: 'Bisiklet',
    icon: '🚴',
    unit: 'minutes',
    unitLabel: 'Dakika',
    kcalPerUnit: 7,
    description: 'Eklem dostu bir kardiyo seçeneğidir, bacak kaslarını geliştirir.'
  },
  {
    id: 'swimming',
    name: 'Yüzme',
    icon: '🏊‍♂️',
    unit: 'minutes',
    unitLabel: 'Dakika',
    kcalPerUnit: 8.5,
    description: 'Tüm vücut kaslarını çalıştıran, eklemlere baskı yapmayan mükemmel bir spordur.'
  },
  {
    id: 'yoga',
    name: 'Yoga',
    icon: '🧘‍♀️',
    unit: 'minutes',
    unitLabel: 'Dakika',
    kcalPerUnit: 3.5,
    description: 'Esnekliği artırır, zihni sakinleştirir ve dengeyi geliştirir.'
  },
  {
    id: 'weightlifting',
    name: 'Ağırlık Antrenmanı',
    icon: '🏋️‍♂️',
    unit: 'minutes',
    unitLabel: 'Dakika',
    kcalPerUnit: 6,
    description: 'Kas kütlesini artırır ve bazal metabolizma hızını yükseltir.'
  },
  {
    id: 'plank',
    name: 'Plank',
    icon: '⏱️',
    unit: 'minutes',
    unitLabel: 'Dakika',
    kcalPerUnit: 4,
    description: 'Tüm vücut stabilitesini ve core gücünü artıran statik bir egzersizdir.'
  },
  {
    id: 'jumping_rope',
    name: 'İp Atlama',
    icon: '🪢',
    unit: 'reps',
    unitLabel: 'Tekrar',
    kcalPerUnit: 0.15,
    description: ' Koordinasyonu artırır ve çok kısa sürede yüksek kalori yakılmasını sağlar.'
  },
  {
    id: 'pilates',
    name: 'Pilates',
    icon: '🤸‍♀️',
    unit: 'minutes',
    unitLabel: 'Dakika',
    kcalPerUnit: 4.5,
    description: 'Vücut duruşunu düzeltir, core bölgesini sıkılaştırır.'
  },
  {
    id: 'boxing',
    name: 'Boks / Kickboks',
    icon: '🥊',
    unit: 'minutes',
    unitLabel: 'Dakika',
    kcalPerUnit: 12,
    description: 'Yoğun kalori yakımı, hız ve güç kazandıran deşarj edici bir antrenmandır.'
  },
];

export const getExerciseTypeById = (id) => EXERCISE_TYPES.find((t) => t.id === id);

export const calculateBurnedCalories = (exerciseTypeId, value) => {
  const type = getExerciseTypeById(exerciseTypeId);
  if (!type || value == null || value < 0) return 0;
  return Math.round(type.kcalPerUnit * Number(value));
};
