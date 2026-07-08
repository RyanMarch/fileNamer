/**
 * TemplateBuilder - Controls the template building UI.
 */

export class TemplateBuilder {
    constructor(containerId, store, onTemplateChange) {
        this.container = document.getElementById(containerId);
        this.store = store;
        this.onTemplateChange = onTemplateChange;

        this.init();
    }

    init() {
        this.render();
        this.setupGlobalEvents();
    }

    render() {
        const templates = this.store.getTemplates();
        const activeTpl = this.store.getActiveTemplate();

        if (!activeTpl) {
            this.container.innerHTML = `<div class="error-msg">No templates found. Please reset.</div>`;
            return;
        }

        // Render template builder container
        this.container.innerHTML = `
            <div class="template-builder-controls">
                <div class="template-controls-row">
                    <div class="control-item template-select-group">
                        <label for="template-select">Template Picker</label>
                        <div class="template-select-container">
                            <select id="template-select" class="form-select select-template">
                                ${templates.map(t => `<option value="${t.id}" ${t.id === activeTpl.id ? 'selected' : ''}>${t.name}</option>`).join('')}
                            </select>
                            <div class="button-actions">
                                <button id="rename-tpl-btn" class="btn btn-secondary btn-icon-only" title="Rename Active Template" aria-label="Rename Active Template">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                </button>
                                <button id="add-tpl-btn" class="btn btn-secondary btn-icon-only" title="New Custom Template" aria-label="New Custom Template">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                                </button>
                                <button id="share-tpl-btn" class="btn btn-secondary btn-icon-only" title="Share Active Template Link" aria-label="Share Active Template Link">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                                </button>
                                <button id="delete-tpl-btn" class="btn btn-danger btn-icon-only" title="Delete Active Template" aria-label="Delete Active Template" ${templates.length <= 1 ? 'disabled' : ''}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="template-rules-row">
                    <div class="control-item template-separator-group">
                        <label for="template-separator">Separator</label>
                        <select id="template-separator" class="form-select">
                            <option value="_" ${activeTpl.separator === '_' ? 'selected' : ''}>Underscore (_)</option>
                            <option value="-" ${activeTpl.separator === '-' ? 'selected' : ''}>Hyphen (-)</option>
                            <option value="." ${activeTpl.separator === '.' ? 'selected' : ''}>Dot (.)</option>
                            <option value="" ${activeTpl.separator === '' ? 'selected' : ''}>None</option>
                        </select>
                    </div>
                    <div class="control-item template-case-group">
                        <label for="template-case">Case Styling</label>
                        <select id="template-case" class="form-select">
                            <option value="none" ${activeTpl.case === 'none' ? 'selected' : ''}>As Entered</option>
                            <option value="lower" ${activeTpl.case === 'lower' ? 'selected' : ''}>lowercase</option>
                            <option value="upper" ${activeTpl.case === 'upper' ? 'selected' : ''}>UPPERCASE</option>
                            <option value="snake" ${activeTpl.case === 'snake' ? 'selected' : ''}>snake_case</option>
                            <option value="camel" ${activeTpl.case === 'camel' ? 'selected' : ''}>camelCase</option>
                        </select>
                    </div>
                </div>

                <div class="divider"></div>

                <h3>Field Builder</h3>
                <!-- Field Builder List -->
                <div id="fields-list" class="fields-list">
                    ${activeTpl.fields.map((f, idx) => this.renderFieldItem(f, idx, activeTpl.fields.length)).join('')}
                </div>

                <!-- Add Field Actions -->
                <div class="add-field-actions">
                    <span class="label-tiny">Add new segment:</span>
                    <div class="btn-group-segments">
                        <button class="btn btn-small add-field-btn" data-type="text">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg> Text
                        </button>
                        <button class="btn btn-small add-field-btn" data-type="select">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg> Dropdown
                        </button>
                        <button class="btn btn-small add-field-btn" data-type="date">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Date
                        </button>
                        <button class="btn btn-small add-field-btn" data-type="index">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg> Index
                        </button>
                    </div>
                </div>

                <div class="divider"></div>

                <div class="store-actions">
                    <button id="import-btn" class="btn btn-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Import JSON
                    </button>
                    <button id="export-btn" class="btn btn-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Export JSON
                    </button>
                    <button id="reset-defaults-btn" class="btn btn-secondary danger-action">
                        Reset Defaults
                    </button>
                </div>
            </div>
            
            <input type="file" id="import-file-input" style="display: none;" accept=".json">
        `;

        this.setupLocalEvents();
    }

