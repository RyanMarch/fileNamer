/**
 * utils.js - Shared utility functions.
 */

/**
 * Escapes a string so it can be safely inserted as HTML content or an attribute value.
 * Prevents DOM-based Cross-Site Scripting (XSS) attacks.
 *
 * @param {string} str - The untrusted string to escape.
 * @returns {string} - HTML-safe escaped string.
 */
export function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
