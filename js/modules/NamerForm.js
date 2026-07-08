/**
 * NamerForm - Dynamically renders parameter input fields and generates real-time filename previews.
 */

import { escapeHtml } from './utils.js';

export class NamerForm {
    constructor(containerId, store, onFormChange) {
        this.container = document.getElementById(containerId);
        this.store = store;
        this.onFormChange = onFormChange;

        // Cache field values to preserve them across builder edits where possible
        this.valuesCache = {};
        this.lastPlaceholders = {};
        this.startIndexVal = 1;

        this.init();
    }

    init() {
        this.renderStructure();
        this.setupEvents();
        this.renderForm();
    }

    renderStructure() {
        this.container.innerHTML =  /*html*/`
            <div class="preview-workspace">
                <form id="namer-form" class="namer-form">
                    <!-- Dynamic fields will render here -->
                </form>
                
                <div class="live-preview-box">
                    <div class="preview-header">
                        <span class="preview-label">Filename Preview</span>
                        <label class="checkbox-label" style="margin-left: auto; margin-right: 1rem;">
                            <input type="checkbox" id="show-structure-chk">
                            <span>Show Structure</span>
                        </label>
                        <button id="copy-preview-btn" class="btn btn-secondary btn-small" type="button" title="Copy Preview to Clipboard">
                            Copy
                        </button>
                    </div>
                    <div id="filename-preview" class="filename-preview">
                        [preview]
                    </div>
                </div>

                <div id="dropzone-root"></div>
            </div>
        `;

        this.formElement = this.container.querySelector('#namer-form');
        this.previewElement = this.container.querySelector('#filename-preview');
        this.copyBtn = this.container.querySelector('#copy-preview-btn');
        this.showStructureCheckbox = this.container.querySelector('#show-structure-chk');
    }

