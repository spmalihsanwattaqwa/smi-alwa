/**
 * Utility to sanitize identification numbers (NIK, No KK, NISN, NIS, Telepon/WA)
 * to prevent scientific notation formatting (e.g. 3,31E+15 or 3.31E+15) and
 * preserve exact textual digit representations across the entire application.
 */

export function sanitizeIdNumber(val: any): string {
  if (val === undefined || val === null) return '';
  let str = String(val).trim();
  if (!str || str === '-') return str;

  // Remove leading single quote if present (Google Sheets / Excel text marker)
  if (str.startsWith("'")) {
    str = str.slice(1).trim();
  }

  // Check if string is formatted in scientific notation, e.g. "3,31E+15", "3.31E+15", "3.305062208810002E+15"
  const sciMatch = str.match(/^([0-9]+(?:[.,][0-9]+)?)[eE]([+-]?[0-9]+)$/);
  if (sciMatch) {
    try {
      const baseNum = Number(sciMatch[1].replace(',', '.'));
      const exponent = parseInt(sciMatch[2], 10);
      if (!isNaN(baseNum) && !isNaN(exponent)) {
        const factor = Math.min(exponent, 14);
        const remainder = exponent - factor;
        const expanded = BigInt(Math.round(baseNum * Math.pow(10, factor))) * (BigInt(10) ** BigInt(remainder));
        return expanded.toString();
      }
    } catch {
      return str.replace(/[eE][+-]?[0-9]+/g, '');
    }
  }

  // If passed as a JS number
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return '';
    if (Number.isInteger(val)) {
      return BigInt(val).toString();
    }
  }

  return str;
}
