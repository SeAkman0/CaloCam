import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@calocam_dashboard_widgets';

export const WIDGET_IDS = ['calories', 'water', 'meals', 'exercise', 'stats'];

export const WIDGET_LABELS = {
  calories: 'Günlük Kalori',
  water: 'Su Tüketimi',
  meals: 'Bugünün Öğünleri',
  exercise: 'Yakılan Kalori',
  stats: 'Hızlı Bakış',
};

const DEFAULT_ORDER = ['calories', 'water', 'meals', 'exercise', 'stats'];

export const getWidgetOrder = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ORDER;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_ORDER;
    return parsed.filter((id) => WIDGET_IDS.includes(id));
  } catch (e) {
    return DEFAULT_ORDER;
  }
};

export const setWidgetOrder = async (order) => {
  try {
    const valid = order.filter((id) => WIDGET_IDS.includes(id));
    if (valid.length === 0) return;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
  } catch (e) {
    console.warn('Dashboard layout kaydedilemedi:', e);
  }
};
