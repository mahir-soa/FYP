/**
 * Format a number with commas for thousands and fixed decimal places.
 * Uses en-GB locale (e.g., 1,000.00).
 *
 * @param {number} value - The number to format
 * @param {number} decimals - Decimal places (default 2)
 * @returns {string} Formatted number string
 */
export const fmt = (value, decimals = 2) =>
  Number(value).toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