    renderFieldItem(field, index, totalFields) {
        let typeBadge = '';
        let configHtml = '';

        switch (field.type) {
            case 'text':
                typeBadge = `<span class="badge badge-text">TXT</span>`;
                configHtml = `
                    <input type="text" class="form-input field-placeholder" data-index="${index}" placeholder="Field placeholder..." value="${field.placeholder || ''}" title="Field Placeholder">
                `;
                break;
            case 'select':
                typeBadge = `<span class="badge badge-select">DRP</span>`;
                configHtml = `
                    <input type="text" class="form-input field-options" data-index="${index}" placeholder="Option 1, Option 2, Option 3..." value="${(field.options || []).join(', ')}" title="Comma-separated dropdown options">
                `;
                break;
            case 'date':
                typeBadge = `<span class="badge badge-date">DAT</span>`;
                configHtml = `
                    <select class="form-select field-format" data-index="${index}" title="Date Format">
                        <option value="YYYYMMDD" ${field.format === 'YYYYMMDD' ? 'selected' : ''}>YYYYMMDD (e.g. 20260707)</option>
                        <option value="YYYY-MM-DD" ${field.format === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD (e.g. 2026-07-07)</option>
                        <option value="YYYY" ${field.format === 'YYYY' ? 'selected' : ''}>YYYY (e.g. 2026)</option>
                        <option value="MM-DD" ${field.format === 'MM-DD' ? 'selected' : ''}>MM-DD (e.g. 07-07)</option>
                        <option value="HHMMSS" ${field.format === 'HHMMSS' ? 'selected' : ''}>HHMMSS (e.g. 154812)</option>
                    </select>
                `;
                break;
            case 'index':
                typeBadge = `<span class="badge badge-index">IDX</span>`;
                configHtml = `
                    <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--text-muted);">
                        <span>Digits:</span>
                        <input type="number" 
                               class="form-input field-digits" 
                               data-index="${index}" 
                               min="1" 
                               value="${field.digits !== undefined && field.digits !== 'none' ? field.digits : 0}" 
                               title="Padding digits"
                               style="width: 70px;">
                        <span style="margin-left: 0.5rem;">Increments automatically per file.</span>
                    </div>
                `;
                break;
        }

        return `
            <div class="field-item field-item-${field.type}" data-index="${index}">
                <div class="field-item-top">
                    <div class="field-drag-handle" title="Drag/Reorder (use arrows on right)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
                            <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
                        </svg>
                    </div>
                    ${typeBadge}
                    <input type="text" class="form-input field-label" data-index="${index}" value="${field.label}" placeholder="Segment Label..." title="Segment Label">
                    <div class="field-actions">
                        <button class="btn-field-action move-up-btn" data-index="${index}" ${index === 0 ? 'disabled' : ''} title="Move Up">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                        </button>
                        <button class="btn-field-action move-down-btn" data-index="${index}" ${index === totalFields - 1 ? 'disabled' : ''} title="Move Down">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                        <button class="btn-field-action remove-btn" data-index="${index}" title="Remove Segment">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                    </div>
                </div>
                <div class="field-item-bottom">
                    ${configHtml}
                </div>
            </div>
        `;
    }

    setupGlobalEvents() {
        // Dropdown selection change
        this.container.addEventListener('change', (e) => {
            if (e.target.id === 'template-select') {
                this.store.setActiveTemplate(e.target.value);
                this.render();
                this.onTemplateChange();
            }
        });
    }

