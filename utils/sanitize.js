// utils/sanitize.js

/**
 * Escape HTML special characters.
 * EJS's <%= %> does this automatically, but use this
 * for any context where you're building strings manually.
 */
exports.escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
};

/**
 * Sanitize a value for use in a CSV cell.
 * Strips leading characters that spreadsheet apps interpret as formulas.
 */
exports.escapeCsv = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  // Prevent CSV injection — strip leading =, +, -, @ characters
  if (['=', '+', '-', '@'].includes(str[0])) {
    return "'" + str;
  }
  return str;
};

/**
 * Trim all string values in a request body object.
 * Returns a new object — does not mutate req.body.
 */
exports.trimBody = (body) => {
  const result = {};
  for (const key in body) {
    result[key] = typeof body[key] === 'string'
      ? body[key].trim()
      : body[key];
  }
  return result;
};