/**
 * Open Food Facts API – Barkod ile paketli gıda besin değerleri
 * Ücretsiz, API anahtarı gerekmez.
 * https://world.openfoodfacts.org/api/v2/product/{barcode}
 */

const OPEN_FOOD_FACTS_API = 'https://world.openfoodfacts.org/api/v2/product';

/**
 * Barkod numarasıyla ürün getirir.
 * @param {string} barcode - EAN-8, EAN-13 veya UPC barkod
 * @returns {Promise<{success: boolean, productName?: string, portion?: number, calories?: number, protein?: number, carbs?: number, fat?: number, error?: string}>}
 */
export const getProductByBarcode = async (barcode) => {
  const code = String(barcode || '').trim().replace(/\D/g, '');
  if (!code) {
    return { success: false, error: 'Geçersiz barkod.' };
  }

  try {
    const res = await fetch(`${OPEN_FOOD_FACTS_API}/${code}.json`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      return { success: false, error: 'Ürün bulunamadı.' };
    }

    const data = await res.json();
    const product = data?.product;

    if (!product) {
      return { success: false, error: 'Bu barkod için ürün kaydı yok.' };
    }

    const nutriments = product.nutriments || {};
    const name =
      product.product_name ||
      product.product_name_tr ||
      product.product_name_en ||
      product.generic_name ||
      product.abbreviated_product_name ||
      'Bilinmeyen ürün';

    // 100g için değerler (Open Food Facts 100g bazlı)
    let energyKcal100 = nutriments['energy-kcal_100g'];
    if (energyKcal100 == null && nutriments.energy_100g != null) {
      energyKcal100 = nutriments.energy_100g / 4.184; // kJ -> kcal
    }
    const calories100 = typeof energyKcal100 === 'number' ? energyKcal100 : 0;
    const protein100 = typeof nutriments.proteins_100g === 'number' ? nutriments.proteins_100g : 0;
    const carbs100 = typeof nutriments.carbohydrates_100g === 'number' ? nutriments.carbohydrates_100g : 0;
    const fat100 = typeof nutriments.fat_100g === 'number' ? nutriments.fat_100g : 0;

    const hasNutrition = calories100 > 0 || protein100 > 0 || carbs100 > 0 || fat100 > 0;
    if (!hasNutrition) {
      return {
        success: false,
        error: 'Bu ürün için besin değeri (kalori, protein, karbonhidrat, yağ) bulunamadı.',
      };
    }

    // Porsiyon = kullanıcının yediği miktar (gram). Ürün gramajı varsa onu kullan (örn. 45g ürün → 45g porsiyon).
    let portionGram = 100;
    const quantityStr = String(product.quantity || product.product_quantity || '').trim();
    const quantityMatch = quantityStr.match(/(\d+)\s*g/i) || quantityStr.match(/(\d+)g/i) || quantityStr.match(/^(\d+)$/);
    if (quantityMatch) {
      const parsed = parseInt(quantityMatch[1], 10);
      if (parsed > 0 && parsed <= 10000) portionGram = parsed;
    }
    if (portionGram === 100 && product.serving_quantity != null) {
      const sq = typeof product.serving_quantity === 'number' ? product.serving_quantity : parseFloat(product.serving_quantity);
      if (sq > 0 && sq <= 10000) portionGram = Math.round(sq);
    }

    // 100g değerlerini kullanıcının yediği grama göre oranla (örn. 45g ürün → kalori = calories100 * 45 / 100)
    const calories = Math.round((calories100 * portionGram) / 100);
    const protein = Math.round((protein100 * portionGram) / 100);
    const carbs = Math.round((carbs100 * portionGram) / 100);
    const fat = Math.round((fat100 * portionGram) / 100);

    const imageUrl =
      product.image_front_url ||
      product.image_thumb_url ||
      product.image_small_url ||
      product.image_url ||
      null;

    return {
      success: true,
      productName: name,
      portion: portionGram,
      calories,
      protein,
      carbs,
      fat,
      imageUrl,
    };
  } catch (err) {
    console.error('Open Food Facts API hatası:', err);
    return {
      success: false,
      error: err.message || 'Bağlantı hatası. Tekrar deneyin.',
    };
  }
};
