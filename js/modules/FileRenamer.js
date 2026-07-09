/**
 * FileRenamer - Manages file drag-and-drop, files tracking, and batch download logic.
 */

import { escapeHtml } from './utils.js';

export class FileRenamer {
    constructor(containerId, namerForm) {
        this.container = document.getElementById(containerId);
        this.namerForm = namerForm;
        this.files = [];
        this.csvData = [];
        this.viewMode = 'list'; // 'list' or 'grid'

        this.init();
    }

    init() {
        this.render();
        this.setupEvents();
    }

    render() {
        this.container.innerHTML = /*html*/ `
            <div class="renamer-section">
                <h3>Files to Rename</h3>
                
                <div id="dropzone" class="dropzone">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dropzone-icon">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <p class="dropzone-text">Drag & drop files here, or <span class="browse-link">browse files</span></p>
                    <input type="file" id="file-input" class="visually-hidden" multiple>
                </div>

                <div id="files-list-container" class="files-list-container" style="display: none;">
                    <div class="renamer-view-toggle">
                        <span class="renamer-view-title">Files Queue</span>
                        <div class="toggle-buttons">
                            <button id="view-mode-list-btn" class="btn btn-toggle active" type="button">List View</button>
                            <button id="view-mode-grid-btn" class="btn btn-toggle" type="button">Bulk Edit Grid</button>
                        </div>
                    </div>

                    <div id="files-list-header" class="files-list-header">
                        <span>Original Name</span>
                        <span></span>
                        <span>Renamed Output</span>
                    </div>
                    <div id="files-list" class="files-list">
                        <!-- Dropped files list will render here -->
                    </div>
                    
                    <div class="rename-actions">
                        <div class="csv-actions-group">
                            <button id="get-csv-tpl-btn" class="btn btn-secondary" type="button">
                                Get CSV Template
                            </button>
                            <button id="import-csv-btn" class="btn btn-secondary" type="button">
                                Import CSV Data
                            </button>
                            <button id="export-csv-btn" class="btn btn-secondary" type="button">
                                Export Log (CSV)
                            </button>
                        </div>
                        <div class="file-actions-group">
                            <button id="reset-overrides-btn" class="btn btn-secondary" type="button" style="display: none;">Reset Overrides</button>
                            <button id="clear-files-btn" class="btn btn-secondary" type="button">Clear All</button>
                            <button id="rename-execute-btn" class="btn btn-primary" type="button">
                                Rename & Download
                            </button>
                        </div>
                        <input type="file" id="csv-input" class="visually-hidden" accept=".csv">
                    </div>
                </div>
            </div>
        `;

        this.dropzone = this.container.querySelector('#dropzone');
        this.fileInput = this.container.querySelector('#file-input');
        this.filesListContainer = this.container.querySelector('#files-list-container');
        this.filesListHeader = this.container.querySelector('#files-list-header');
        this.filesList = this.container.querySelector('#files-list');
        this.clearBtn = this.container.querySelector('#clear-files-btn');
        this.resetOverridesBtn = this.container.querySelector('#reset-overrides-btn');
        this.executeBtn = this.container.querySelector('#rename-execute-btn');
        this.csvInput = this.container.querySelector('#csv-input');
        this.importCsvBtn = this.container.querySelector('#import-csv-btn');
        this.exportCsvBtn = this.container.querySelector('#export-csv-btn');
        this.getCsvTplBtn = this.container.querySelector('#get-csv-tpl-btn');
        this.listToggleBtn = this.container.querySelector('#view-mode-list-btn');
        this.gridToggleBtn = this.container.querySelector('#view-mode-grid-btn');
    }

