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

/**
 * Validates a keydown event against field constraints (no spaces, no underscores, charType).
 * @param {KeyboardEvent} e - The keydown event.
 */
export function validateKeyConstraint(e) {
    if (!e.target.dataset.fieldId) return;

    const noSpaces = e.target.dataset.noSpaces === 'true';
    const noUnderscores = e.target.dataset.noUnderscores === 'true';
    const charType = e.target.dataset.charType || 'any';

    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

    if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
        // Allow navigation/control keys always
        return;
    }

    if (noSpaces && e.key === ' ') {
        e.preventDefault();
        return;
    }
    if (noUnderscores && e.key === '_') {
        e.preventDefault();
        return;
    }
    if (charType === 'alpha' && !/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        return;
    }
    if (charType === 'numeric' && !/^\d$/.test(e.key)) {
        e.preventDefault();
        return;
    }
    if (charType === 'alphanumeric' && !/^[a-zA-Z0-9]$/.test(e.key)) {
        e.preventDefault();
        return;
    }
}

/**
 * Sanitizes and handles copy-paste events based on field constraints.
 * @param {ClipboardEvent} e - The paste event.
 */
export function sanitizePasteConstraint(e) {
    if (!e.target.dataset.fieldId) return;

    const noSpaces = e.target.dataset.noSpaces === 'true';
    const noUnderscores = e.target.dataset.noUnderscores === 'true';
    const charType = e.target.dataset.charType || 'any';
    const maxLen = e.target.dataset.maxLength !== undefined ? parseInt(e.target.dataset.maxLength) : null;

    const pasteData = (e.clipboardData || window.clipboardData).getData('text');
    let sanitized = pasteData;

    if (charType === 'alpha') sanitized = sanitized.replace(/[^a-zA-Z]/g, '');
    else if (charType === 'numeric') sanitized = sanitized.replace(/[^\d]/g, '');
    else if (charType === 'alphanumeric') sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, '');
    if (noSpaces) sanitized = sanitized.replace(/ /g, '');
    if (noUnderscores) sanitized = sanitized.replace(/_/g, '');

    // Trim to maxLength accounting for existing value
    if (maxLen !== null) {
        const el = e.target;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const currentVal = el.value;
        const remaining = maxLen - (currentVal.length - (end - start));
        sanitized = sanitized.slice(0, Math.max(0, remaining));
    }

    if (sanitized !== pasteData || (maxLen !== null && sanitized.length < pasteData.length)) {
        e.preventDefault();
        const el = e.target;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        el.value = el.value.slice(0, start) + sanitized + el.value.slice(end);
        el.selectionStart = el.selectionEnd = start + sanitized.length;
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

