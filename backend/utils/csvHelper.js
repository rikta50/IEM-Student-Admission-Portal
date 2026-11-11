/**
 * CSV Sanitization and Formatting Utility
 * Protects against CSV Formula Injection (CWE-1236)
 * Strictly formats rows with RFC 4180 compliance
 */

/**
 * Sanitize cell values against CSV Formula Injection
 * Prepends a single quote (') if the text begins with dangerous execution characters (=, +, -, @, \t, \r)
 * Escapes internal quotes and wraps values with commas or quotes in double quotes.
 * @param {any} value Input cell value
 * @returns {string} Sanitized CSV cell string
 */
const sanitizeCsvCell = (value) => {
  if (value === null || value === undefined) {
    return '""';
  }

  let stringValue = String(value).trim();

  // Protect against CSV formula injection
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousPrefixes.some((prefix) => stringValue.startsWith(prefix))) {
    stringValue = `'${stringValue}`;
  }

  // Escape double quotes by doubling them (" -> "")
  const escapedValue = stringValue.replace(/"/g, '""');

  return `"${escapedValue}"`;
};

/**
 * Convert array of JSON objects to CSV string
 * @param {Array<string>} headers Array of column titles
 * @param {Array<Array<any>>} rows Array of row arrays corresponding to headers
 * @returns {string} Formatted CSV text
 */
const generateCsv = (headers, rows) => {
  const headerLine = headers.map(sanitizeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(sanitizeCsvCell).join(','));
  return [headerLine, ...rowLines].join('\r\n');
};

module.exports = {
  sanitizeCsvCell,
  generateCsv
};