    setupLocalEvents() {
        const activeTpl = this.store.getActiveTemplate();
        if (!activeTpl) return;

        // Add Template
        const addTplBtn = document.getElementById('add-tpl-btn');
        if (addTplBtn) {
            addTplBtn.addEventListener('click', () => {
                const name = prompt('Enter a name for your custom template:');
                if (name) {
                    const newTpl = this.store.addTemplate({ name, separator: '_', case: 'none', fields: [] });
                    this.render();
                    this.onTemplateChange();
                }
            });
        }

        // Delete Template
        const deleteTplBtn = document.getElementById('delete-tpl-btn');
        if (deleteTplBtn) {
            deleteTplBtn.addEventListener('click', () => {
                if (confirm(`Are you sure you want to delete "${activeTpl.name}"?`)) {
                    this.store.deleteTemplate(activeTpl.id);
                    this.render();
                    this.onTemplateChange();
                }
            });
        }

        // Share Template
        const shareTplBtn = document.getElementById('share-tpl-btn');
        if (shareTplBtn) {
            shareTplBtn.addEventListener('click', () => {
                const hash = this.store.serializeTemplate(activeTpl);
                const shareUrl = `${window.location.origin}${window.location.pathname}#template=${hash}`;

                navigator.clipboard.writeText(shareUrl).then(() => {
                    alert('Shareable template link copied to clipboard!');
                }).catch(err => {
                    console.error('Could not copy link: ', err);
                    alert(`Share URL: ${shareUrl}`);
                });
            });
        }

        // Rename Template
        const renameTplBtn = document.getElementById('rename-tpl-btn');
        if (renameTplBtn) {
            renameTplBtn.addEventListener('click', () => {
                const name = prompt('Rename template:', activeTpl.name);
                if (name && name.trim()) {
                    this.store.updateTemplate(activeTpl.id, { name: name.trim() });
                    this.render();
                    this.onTemplateChange();
                }
            });
        }

        const separatorSelect = document.getElementById('template-separator');
        if (separatorSelect) {
            separatorSelect.addEventListener('change', (e) => {
                this.store.updateTemplate(activeTpl.id, { separator: e.target.value });
                this.onTemplateChange();
            });
        }

        const caseSelect = document.getElementById('template-case');
        if (caseSelect) {
            caseSelect.addEventListener('change', (e) => {
                this.store.updateTemplate(activeTpl.id, { case: e.target.value });
                this.onTemplateChange();
            });
        }

        // Field modifications
        const fieldsList = document.getElementById('fields-list');
        if (fieldsList) {
            // Drag and Drop reordering
            let draggedItem = null;

            fieldsList.addEventListener('mousedown', (e) => {
                const handle = e.target.closest('.field-drag-handle');
                if (handle) {
                    const item = handle.closest('.field-item');
                    if (item) {
                        item.setAttribute('draggable', 'true');
                    }
                }
            });

            fieldsList.addEventListener('mouseup', () => {
                const items = fieldsList.querySelectorAll('.field-item');
                items.forEach(item => item.removeAttribute('draggable'));
            });

            fieldsList.addEventListener('dragstart', (e) => {
                const item = e.target.closest('.field-item');
                if (!item || item.getAttribute('draggable') !== 'true') {
                    e.preventDefault();
                    return;
                }
                draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.dataset.index);
            });

            fieldsList.addEventListener('dragend', () => {
                draggedItem = null;
                this.render();
            });

            fieldsList.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!draggedItem) return;

                const targetItem = e.target.closest('.field-item');
                if (!targetItem || targetItem === draggedItem) return;

                const rect = targetItem.getBoundingClientRect();
                const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;

