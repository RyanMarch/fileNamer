/**
 * NamerForm - Dynamically renders parameter input fields and generates real-time previews.
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
        this.showAdvanced = false;

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
                        <span class="preview-label">Output Preview</span>
                        <button id="advanced-toggle-btn" class="btn btn-secondary btn-small" type="button" style="margin-left: auto; margin-right: 1rem;" aria-pressed="false">
                            Show Structure
                        </button>
                        <button id="copy-preview-btn" class="btn btn-primary btn-small" type="button" title="Copy Preview to Clipboard">
                            <svg class="copy-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span class="btn-text">Copy</span>
                        </button>
                    </div>
                    <div id="filename-preview" class="filename-preview">
                        [preview]
                    </div>
                    <div id="preview-advanced-info" class="preview-advanced-info" style="display: none;">
                        <div class="advanced-row">
                            <span class="advanced-row-label">Structure</span>
                            <div id="structure-row-chips" class="advanced-row-chips"></div>
                        </div>
                    </div>
                </div>

                <div id="dropzone-root"></div>
            </div>
        `;

        this.formElement = this.container.querySelector('#namer-form');
        this.previewElement = this.container.querySelector('#filename-preview');
        this.copyBtn = this.container.querySelector('#copy-preview-btn');
        this.advancedToggleBtn = this.container.querySelector('#advanced-toggle-btn');
        this.advancedInfoContainer = this.container.querySelector('#preview-advanced-info');
        this.structureChipsContainer = this.container.querySelector('#structure-row-chips');
    }

    setupEvents() {
        this.formElement.addEventListener('keydown', (e) => {
            // Block spaces/underscores and char-type restrictions on text fields
            if (e.target.dataset.fieldId) {
                const noSpaces = e.target.dataset.noSpaces === 'true';
                const noUnderscores = e.target.dataset.noUnderscores === 'true';
                const charType = e.target.dataset.charType || 'any';

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

        if (this.advancedToggleBtn) {
            this.advancedToggleBtn.addEventListener('click', () => {
                this.showAdvanced = !this.showAdvanced;
                this.advancedToggleBtn.setAttribute('aria-pressed', this.showAdvanced);
                this.advancedToggleBtn.classList.toggle('active', this.showAdvanced);
                this.updatePreview();
            });
        }

        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', () => {
                const text = this.previewElement.textContent.trim();
                navigator.clipboard.writeText(text).then(() => {
                    const btnText = this.copyBtn.querySelector('.btn-text');
                    const copyIcon = this.copyBtn.querySelector('.copy-icon');
                    const checkIcon = this.copyBtn.querySelector('.check-icon');

                    if (btnText) btnText.textContent = 'Copied!';
                    if (copyIcon) copyIcon.style.display = 'none';
                    if (checkIcon) checkIcon.style.display = 'inline-block';

                    setTimeout(() => {
                        if (btnText) btnText.textContent = 'Copy';
                        if (copyIcon) copyIcon.style.display = 'inline-block';
                        if (checkIcon) checkIcon.style.display = 'none';
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
                    const noSpacesAttr = field.noSpaces ? 'data-no-spaces="true"' : '';
                    const noUnderAttr = field.noUnderscores ? 'data-no-underscores="true"' : '';
                    const charTypeAttr = field.charType && field.charType !== 'any' ? `data-char-type="${field.charType}"` : '';
                    const minLenAttr = field.minLength !== undefined && field.minLength !== '' ? `data-min-length="${field.minLength}"` : '';
                    const maxLenAttr = field.maxLength !== undefined && field.maxLength !== '' ? `data-max-length="${field.maxLength}" maxlength="${field.maxLength}"` : '';
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
                    let options = field.options || [];
                    if (field.sortAlphabetically) {
                        options = [...options].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
                    }
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
            let descHtml = '';
            if (field.description && field.description.trim()) {
                descHtml = `
                    <details class="namer-field-desc-details">
                        <summary class="namer-field-desc-summary">
                            <svg class="restrictions-chevron" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            Description
                        </summary>
                        <div class="namer-field-desc-content">
                            ${escapeHtml(field.description)}
                        </div>
                    </details>
                `;
            }

            fieldsHtml += `
                <div class="form-group namer-field-group">
                    <label for="${labelFor}">${escapeHtml(field.label)}</label>
                    <div class="field-control-wrapper">
                        ${inputHtml}
                        ${descHtml}
                    </div>
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

    getQueryParamKey(field) {
        // e.g. "Campaign Source (utm_source)" -> "utm_source"
        const match = field.label.match(/\(([^)]+)\)/);
        if (match) {
            return match[1].trim();
        }
        // Fallback: sanitize label
        return field.label.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    }

    generateFilename(indexOffset = 0, csvRow = null, showStructure = false) {
        const activeTpl = this.store.getActiveTemplate();
        if (!activeTpl) return '';

        const isUtm = activeTpl.id === 'tpl-utm' || (activeTpl.name && (activeTpl.name.toUpperCase().includes('UTM') || activeTpl.name.toUpperCase().includes('URL')));
        const separator = activeTpl.separator;
        const caseStyle = activeTpl.case;

        if (isUtm) {
            // Find URL field
            const urlField = activeTpl.fields.find(f => f.id === 'f-utm-url' || f.label.toLowerCase().includes('url'));
            let baseUrl = '';
            if (showStructure) {
                baseUrl = urlField ? (urlField.label || 'URL') : 'URL';
            } else if (urlField) {
                baseUrl = (csvRow && csvRow[urlField.id]) ? csvRow[urlField.id] : (this.valuesCache[urlField.id] || '');
                if (!baseUrl) {
                    baseUrl = urlField.placeholder || 'https://example.com';
                }
            } else {
                baseUrl = 'https://example.com';
            }

            // Ensure baseUrl has protocol if it doesn't look like it has one
            if (!showStructure && baseUrl && !/^https?:\/\//i.test(baseUrl)) {
                baseUrl = 'https://' + baseUrl;
            }

            const queryParams = [];
            activeTpl.fields.forEach(field => {
                if (field.type === 'extension') return;
                if (field === urlField) return; // skip URL field

                let val = '';
                if (showStructure) {
                    val = field.label || '';
                } else if (field.type === 'index') {
                    const countVal = this.startIndexVal + indexOffset;
                    const padDigits = parseInt(field.digits);
                    val = isNaN(padDigits) || padDigits <= 1 ? String(countVal) : String(countVal).padStart(padDigits, '0');
                } else if (field.type === 'date') {
                    const rawDate = (csvRow && csvRow[field.id]) ? csvRow[field.id] : this.valuesCache[field.id];
                    val = this.formatDateString(rawDate, field.format, field.customFormat);
                } else {
                    val = (csvRow && csvRow[field.id]) ? csvRow[field.id] : (this.valuesCache[field.id] || '');
                    val = this.applyCaseStyle(val, caseStyle);
                    if (separator) {
                        val = val.replace(/\s+/g, separator);
                    }
                }

                if (val !== '' || showStructure) {
                    const key = this.getQueryParamKey(field);
                    if (showStructure) {
                        queryParams.push(`${key}=[${val}]`);
                    } else {
                        queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
                    }
                }
            });

            if (queryParams.length > 0) {
                const joinChar = baseUrl.includes('?') ? '&' : '?';
                return `${baseUrl}${joinChar}${queryParams.join('&')}`;
            }
            return baseUrl;
        }

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
                const rawDate = (csvRow && csvRow[field.id]) ? csvRow[field.id] : this.valuesCache[field.id];
                val = this.formatDateString(rawDate, field.format, field.customFormat);
            } else {
                val = (csvRow && csvRow[field.id]) ? csvRow[field.id] : (this.valuesCache[field.id] || '');
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
            this.previewElement.innerHTML = '<span class="preview-placeholder">[Fill in parameters]</span>';
            if (this.advancedInfoContainer) {
                this.advancedInfoContainer.style.display = 'none';
            }
            return;
        }

        const baseName = this.generateFilename(0, null, false);
        if (!baseName) {
            this.previewElement.innerHTML = '<span class="preview-placeholder">[Fill in parameters]</span>';
        } else {
            const extField = activeTpl.fields.find(f => f.type === 'extension');
            let previewExt = '';
            if (extField) {
                if (extField.includeExtInPreview !== false) {
                    const extMode = extField.extensionMode || 'keep';
                    if (extMode === 'lowercase' || extMode === 'keep') {
                        previewExt = '.ext';
                    } else if (extMode === 'uppercase') {
                        previewExt = '.EXT';
                    } else if (extMode === 'custom') {
                        const custom = (extField.customExtension || '').trim();
                        previewExt = custom ? (custom.startsWith('.') ? custom : `.${custom}`) : '';
                    } else if (extMode === 'none') {
                        previewExt = '';
                    }
                }
            }
            this.previewElement.textContent = `${baseName}${previewExt}`;
        }

        if (this.showAdvanced) {
            if (this.advancedInfoContainer) {
                this.advancedInfoContainer.style.display = 'flex';
            }
            const separator = activeTpl.separator || '';
            const isUtm = activeTpl.id === 'tpl-utm' || (activeTpl.name && (activeTpl.name.toUpperCase().includes('UTM') || activeTpl.name.toUpperCase().includes('URL')));

            if (isUtm) {
                const urlField = activeTpl.fields.find(f => f.id === 'f-utm-url' || f.label.toLowerCase().includes('url'));
                const chipSpans = [];
                activeTpl.fields.forEach(field => {
                    const label = escapeHtml(field.label || field.type);
                    const typeClass = field.type === 'select' ? 'badge-select' : `badge-${field.type}`;
                    const chip = `<span class="preview-field-chip ${typeClass}" title="${escapeHtml(field.type)}">${label}</span>`;

                    if (field === urlField) {
                        chipSpans.push(chip);
                    } else {
                        const key = this.getQueryParamKey(field);
                        chipSpans.push(`<span class="preview-separator">${escapeHtml(key)}=</span>${chip}`);
                    }
                });

                let html = '';
                if (urlField) {
                    const urlIdx = activeTpl.fields.indexOf(urlField);
                    const urlChip = chipSpans[urlIdx];
                    const otherChips = chipSpans.filter((_, idx) => idx !== urlIdx);
                    html = urlChip + (otherChips.length > 0 ? `<span class="preview-separator">?</span>` + otherChips.join(`<span class="preview-separator">&</span>`) : '');
                } else {
                    html = chipSpans.join(`<span class="preview-separator">&</span>`);
                }
                if (this.structureChipsContainer) {
                    this.structureChipsContainer.innerHTML = html;
                }
            } else {
                // Structure Chips
                const structSpans = [];
                activeTpl.fields.forEach(field => {
                    const label = escapeHtml(field.label || field.type);
                    const typeClass = field.type === 'select' ? 'badge-select' : `badge-${field.type}`;
                    structSpans.push(`<span class="preview-field-chip ${typeClass}" title="${escapeHtml(field.type)}">${label}</span>`);
                });
                if (this.structureChipsContainer) {
                    this.structureChipsContainer.innerHTML = structSpans.join(
                        separator ? `<span class="preview-separator">${escapeHtml(separator)}</span>` : ''
                    );
                }
            }

        } else {
            if (this.advancedInfoContainer) {
                this.advancedInfoContainer.style.display = 'none';
            }
        }
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
