/**
 * NamerForm - Dynamically renders parameter input fields and generates real-time filename previews.
 */

export class NamerForm {
    constructor(containerId, store, onFormChange) {
        this.container = document.getElementById(containerId);
        this.store = store;
        this.onFormChange = onFormChange;
        
        // Cache field values to preserve them across builder edits where possible
        this.valuesCache = {};
        this.startCounterVal = 1;

        this.init();
    }

    init() {
        this.renderStructure();
        this.setupEvents();
        this.renderForm();
    }

    renderStructure() {
        this.container.innerHTML = `
            <div class="preview-workspace">
                <form id="namer-form" class="namer-form">
                    <!-- Dynamic fields will render here -->
                </form>
                
                <div class="live-preview-box">
                    <div class="preview-header">
                        <span class="preview-label">Filename Preview</span>
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
    }

    setupEvents() {
        this.formElement.addEventListener('input', (e) => {
            const fieldId = e.target.dataset.fieldId;
            if (fieldId) {
                this.valuesCache[fieldId] = e.target.value;
                this.updatePreview();
                if (this.onFormChange) this.onFormChange();
            }

            if (e.target.id === 'start-counter-input') {
                this.startCounterVal = parseInt(e.target.value) || 1;
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
        let hasCounter = false;

        activeTpl.fields.forEach(field => {
            const cachedVal = this.valuesCache[field.id] !== undefined ? this.valuesCache[field.id] : '';
            
            let inputHtml = '';
            switch (field.type) {
                case 'text':
                    inputHtml = `
                        <input type="text" 
                               id="input-${field.id}" 
                               data-field-id="${field.id}" 
                               class="form-input" 
                               value="${cachedVal || ''}" 
                               placeholder="${field.placeholder || 'Enter text...'}"
                               required>
                    `;
                    break;
                case 'select':
                    const options = field.options || [];
                    inputHtml = `
                        <select id="input-${field.id}" 
                                data-field-id="${field.id}" 
                                class="form-select" 
                                required>
                            <option value="" disabled ${!cachedVal ? 'selected' : ''}>Select option...</option>
                            ${options.map(opt => `<option value="${opt}" ${cachedVal === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                        </select>
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
                case 'counter':
                    hasCounter = true;
                    const exampleVal = '1'.padStart(field.digits, '0');
                    inputHtml = `
                        <input type="number" 
                               id="start-counter-input" 
                               class="form-input start-counter-input" 
                               min="0" 
                               value="${this.startCounterVal}" 
                               placeholder="1">
                        <span class="field-helper-text">Padded to ${field.digits} digits (e.g. ${exampleVal}). Increments automatically per file.</span>
                    `;
                    break;
            }

            const labelFor = field.type === 'counter' ? 'start-counter-input' : `input-${field.id}`;
            fieldsHtml += `
                <div class="form-group namer-field-group">
                    <label for="${labelFor}">${field.label}</label>
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
            if (field.type === 'counter') {
                values[field.id] = { type: 'counter', digits: field.digits };
            } else {
                values[field.id] = this.valuesCache[field.id] || '';
            }
        });
        return values;
    }

    getStartCounter() {
        return this.startCounterVal;
    }

    generateFilename(indexOffset = 0, csvRow = null) {
        const activeTpl = this.store.getActiveTemplate();
        if (!activeTpl) return '';

        const separator = activeTpl.separator;
        const caseStyle = activeTpl.case;
        const segments = [];

        activeTpl.fields.forEach(field => {
            let val = '';
            if (field.type === 'counter') {
                const countVal = this.startCounterVal + indexOffset;
                val = String(countVal).padStart(field.digits, '0');
            } else if (field.type === 'date') {
                const rawDate = (csvRow && csvRow[field.id] !== undefined) ? csvRow[field.id] : this.valuesCache[field.id];
                val = this.formatDateString(rawDate, field.format);
            } else {
                val = (csvRow && csvRow[field.id] !== undefined) ? csvRow[field.id] : (this.valuesCache[field.id] || '');
                val = this.applyCaseStyle(val, caseStyle);
            }

            if (val !== '') {
                segments.push(val);
            }
        });

        return segments.join(separator);
    }

    updatePreview() {
        const baseName = this.generateFilename(0);
        this.previewElement.textContent = baseName ? `${baseName}.ext` : '[Fill in parameters]';
    }

    formatDateString(dateVal, format) {
        if (!dateVal) return '';
        const date = new Date(dateVal + 'T00:00:00');
        if (isNaN(date.getTime())) return '';

        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');

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
                const now = new Date();
                const hh = String(now.getHours()).padStart(2, '0');
                const min = String(now.getMinutes()).padStart(2, '0');
                const ss = String(now.getSeconds()).padStart(2, '0');
                return `${hh}${min}${ss}`;
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
