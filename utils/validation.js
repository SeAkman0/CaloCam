/**
 * Sadece rakam (0-9) girişine izin verir.
 * @param {string} text
 * @returns {string}
 */
export const allowOnlyNumbers = (text) => {
  return text.replace(/[^0-9]/g, '');
};

/**
 * Rakam ve en fazla bir ondalık nokta (örn. 70.5) girişine izin verir.
 * @param {string} text
 * @returns {string}
 */
export const allowNumbersAndOneDecimal = (text) => {
  const filtered = text.replace(/[^0-9.]/g, '');
  const parts = filtered.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }
  return filtered;
};

/**
 * GG/AA/YYYY string'ini Date'e çevirir. Geçersizse null.
 * @param {string} str
 * @returns {Date|null}
 */
export const parseBirthDate = (str) => {
  if (!str || typeof str !== 'string') return null;
  const parts = str.trim().split(/[/.-]/);
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (year < 1900 || year > new Date().getFullYear()) return null;
  if (month < 0 || month > 11) return null;
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  return d;
};

/**
 * Date'i GG/AA/YYYY formatına çevirir.
 * @param {Date} date
 * @returns {string}
 */
export const formatBirthDate = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};