    setupEvents() {
        this.formElement.addEventListener('keydown', (e) => {
            // Block spaces/underscores and char-type restrictions on text fields
            if (e.target.dataset.fieldId) {
                const noSpaces      = e.target.dataset.noSpaces === 'true';
                const noUnderscores = e.target.dataset.noUnderscores === 'true';
                const charType      = e.target.dataset.charType || 'any';

                const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                                     'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
                if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
                    // Allow navigation/control keys always
                } else {
                    if (noSpaces && e.key === ' ') { e.preventDefault(); return; }
                    if (noUnderscores && e.key === '_') { e.preventDefault(); return; }
                    if (charType === 'alpha' && !/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); return; }
                    if (charType === 'numeric' && !/^\d$/.test(e.key)) { e.preventDefault(); return; }
                    if (charType === 'alphanumeric' && !/^[a-zA-Z0-9]$/.test(e.key)) { e.preventDefault(); return; }
                }
            }

            if (e.target.id === 'start-index-input') {
                const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
                if (allowed.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
                    return;
                }
                if (!/^\d$/.test(e.key)) {
                    e.preventDefault();
                }
            }
        });

        this.formElement.addEventListener('paste', (e) => {
            if (e.target.dataset.fieldId) {
                const noSpaces      = e.target.dataset.noSpaces === 'true';
                const noUnderscores = e.target.dataset.noUnderscores === 'true';
                const charType      = e.target.dataset.charType || 'any';
                const maxLen        = e.target.dataset.maxLength !== undefined ? parseInt(e.target.dataset.maxLength) : null;

                const pasteData = (e.clipboardData || window.clipboardData).getData('text');
                let sanitized = pasteData;

                if (charType === 'alpha')         sanitized = sanitized.replace(/[^a-zA-Z]/g, '');
                else if (charType === 'numeric')   sanitized = sanitized.replace(/[^\d]/g, '');
                else if (charType === 'alphanumeric') sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, '');
                if (noSpaces)      sanitized = sanitized.replace(/ /g, '');
                if (noUnderscores) sanitized = sanitized.replace(/_/g, '');

                // Trim to maxLength accounting for existing value
                if (maxLen !== null) {
                    const el = e.target;
                    const start = el.selectionStart;
                    const end   = el.selectionEnd;
                    const currentVal = el.value;
                    const remaining = maxLen - (currentVal.length - (end - start));
                    sanitized = sanitized.slice(0, Math.max(0, remaining));
                }

                if (sanitized !== pasteData || (maxLen !== null && sanitized.length < pasteData.length)) {
                    e.preventDefault();
                    const el = e.target;
                    const start = el.selectionStart;
                    const end   = el.selectionEnd;
                    el.value = el.value.slice(0, start) + sanitized + el.value.slice(end);
                    el.selectionStart = el.selectionEnd = start + sanitized.length;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }

            if (e.target.id === 'start-index-input') {
                const pasteData = (e.clipboardData || window.clipboardData).getData('text');
                if (!/^\d+$/.test(pasteData)) {
                    e.preventDefault();
                }
            }
        });

        this.formElement.addEventListener('input', (e) => {
            // Min length invalid state
            if (e.target.dataset.fieldId && e.target.dataset.minLength) {
                const minLen = parseInt(e.target.dataset.minLength);
                const val = e.target.value;
                if (val.length > 0 && val.length < minLen) {
                    e.target.classList.add('input-invalid');
                    e.target.title = `Minimum ${minLen} character${minLen !== 1 ? 's' : ''} required`;
                } else {
                    e.target.classList.remove('input-invalid');
                    e.target.title = '';
                }
            }
            const fieldId = e.target.dataset.fieldId;
            if (fieldId) {
                this.valuesCache[fieldId] = e.target.value;
                this.updatePreview();
                if (this.onFormChange) this.onFormChange();
            }

            if (e.target.id === 'start-index-input') {
                this.startIndexVal = parseInt(e.target.value) || 1;
                this.updatePreview();
                if (this.onFormChange) this.onFormChange();
            }
        });

        this.formElement.addEventListener('change', (e) => {
            const fieldId = e.target.dataset.fieldId;
            if (fieldId) {
                this.valuesCache[fieldId] = e.target.value;
                this.updatePreview();
                if (this.onFormChange) this.onFormChange();
            }
        });

        if (this.showStructureCheckbox) {
            this.showStructureCheckbox.addEventListener('change', () => {
                this.updatePreview();
            });
        }

        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', () => {
                const text = this.previewElement.textContent.trim();
                navigator.clipboard.writeText(text).then(() => {
                    const originalText = this.copyBtn.textContent;
                    this.copyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        this.copyBtn.textContent = originalText;
                    }, 1500);
                }).catch(err => {
                    console.error('Failed to copy preview:', err);
                });
            });
        }
    }

    renderForm() {
        const activeTpl = this.store.getActiveTemplate();
        if (!activeTpl) {
            this.formElement.innerHTML = `<div class="info-msg">No active template.</div>`;
            return;
        }

        let fieldsHtml = '';
        let hasIndex = false;

        activeTpl.fields.forEach(field => {
            if (field.type === 'extension') {
                return; // Skip rendering in form
            }

            const isPlaceholderMode = field.behavior === 'placeholder';
            const currentPlaceholder = field.placeholder || '';
            const lastPlaceholder = this.lastPlaceholders[field.id] || '';

            if (isPlaceholderMode) {
                // If we switched to placeholder mode, clear the default value from cache if it has not been custom edited
                if (this.valuesCache[field.id] === lastPlaceholder) {
                    this.valuesCache[field.id] = '';
                }
            } else {
                // Default value mode
                // If never initialized, or if it matched the old default value and the default value changed in the builder
                if (this.valuesCache[field.id] === undefined || this.valuesCache[field.id] === lastPlaceholder) {
                    this.valuesCache[field.id] = currentPlaceholder;
                }
            }

            this.lastPlaceholders[field.id] = currentPlaceholder;

            const cachedVal = this.valuesCache[field.id] !== undefined ? this.valuesCache[field.id] : '';

            let inputHtml = '';
            switch (field.type) {
                case 'text':
                    const noSpacesAttr    = field.noSpaces      ? 'data-no-spaces="true"'      : '';
                    const noUnderAttr     = field.noUnderscores  ? 'data-no-underscores="true"'  : '';
                    const charTypeAttr    = field.charType && field.charType !== 'any' ? `data-char-type="${field.charType}"` : '';
                    const minLenAttr      = field.minLength !== undefined && field.minLength !== '' ? `data-min-length="${field.minLength}"` : '';
                    const maxLenAttr      = field.maxLength !== undefined && field.maxLength !== '' ? `data-max-length="${field.maxLength}" maxlength="${field.maxLength}"` : '';
                    inputHtml = `
                        <input type="text" 
                               id="input-${field.id}" 
                               data-field-id="${field.id}" 
                               class="form-input" 
                               value="${escapeHtml(cachedVal)}" 
                               placeholder="${escapeHtml(isPlaceholderMode ? (field.placeholder || 'Enter text...') : 'Enter text...')}"
                               ${noSpacesAttr} ${noUnderAttr} ${charTypeAttr} ${minLenAttr} ${maxLenAttr}
                               required>
                    `;
                    break;
                case 'select':
                    const options = field.options || [];
                    inputHtml = `
                        <input type="text"
                               id="input-${field.id}"
                               data-field-id="${field.id}"
                               class="form-select"
                               value="${escapeHtml(cachedVal)}"
                               placeholder="Select or type..."
                               list="list-${field.id}"
                               required>
                        <datalist id="list-${field.id}">
                            ${options.map(opt => `<option value="${escapeHtml(opt)}"></option>`).join('')}
                        </datalist>
                    `;
                    break;
                case 'date':
                    // Default to today if no cached value
                    const defaultDate = cachedVal || new Date().toISOString().split('T')[0];
                    if (!this.valuesCache[field.id]) {
                        this.valuesCache[field.id] = defaultDate;
                    }
                    inputHtml = `
                        <input type="date" 
                               id="input-${field.id}" 
                               data-field-id="${field.id}" 
                               class="form-input" 
                               value="${defaultDate}" 
                               required>
                    `;
                    break;
                case 'index':
                    hasIndex = true;
                    const digitCount = parseInt(field.digits);
                    const isNone = isNaN(digitCount) || digitCount <= 1;
                    const exampleVal = isNone ? '1' : '1'.padStart(digitCount, '0');
                    const helperMsg = isNone
                        ? 'No digit padding.'
                        : `Padded to ${digitCount} digits (e.g. ${exampleVal}).`;
                    inputHtml = `
                        <input type="number" 
                               id="start-index-input" 
                               class="form-input start-index-input" 
                               min="0" 
                               value="${this.startIndexVal}" 
                               placeholder="1">
                        <span class="field-helper-text">${helperMsg}</span>
                    `;
                    break;
            }

            const labelFor = field.type === 'index' ? 'start-index-input' : `input-${field.id}`;
            fieldsHtml += `
                <div class="form-group namer-field-group">
                    <label for="${labelFor}">${escapeHtml(field.label)}</label>
                    ${inputHtml}
                </div>
            `;
        });

        this.formElement.innerHTML = fieldsHtml || `<div class="info-msg">No inputs. Add segments in the Builder tab to generate a form.</div>`;
        this.updatePreview();
    }

    getFormValues() {
        const activeTpl = this.store.getActiveTemplate();
        if (!activeTpl) return {};

        const values = {};
        activeTpl.fields.forEach(field => {
            if (field.type === 'index') {
                values[field.id] = { type: 'index', digits: field.digits };
            } else {
                values[field.id] = this.valuesCache[field.id] || '';
            }
        });
        return values;
    }

    getStartIndex() {
        return this.startIndexVal;
    }

    generateFilename(indexOffset = 0, csvRow = null, showStructure = false) {
        const activeTpl = this.store.getActiveTemplate();
        if (!activeTpl) return '';

        const separator = activeTpl.separator;
        const caseStyle = activeTpl.case;
        const segments = [];

        activeTpl.fields.forEach(field => {
            if (field.type === 'extension') {
                return; // Skip extension field from base name segments
            }
            let val = '';
            if (showStructure) {
                val = field.label || '';
            } else if (field.type === 'index') {
                const countVal = this.startIndexVal + indexOffset;
                const padDigits = parseInt(field.digits);
                val = isNaN(padDigits) || padDigits <= 1 ? String(countVal) : String(countVal).padStart(padDigits, '0');
            } else if (field.type === 'date') {
                const rawDate = (csvRow && csvRow[field.id] !== undefined) ? csvRow[field.id] : this.valuesCache[field.id];
                val = this.formatDateString(rawDate, field.format, field.customFormat);
            } else {
                val = (csvRow && csvRow[field.id] !== undefined) ? csvRow[field.id] : (this.valuesCache[field.id] || '');
                val = this.applyCaseStyle(val, caseStyle);
                if (separator) {
                    val = val.replace(/\s+/g, separator);
                }
            }

            if (val !== '') {
                segments.push(val);
            }
        });

        return segments.join(separator);
    }

    updatePreview() {
        const activeTpl = this.store.getActiveTemplate();
        if (!activeTpl) {
            this.previewElement.textContent = '[Fill in parameters]';
            return;
        }

        const showStructure = this.showStructureCheckbox ? this.showStructureCheckbox.checked : false;
        const baseName = this.generateFilename(0, null, showStructure);
        if (!baseName) {
            this.previewElement.textContent = '[Fill in parameters]';
            return;
        }

        const extField = activeTpl.fields.find(f => f.type === 'extension');
        if (!extField || extField.includeExtInPreview === false) {
            this.previewElement.textContent = baseName;
            return;
        }

        const extMode = extField.extensionMode || 'keep';
        let previewExt = '.ext';

        if (extMode === 'lowercase') {
            previewExt = '.ext';
        } else if (extMode === 'uppercase') {
            previewExt = '.EXT';
        } else if (extMode === 'custom') {
            const custom = (extField.customExtension || '').trim();
            previewExt = custom ? (custom.startsWith('.') ? custom : `.${custom}`) : '';
        } else if (extMode === 'none') {
            previewExt = '';
        }

        this.previewElement.textContent = `${baseName}${previewExt}`;
    }

    formatDateString(dateVal, format, customFormat = '') {
        if (!dateVal) return '';
        const date = new Date(dateVal + 'T00:00:00');
        if (isNaN(date.getTime())) return '';

        const yyyy = date.getFullYear();
        const yy = String(yyyy).slice(-2);
        const monthNum = date.getMonth() + 1;
        const mm = String(monthNum).padStart(2, '0');
        const m = String(monthNum);
        const dayNum = date.getDate();
        const dd = String(dayNum).padStart(2, '0');
        const d = String(dayNum);

        const now = new Date();
        const hours24 = now.getHours();
        const hours12 = hours24 % 12 || 12;
        const HH = String(hours24).padStart(2, '0');
        const H = String(hours24);
        const hh = String(hours12).padStart(2, '0');
        const h = String(hours12);
        const minutesNum = now.getMinutes();
        const minPad = String(minutesNum).padStart(2, '0');
        const minSingle = String(minutesNum);
        const secondsNum = now.getSeconds();
        const ss = String(secondsNum).padStart(2, '0');
        const s = String(secondsNum);
        const ampmUpper = hours24 >= 12 ? 'PM' : 'AM';
        const ampmLower = hours24 >= 12 ? 'pm' : 'am';

        if (format === 'custom') {
            let result = customFormat || '';
            const replacements = [
                { token: 'YYYY', value: yyyy },
                { token: 'yyyy', value: yyyy },
                { token: 'YY', value: yy },
                { token: 'yy', value: yy },
                { token: 'MM', value: mm },
                { token: 'M', value: m },
                { token: 'DD', value: dd },
                { token: 'dd', value: dd },
                { token: 'D', value: d },
                { token: 'd', value: d },
                { token: 'HH', value: HH },
                { token: 'H', value: H },
                { token: 'hh', value: hh },
                { token: 'h', value: h },
                { token: 'mm', value: minPad },
                { token: 'm', value: minSingle },
                { token: 'ss', value: ss },
                { token: 's', value: s },
                { token: 'A', value: ampmUpper },
                { token: 'a', value: ampmLower }
            ];

            for (const { token, value } of replacements) {
                result = result.split(token).join(value);
            }
            return result;
        }

        switch (format) {
            case 'YYYYMMDD':
                return `${yyyy}${mm}${dd}`;
            case 'YYYY-MM-DD':
                return `${yyyy}-${mm}-${dd}`;
            case 'YYYY':
                return `${yyyy}`;
            case 'MM-DD':
                return `${mm}-${dd}`;
            case 'HHMMSS':
                return `${HH}${minPad}${ss}`;
            default:
                return `${yyyy}${mm}${dd}`;
        }
    }

    applyCaseStyle(text, caseStyle) {
        if (!text) return '';
        switch (caseStyle) {
            case 'lower':
                return text.toLowerCase();
            case 'upper':
                return text.toUpperCase();
            case 'snake':
                return text
                    .replace(/([a-z])([A-Z])/g, '$1_$2')
                    .replace(/[\s\-_]+/g, '_')
                    .toLowerCase();
            case 'camel':
                return text
                    .toLowerCase()
                    .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
            default:
                return text;
        }
    }
}
