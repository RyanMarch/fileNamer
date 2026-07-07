/**
 * FileRenamer - Manages file drag-and-drop, files tracking, and batch download logic.
 */

export class FileRenamer {
    constructor(containerId, namerForm) {
        this.container = document.getElementById(containerId);
        this.namerForm = namerForm;
        this.files = [];
        this.csvData = [];

        this.init();
    }

    init() {
        this.render();
        this.setupEvents();
    }

    render() {
        this.container.innerHTML = `
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
                    <div class="files-list-header">
                        <span>Original Name</span>
                        <span></span>
                        <span>Renamed Output</span>
                    </div>
                    <div id="files-list" class="files-list">
                        <!-- Dropped files list will render here -->
                    </div>
                    
                    <div class="rename-actions">
                        <button id="import-csv-btn" class="btn btn-secondary" type="button">
                            Import CSV Data
                        </button>
                        <button id="export-csv-btn" class="btn btn-secondary" type="button">
                            Export Log (CSV)
                        </button>
                        <button id="clear-files-btn" class="btn btn-secondary" type="button">Clear All</button>
                        <button id="rename-execute-btn" class="btn btn-primary" type="button">
                            Rename & Download
                        </button>
                        <input type="file" id="csv-input" class="visually-hidden" accept=".csv">
                    </div>
                </div>
            </div>
        `;

        this.dropzone = this.container.querySelector('#dropzone');
        this.fileInput = this.container.querySelector('#file-input');
        this.filesListContainer = this.container.querySelector('#files-list-container');
        this.filesList = this.container.querySelector('#files-list');
        this.clearBtn = this.container.querySelector('#clear-files-btn');
        this.executeBtn = this.container.querySelector('#rename-execute-btn');
        this.csvInput = this.container.querySelector('#csv-input');
        this.importCsvBtn = this.container.querySelector('#import-csv-btn');
        this.exportCsvBtn = this.container.querySelector('#export-csv-btn');
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

        // Clear files list
        this.clearBtn.addEventListener('click', () => {
            this.files = [];
            this.csvData = [];
            this.updateFilesList();
        });

        // Execute renaming
        this.executeBtn.addEventListener('click', () => {
            this.executeRename();
        });

        // CSV actions
        this.importCsvBtn.addEventListener('click', () => {
            this.csvInput.click();
        });

        this.csvInput.addEventListener('change', (e) => {
            this.handleCSVImport(e);
        });

        this.exportCsvBtn.addEventListener('click', () => {
            this.handleCSVExport();
        });
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
                    const colIdx = headers.indexOf(field.label.toLowerCase());
                    if (colIdx !== -1) {
                        fieldMappings[field.id] = colIdx;
                    }
                });

                const hasHeaderMatch = Object.keys(fieldMappings).length > 0;
                if (!hasHeaderMatch) {
                    activeTpl.fields.forEach((field, fIdx) => {
                        if (fIdx < headers.length) {
                            fieldMappings[field.id] = fIdx;
                        }
                    });
                }

                const rows = parsed.slice(hasHeaderMatch ? 1 : 0);
                this.csvData = rows.map(row => {
                    const rowData = {};
                    activeTpl.fields.forEach(field => {
                        const colIdx = fieldMappings[field.id];
                        if (colIdx !== undefined && row[colIdx] !== undefined) {
                            rowData[field.id] = row[colIdx].trim();
                        }
                    });
                    return rowData;
                });

                this.updateFilesList();
                alert(`Successfully imported CSV data for ${this.csvData.length} row(s).`);
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
        const rows = this.files.map((file, idx) => {
            const dotIdx = file.name.lastIndexOf('.');
            const ext = dotIdx !== -1 ? file.name.slice(dotIdx) : '';
            const csvRow = this.csvData && this.csvData[idx] ? this.csvData[idx] : null;
            const baseName = this.namerForm.generateFilename(idx, csvRow);
            const targetName = baseName ? `${baseName}${ext}` : file.name;
            return [file.name, targetName, String(file.size)];
        });

        const csvContent = this.convertToCSV(headers, rows);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const activeTpl = this.namerForm.store.getActiveTemplate();
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
            }
        });
        this.updateFilesList();
    }

    removeFile(index) {
        this.files.splice(index, 1);
        this.updateFilesList();
    }

    updateFilesList() {
        if (this.files.length === 0) {
            this.filesListContainer.style.display = 'none';
            return;
        }

        this.filesListContainer.style.display = 'flex';
        this.filesList.innerHTML = this.files.map((file, idx) => {
            const dotIdx = file.name.lastIndexOf('.');
            const ext = dotIdx !== -1 ? file.name.slice(dotIdx) : '';
            const csvRow = this.csvData && this.csvData[idx] ? this.csvData[idx] : null;
            const baseName = this.namerForm.generateFilename(idx, csvRow);
            
            // Format size for user
            let sizeStr = '';
            if (file.size < 1024) sizeStr = `${file.size} B`;
            else if (file.size < 1024 * 1024) sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
            else sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

            const targetName = baseName ? `${baseName}${ext}` : `[incomplete]${ext}`;

            return `
                <div class="file-row">
                    <div class="file-info-col">
                        <span class="file-name-original" title="${file.name}">${file.name}</span>
                        <span class="file-size-badge">${sizeStr}</span>
                    </div>
                    <div class="file-arrow-col">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="arrow-icon">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                            <polyline points="12 5 19 12 12 19"/>
                        </svg>
                    </div>
                    <div class="file-target-col">
                        <span class="file-name-target" title="${targetName}">${targetName}</span>
                    </div>
                    <button class="btn-file-remove" data-index="${idx}" title="Remove file" aria-label="Remove file">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
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
    }

    async executeRename() {
        if (this.files.length === 0) return;

        // Build array of new filenames
        const renames = this.files.map((file, idx) => {
            const dotIdx = file.name.lastIndexOf('.');
            const ext = dotIdx !== -1 ? file.name.slice(dotIdx) : '';
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