                fieldsList.insertBefore(draggedItem, next ? targetItem.nextSibling : targetItem);
            });

            fieldsList.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!draggedItem) return;

                const domItems = Array.from(fieldsList.querySelectorAll('.field-item'));
                const newFields = domItems.map(item => {
                    const originalIndex = parseInt(item.dataset.index);
                    return activeTpl.fields[originalIndex];
                });

                this.store.updateTemplate(activeTpl.id, { fields: newFields });
                this.render();
                this.onTemplateChange();
            });

            // Field Label Input Change
            fieldsList.addEventListener('input', (e) => {
                if (e.target.classList.contains('field-label')) {
                    const idx = parseInt(e.target.dataset.index);
                    const fields = [...activeTpl.fields];
                    fields[idx].label = e.target.value;
                    this.store.updateTemplate(activeTpl.id, { fields });
                    this.onTemplateChange();
                }

                if (e.target.classList.contains('field-placeholder')) {
                    const idx = parseInt(e.target.dataset.index);
                    const fields = [...activeTpl.fields];
                    fields[idx].placeholder = e.target.value;
                    this.store.updateTemplate(activeTpl.id, { fields });
                    this.onTemplateChange();
                }

                if (e.target.classList.contains('field-options')) {
                    const idx = parseInt(e.target.dataset.index);
                    const fields = [...activeTpl.fields];
                    fields[idx].options = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                    this.store.updateTemplate(activeTpl.id, { fields });
                    this.onTemplateChange();
                }

                if (e.target.classList.contains('field-digits')) {
                    const idx = parseInt(e.target.dataset.index);
                    const fields = [...activeTpl.fields];
                    const val = parseInt(e.target.value);
                    fields[idx].digits = isNaN(val) || val <= 0 ? 0 : val;
                    this.store.updateTemplate(activeTpl.id, { fields });
                    this.onTemplateChange();
                }
            });

            // Field Select/Dropdown formats change
            fieldsList.addEventListener('change', (e) => {
                if (e.target.classList.contains('field-format')) {
                    const idx = parseInt(e.target.dataset.index);
                    const fields = [...activeTpl.fields];
                    fields[idx].format = e.target.value;
                    this.store.updateTemplate(activeTpl.id, { fields });
                    this.onTemplateChange();
                }

                if (e.target.classList.contains('field-digits')) {
                    const idx = parseInt(e.target.dataset.index);
                    const fields = [...activeTpl.fields];
                    const val = parseInt(e.target.value);
                    fields[idx].digits = isNaN(val) || val <= 0 ? 0 : val;
                    this.store.updateTemplate(activeTpl.id, { fields });
                    this.onTemplateChange();
                }
            });

            // Field Button Actions (Move Up, Move Down, Remove)
            fieldsList.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-field-action');
                if (!btn) return;

                const idx = parseInt(btn.dataset.index);
                const fields = [...activeTpl.fields];

                if (btn.classList.contains('move-up-btn') && idx > 0) {
                    const temp = fields[idx];
                    fields[idx] = fields[idx - 1];
                    fields[idx - 1] = temp;
                    this.store.updateTemplate(activeTpl.id, { fields });
                    this.render();
                    this.onTemplateChange();
                } else if (btn.classList.contains('move-down-btn') && idx < fields.length - 1) {
                    const temp = fields[idx];
                    fields[idx] = fields[idx + 1];
                    fields[idx + 1] = temp;
                    this.store.updateTemplate(activeTpl.id, { fields });
                    this.render();
                    this.onTemplateChange();
                } else if (btn.classList.contains('remove-btn')) {
                    fields.splice(idx, 1);
                    this.store.updateTemplate(activeTpl.id, { fields });
                    this.render();
                    this.onTemplateChange();
                }
            });
        }

        // Add Field Buttons
        const addFieldBtns = this.container.querySelectorAll('.add-field-btn');
        addFieldBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const fields = [...activeTpl.fields];

                let newField = {
                    id: 'f-' + Math.random().toString(36).substr(2, 5),
                    type,
                    label: type.charAt(0).toUpperCase() + type.slice(1)
                };

                // Add default type configurations
                if (type === 'select') {
                    newField.options = ['ENG', 'DESIGN', 'PM'];
                } else if (type === 'date') {
                    newField.format = 'YYYYMMDD';
                } else if (type === 'index') {
                    newField.digits = 0;
                }

                fields.push(newField);
                this.store.updateTemplate(activeTpl.id, { fields });
                this.render();
                this.onTemplateChange();
            });
        });

        // Reset to Defaults
        const resetBtn = document.getElementById('reset-defaults-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset all templates to default presets? This will lose custom templates.')) {
                    this.store.resetToDefault();
                    this.render();
                    this.onTemplateChange();
                }
            });
        }

        // Export JSON
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeTpl, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `${activeTpl.name.replace(/\s+/g, '_')}_template.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
            });
        }

        // Import JSON
        const importBtn = document.getElementById('import-btn');
        const importFileInput = document.getElementById('import-file-input');
        if (importBtn && importFileInput) {
            importBtn.addEventListener('click', () => {
                importFileInput.click();
            });

            importFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const parsed = JSON.parse(event.target.result);
                        if (!parsed.name || !parsed.fields) {
                            throw new Error('Invalid schema format. Name and fields are required.');
                        }
                        const newTpl = this.store.addTemplate(parsed);
                        this.render();
                        this.onTemplateChange();
                        alert(`Template "${newTpl.name}" imported successfully!`);
                    } catch (err) {
                        alert('Failed to parse JSON file: ' + err.message);
                    }
                };
                reader.readAsText(file);

                // Clear file input
                importFileInput.value = '';
            });
        }
    }
}
