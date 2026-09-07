/**
 * Utility for standardizing date formatting across the entire application.
 * All user-facing dates and exports to Excel/CSV strictly use the DD/MM/YYYY format
 * (e.g. 25/08/2026 or 01/07/2018).
 */

/**
 * Converts any date representation (YYYY-MM-DD, ISO string, D/M/YYYY, DD-MM-YYYY, Date object, or timestamp)
 * into a standardized "dd/mm/yyyy" string (e.g. "25/08/2026").
 */
export function formatDateToDDMMYYYY(val: any, fallback: string = '-'): string {
  if (val === undefined || val === null) return fallback;
  
  // If already a Date object
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return fallback;
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year = val.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // If number (timestamp or Excel serial)
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return fallback;
    // Excel serial number range (approx year 1927 - 2100)
    if (val > 10000 && val < 60000) {
      const utcDays = Math.floor(val - 25569);
      const d = new Date(utcDays * 86400 * 1000);
      if (!isNaN(d.getTime())) {
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}/${month}/${year}`;
      }
    }
    // Unix timestamp in ms or s
    const d = new Date(val > 10000000000 ? val : val * 1000);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return String(val);
  }

  let str = String(val).trim();
  if (!str || str === '-' || str === 'Belum Diatur') return fallback;

  // Remove leading single quote if present
  if (str.startsWith("'")) {
    str = str.slice(1).trim();
  }

  // Handle ISO string with time: "2026-08-25T14:30:00.000Z"
  if (str.includes('T')) {
    str = str.split('T')[0].trim();
  }

  // Format 1: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  // Format 2: DD/MM/YYYY or DD-MM-YYYY or D/M/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${day}/${month}/${year}`;
  }

  // Try standard Date parsing for Indonesian / English date strings if needed
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch {
    // ignore
  }

  return str || fallback;
}

/**
 * Converts any date representation into HTML5 <input type="date"> compatible "YYYY-MM-DD" string.
 */
export function formatDateToYYYYMMDD(val: any, fallback: string = ''): string {
  if (val === undefined || val === null) return fallback;
  
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return fallback;
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  let str = String(val).trim();
  if (!str || str === '-' || str === 'Belum Diatur') return fallback;

  if (str.startsWith("'")) {
    str = str.slice(1).trim();
  }

  if (str.includes('T')) {
    str = str.split('T')[0].trim();
  }

  // Already YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {
    // ignore
  }

  return fallback;
}

/**
 * Checks if a key name or string value indicates a date field.
 */
export function isDateKeyOrValue(key: string, val: any): boolean {
  if (!key && !val) return false;
  
  const cleanKey = String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const isDateKey = /tanggal|tgl|date|birth|lahir|masuk|daftar|selesai|mulai|tmt|bergabung/i.test(cleanKey);
  if (isDateKey) return true;

  if (val !== undefined && val !== null) {
    if (val instanceof Date) return true;
    const str = String(val).trim();
    // Matches YYYY-MM-DD or DD/MM/YYYY
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(str) || /^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/.test(str)) {
      return true;
    }
  }

  return false;
}