    setupEvents() {
        // Open file browser when clicking on the dropzone
        this.dropzone.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            this.addFiles(e.target.files);
            this.fileInput.value = ''; // reset so same files can be chosen again
        });

        // Drag and drop event handlers
        this.dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropzone.classList.add('drag-active');
        });

        ['dragleave', 'dragend'].forEach(evt => {
            this.dropzone.addEventListener(evt, () => {
                this.dropzone.classList.remove('drag-active');
            });
        });

        this.dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropzone.classList.remove('drag-active');
            if (e.dataTransfer.files) {
                this.addFiles(e.dataTransfer.files);
            }
        });

        // Toggle Views
        this.listToggleBtn.addEventListener('click', () => {
            this.viewMode = 'list';
            this.listToggleBtn.classList.add('active');
            this.gridToggleBtn.classList.remove('active');
            this.updateFilesList();

            // Auto exit fullwidth when returning to list view
            const workspaceGrid = document.querySelector('.workspace-grid');
            if (workspaceGrid && workspaceGrid.classList.contains('fullwidth-mode')) {
                workspaceGrid.classList.remove('fullwidth-mode');
                const fullwidthBtn = document.getElementById('toggle-fullwidth-btn');
                if (fullwidthBtn) {
                    fullwidthBtn.textContent = 'Go Fullwidth';
                }
            }
        });

        this.gridToggleBtn.addEventListener('click', () => {
            this.viewMode = 'grid';
            this.gridToggleBtn.classList.add('active');
            this.listToggleBtn.classList.remove('active');
            this.updateFilesList();

            // Auto transition to fullwidth when entering grid view
            const workspaceGrid = document.querySelector('.workspace-grid');
            if (workspaceGrid && !workspaceGrid.classList.contains('fullwidth-mode')) {
                workspaceGrid.classList.add('fullwidth-mode');
                const fullwidthBtn = document.getElementById('toggle-fullwidth-btn');
                if (fullwidthBtn) {
                    fullwidthBtn.textContent = 'Exit Fullwidth';
                }
            }
        });

        // Clear files list
        this.clearBtn.addEventListener('click', () => {
            this.files = [];
            this.csvData = [];
            this.updateFilesList();
        });

        // Reset Overrides
        this.resetOverridesBtn.addEventListener('click', () => {
            this.csvData = this.files.map(() => ({}));
            this.updateFilesList();
        });

        // Execute renaming
        this.executeBtn.addEventListener('click', () => {
            this.executeRename();
        });

        // CSV actions
        this.getCsvTplBtn.addEventListener('click', () => {
            this.handleCSVTemplateDownload();
        });

        this.importCsvBtn.addEventListener('click', () => {
            this.csvInput.click();
        });

        this.csvInput.addEventListener('change', (e) => {
            this.handleCSVImport(e);
        });

        this.exportCsvBtn.addEventListener('click', () => {
            this.handleCSVExport();
        });

        // Keydown validation for table inputs
        this.container.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('table-input') && e.target.dataset.fieldId) {
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
        });

        // Paste validation for table inputs
        this.container.addEventListener('paste', (e) => {
            if (e.target.classList.contains('table-input') && e.target.dataset.fieldId) {
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
        });
    }



    handleCSVTemplateDownload() {
        const activeTpl = this.namerForm.store.getActiveTemplate();
        if (!activeTpl) {
            alert('Please select or create a template first.');
            return;
        }

        const fieldsToMap = activeTpl.fields.filter(f => f.type !== 'extension');
        if (fieldsToMap.length === 0) {
            alert('The active template has no fields to map.');
            return;
        }

        let headers = [];
        let rows = [];

        if (this.files.length > 0) {
            headers = ['Original Filename', ...fieldsToMap.map(field => field.label || field.id)];
            rows = this.files.map((file, idx) => {
                const row = [file.name];
                fieldsToMap.forEach(field => {
                    row.push(this.csvData[idx] && this.csvData[idx][field.id] !== undefined ? this.csvData[idx][field.id] : '');
                });
                return row;
            });
        } else {
            headers = fieldsToMap.map(field => field.label || field.id);
            const sampleRow = fieldsToMap.map(field => {
                if (field.type === 'text') return 'Sample Text';
                if (field.type === 'dropdown' || field.type === 'select') {
                    const options = field.options || [];
                    return options[0] || 'Option 1';
                }
                if (field.type === 'date') return '2026-07-08';
                if (field.type === 'index') return '1';
                return 'Sample Value';
            });
            rows = [sampleRow];
        }

        const csvContent = this.convertToCSV(headers, rows);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const csvName = `${activeTpl.name.replace(/\s+/g, '_')}_template.csv`;

        this.triggerDownload(blob, csvName);
    }

    handleCSVImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result;
                const parsed = this.parseCSV(text);
                if (parsed.length === 0) {
                    throw new Error('CSV is empty.');
                }

                const activeTpl = this.namerForm.store.getActiveTemplate();
                if (!activeTpl) {
                    throw new Error('No active template to map fields.');
                }

                const headers = parsed[0].map(h => h.trim().toLowerCase());
                const fieldMappings = {};

                activeTpl.fields.forEach(field => {
                    const colIdx = headers.indexOf((field.label || '').toLowerCase());
                    if (colIdx !== -1) {
                        fieldMappings[field.id] = colIdx;
                    }
                });

                // Find original filename column
                const origFileColIdx = headers.findIndex(h => h.includes('original filename') || h.includes('original name') || h.includes('filename') || h.includes('file name'));

                if (origFileColIdx !== -1) {
                    // Match by filename!
                    this.csvData = this.files.map(() => ({}));
                    const rows = parsed.slice(1);
                    rows.forEach(row => {
                        const csvFilename = row[origFileColIdx]?.trim();
                        if (!csvFilename) return;
                        const fileIdx = this.files.findIndex(f => f.name.toLowerCase() === csvFilename.toLowerCase());
                        if (fileIdx !== -1) {
                            const rowData = {};
                            activeTpl.fields.forEach(field => {
                                const colIdx = fieldMappings[field.id];
                                if (colIdx !== undefined && row[colIdx] !== undefined) {
                                    rowData[field.id] = row[colIdx].trim();
                                }
                            });
                            this.csvData[fileIdx] = rowData;
                        }
                    });
                } else {
                    // Fall back to index matching
                    const hasHeaderMatch = Object.keys(fieldMappings).length > 0;
                    if (!hasHeaderMatch) {
                        activeTpl.fields.forEach((field, fIdx) => {
                            if (fIdx < headers.length) {
                                fieldMappings[field.id] = fIdx;
                            }
                        });
                    }

                    const rows = parsed.slice(hasHeaderMatch ? 1 : 0);
                    this.csvData = this.files.map((file, idx) => {
                        const row = rows[idx];
                        if (!row) return {};
                        const rowData = {};
                        activeTpl.fields.forEach(field => {
                            const colIdx = fieldMappings[field.id];
                            if (colIdx !== undefined && row[colIdx] !== undefined) {
                                rowData[field.id] = row[colIdx].trim();
                            }
                        });
                        return rowData;
                    });
                }

                this.updateFilesList();
                alert(`Successfully imported CSV data.`);
            } catch (err) {
                alert('Failed to parse CSV: ' + err.message);
            }
        };
        reader.readAsText(file);
        this.csvInput.value = '';
    }

    handleCSVExport() {
        if (this.files.length === 0) return;

        const headers = ['Original Filename', 'Target Filename', 'Size (Bytes)'];
        const activeTpl = this.namerForm.store.getActiveTemplate();
        const rows = this.files.map((file, idx) => {
            const ext = this.getAppliedExtension(file.name, activeTpl);
            const csvRow = this.csvData && this.csvData[idx] ? this.csvData[idx] : null;
            const baseName = this.namerForm.generateFilename(idx, csvRow);
            const targetName = baseName ? `${baseName}${ext}` : file.name;
            return [file.name, targetName, String(file.size)];
        });

        const csvContent = this.convertToCSV(headers, rows);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        const csvName = activeTpl ? `${activeTpl.name.replace(/\s+/g, '_')}_renaming_log.csv` : 'renaming_log.csv';

        this.triggerDownload(blob, csvName);
    }

    parseCSV(text) {
        const lines = [];
        let row = [""];
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    row[row.length - 1] += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                row.push("");
            } else if ((char === '\r' || char === '\n') && !inQuotes) {
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
                lines.push(row);
                row = [""];
            } else {
                row[row.length - 1] += char;
            }
        }
        if (row.length > 1 || row[0] !== "") {
            lines.push(row);
        }
        return lines.filter(r => r.some(cell => cell.trim() !== ""));
    }

    convertToCSV(headers, rows) {
        const escapeVal = val => {
            let str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                str = `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        const headerRow = headers.map(escapeVal).join(',');
        const bodyRows = rows.map(row => row.map(escapeVal).join(','));
        return [headerRow, ...bodyRows].join('\n');
    }

    addFiles(fileList) {
        Array.from(fileList).forEach(file => {
            // Check if file is already added by name and size to prevent duplicates
            const isDuplicate = this.files.some(f => f.name === file.name && f.size === file.size);
            if (!isDuplicate) {
                this.files.push(file);
                this.csvData.push({});
            }
        });
        this.updateFilesList();
    }

    removeFile(index) {
        this.files.splice(index, 1);
        if (this.csvData && this.csvData[index] !== undefined) {
            this.csvData.splice(index, 1);
        }
        this.updateFilesList();
    }

    updateFilesList() {
        if (this.files.length === 0) {
            this.filesListContainer.style.display = 'none';
            return;
        }

        this.filesListContainer.style.display = 'flex';
        const activeTpl = this.namerForm.store.getActiveTemplate();

        // Check if there are overrides to toggle the reset button
        const hasOverrides = this.csvData.some(row => Object.keys(row || {}).length > 0);
        this.resetOverridesBtn.style.display = hasOverrides ? 'inline-block' : 'none';

        if (this.viewMode === 'list') {
            this.filesList.classList.remove('grid-view');
            this.filesListHeader.style.display = 'grid';
            this.filesList.innerHTML = this.files.map((file, idx) => {
                const ext = this.getAppliedExtension(file.name, activeTpl);
                const csvRow = this.csvData && this.csvData[idx] ? this.csvData[idx] : null;
                const baseName = this.namerForm.generateFilename(idx, csvRow);

                let sizeStr = '';
                if (file.size < 1024) sizeStr = `${file.size} B`;
                else if (file.size < 1024 * 1024) sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
                else sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

                const targetName = baseName ? `${baseName}${ext}` : `[incomplete]${ext}`;

                return `
                    <div class="file-row">
                        <div class="file-info-col">
                            <span class="file-name-original" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
                            <span class="file-size-badge">${sizeStr}</span>
                        </div>
                        <div class="file-arrow-col">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="arrow-icon">
                                <line x1="5" y1="12" x2="19" y2="12"/>
                                <polyline points="12 5 19 12 12 19"/>
                            </svg>
                        </div>
                        <div class="file-target-col">
                            <span class="file-name-target" title="${escapeHtml(targetName)}">${escapeHtml(targetName)}</span>
                        </div>
                        <button class="btn-file-remove" data-index="${idx}" title="Remove file" aria-label="Remove file">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                        </button>
                    </div>
                `;
            }).join('');

            // Wire up remove button click handlers
            this.filesList.querySelectorAll('.btn-file-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(btn.dataset.index);
                    this.removeFile(idx);
                });
            });
        } else {
            // Grid view: Render interactive spreadsheet table
            this.filesList.classList.add('grid-view');
            this.filesListHeader.style.display = 'none';

            const fieldsToMap = activeTpl ? activeTpl.fields.filter(f => f.type !== 'extension' && f.type !== 'index') : [];

            const headersHtml = `
                <th>Original File</th>
                ${fieldsToMap.map(f => `<th>${escapeHtml(f.label || f.id)}</th>`).join('')}
                <th>Renamed Output</th>
                <th></th>
            `;

            const rowsHtml = this.files.map((file, idx) => {
                const ext = this.getAppliedExtension(file.name, activeTpl);
                const csvRow = this.csvData && this.csvData[idx] ? this.csvData[idx] : null;
                const baseName = this.namerForm.generateFilename(idx, csvRow);

                let sizeStr = '';
                if (file.size < 1024) sizeStr = `${file.size} B`;
                else if (file.size < 1024 * 1024) sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
                else sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

                const targetName = baseName ? `${baseName}${ext}` : `[incomplete]${ext}`;

                const cellsHtml = fieldsToMap.map(field => {
                    const overrideVal = (this.csvData[idx] && this.csvData[idx][field.id]) ? this.csvData[idx][field.id] : '';
                    const globalVal = this.namerForm.valuesCache[field.id] || '';

                    const noSpacesAttr    = field.noSpaces      ? 'data-no-spaces="true"'      : '';
                    const noUnderAttr     = field.noUnderscores  ? 'data-no-underscores="true"'  : '';
                    const charTypeAttr    = field.charType && field.charType !== 'any' ? `data-char-type="${field.charType}"` : '';
                    const minLenAttr      = field.minLength !== undefined && field.minLength !== '' ? `data-min-length="${field.minLength}"` : '';
                    const maxLenAttr      = field.maxLength !== undefined && field.maxLength !== '' ? `data-max-length="${field.maxLength}" maxlength="${field.maxLength}"` : '';

                    let inputField = '';
                    if (field.type === 'select') {
                        let options = field.options || [];
                        if (field.sortAlphabetically) {
                            options = [...options].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
                        }
                        inputField = `
                            <input type="text"
                                   class="table-input table-select"
                                   data-file-idx="${idx}"
                                   data-field-id="${field.id}"
                                   value="${escapeHtml(overrideVal)}"
                                   placeholder="${escapeHtml(globalVal)}"
                                   ${noSpacesAttr} ${noUnderAttr} ${charTypeAttr} ${minLenAttr} ${maxLenAttr}
                                   list="list-table-${field.id}">
                            <datalist id="list-table-${field.id}">
                                ${options.map(opt => `<option value="${escapeHtml(opt)}"></option>`).join('')}
                            </datalist>
                        `;
                    } else if (field.type === 'date') {
                        const inputType = overrideVal ? 'date' : 'text';
                        inputField = `
                            <input type="${inputType}"
                                   class="table-input table-date"
                                   data-file-idx="${idx}"
                                   data-field-id="${field.id}"
                                   value="${escapeHtml(overrideVal)}"
                                   placeholder="${escapeHtml(globalVal)}"
                                   ${noSpacesAttr} ${noUnderAttr} ${charTypeAttr} ${minLenAttr} ${maxLenAttr}
                                   onfocus="this.type='date'"
                                   onblur="if(!this.value) this.type='text'">
                        `;
                    } else {
                        inputField = `
                            <input type="text"
                                   class="table-input table-text"
                                   data-file-idx="${idx}"
                                   data-field-id="${field.id}"
                                   value="${escapeHtml(overrideVal)}"
                                   placeholder="${escapeHtml(globalVal)}"
                                   ${noSpacesAttr} ${noUnderAttr} ${charTypeAttr} ${minLenAttr} ${maxLenAttr}">
                        `;
                    }
                    return `<td>${inputField}</td>`;
                }).join('');

                return `
                    <tr data-row-idx="${idx}">
                        <td>
                            <div class="table-file-info">
                                <span class="file-name-original" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
                                <span class="file-size-badge">${sizeStr}</span>
                            </div>
                        </td>
                        ${cellsHtml}
                        <td>
                            <span class="file-name-target" title="${escapeHtml(targetName)}">${escapeHtml(targetName)}</span>
                        </td>
                        <td>
                            <button class="btn-file-remove" data-index="${idx}" title="Remove file" aria-label="Remove file">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            this.filesList.innerHTML = `
                <div class="table-responsive">
                    <table class="bulk-edit-table">
                        <thead>
                            <tr>
                                ${headersHtml}
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            `;

            // Wire up input changes for cell overrides
            this.filesList.querySelectorAll('.table-input').forEach(input => {
                input.addEventListener('input', (e) => {
                    const idx = parseInt(e.target.dataset.fileIdx);
                    const fieldId = e.target.dataset.fieldId;
                    const val = e.target.value;

                    // Min length invalid state check
                    if (e.target.dataset.minLength) {
                        const minLen = parseInt(e.target.dataset.minLength);
                        if (val.length > 0 && val.length < minLen) {
                            e.target.classList.add('input-invalid');
                            e.target.title = `Minimum ${minLen} character${minLen !== 1 ? 's' : ''} required`;
                        } else {
                            e.target.classList.remove('input-invalid');
                            e.target.title = '';
                        }
                    }

                    if (!this.csvData[idx]) {
                        this.csvData[idx] = {};
                    }
                    this.csvData[idx][fieldId] = val;

                    // Update target preview dynamically without full re-render
                    const ext = this.getAppliedExtension(this.files[idx].name, activeTpl);
                    const baseName = this.namerForm.generateFilename(idx, this.csvData[idx]);
                    const targetName = baseName ? `${baseName}${ext}` : `[incomplete]${ext}`;

                    const rowEl = e.target.closest('tr');
                    const targetEl = rowEl.querySelector('.file-name-target');
                    targetEl.textContent = targetName;
                    targetEl.title = targetName;

                    // Show or hide the reset overrides button based on current state
                    const curHasOverrides = this.csvData.some(row => Object.keys(row || {}).length > 0);
                    this.resetOverridesBtn.style.display = curHasOverrides ? 'inline-block' : 'none';
                });
            });

            // Wire up remove button click handlers
            this.filesList.querySelectorAll('.btn-file-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(btn.dataset.index);
                    this.removeFile(idx);
                });
            });
        }
    }

    async executeRename() {
        if (this.files.length === 0) return;

        const activeTpl = this.namerForm.store.getActiveTemplate();
        const renames = this.files.map((file, idx) => {
            const ext = this.getAppliedExtension(file.name, activeTpl);
            const csvRow = this.csvData && this.csvData[idx] ? this.csvData[idx] : null;
            const baseName = this.namerForm.generateFilename(idx, csvRow);
            return {
                file: file,
                targetName: baseName ? `${baseName}${ext}` : file.name
            };
        });

        // Check if JSZip is loaded to choose method
        if (window.JSZip) {
            this.downloadAsZip(renames);
        } else {
            this.downloadSequentially(renames);
        }
    }

    async downloadSequentially(renames) {
        const total = renames.length;
        const confirmMsg = `This will trigger ${total} individual file download(s). Your browser may prompt you to allow multiple downloads. Do you want to continue?`;

        if (total > 1 && !confirm(confirmMsg)) {
            return;
        }

        const originalBtnText = this.executeBtn.textContent;
        this.executeBtn.disabled = true;

        for (let i = 0; i < total; i++) {
            this.executeBtn.textContent = `Downloading ${i + 1}/${total}...`;
            const item = renames[i];
            this.triggerDownload(item.file, item.targetName);
            // Throttle downloads to give the browser time to process
            await new Promise(resolve => setTimeout(resolve, 350));
        }

        this.executeBtn.textContent = 'Completed!';
        setTimeout(() => {
            this.executeBtn.textContent = originalBtnText;
            this.executeBtn.disabled = false;
        }, 2000);
    }

    async downloadAsZip(renames) {
        const originalBtnText = this.executeBtn.textContent;
        this.executeBtn.disabled = true;
        this.executeBtn.textContent = 'Zipping...';

        try {
            const zip = new window.JSZip();
            renames.forEach(item => {
                zip.file(item.targetName, item.file);
            });

            const content = await zip.generateAsync({ type: 'blob' });

            // Format zip name based on template or project name
            const activeTpl = this.namerForm.store.getActiveTemplate();
            const zipName = activeTpl ? `${activeTpl.name.replace(/\s+/g, '_')}_renamed.zip` : 'renamed_files.zip';

            this.triggerDownload(content, zipName);

            this.executeBtn.textContent = 'Completed!';
        } catch (e) {
            console.error('Failed to create ZIP package:', e);
            alert('Failed to generate ZIP. Falling back to sequential download.');
            await this.downloadSequentially(renames);
        } finally {
            setTimeout(() => {
                this.executeBtn.textContent = originalBtnText;
                this.executeBtn.disabled = false;
            }, 2000);
        }
    }

    getAppliedExtension(fileName, activeTpl) {
        if (!activeTpl) {
            const dotIdx = fileName.lastIndexOf('.');
            return dotIdx !== -1 ? fileName.slice(dotIdx) : '';
        }

        const extField = activeTpl.fields.find(f => f.type === 'extension');
        if (!extField) {
            return '';
        }

        const extMode = extField.extensionMode || 'keep';
        if (extMode === 'none') {
            return '';
        }

        if (extMode === 'custom') {
            const custom = (extField.customExtension || '').trim();
            if (!custom) return '';
            return custom.startsWith('.') ? custom : `.${custom}`;
        }

        const dotIdx = fileName.lastIndexOf('.');
        let ext = dotIdx !== -1 ? fileName.slice(dotIdx) : '';

        if (extMode === 'lowercase') {
            return ext.toLowerCase();
        } else if (extMode === 'uppercase') {
            return ext.toUpperCase();
        }

        return ext;
    }

    triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
