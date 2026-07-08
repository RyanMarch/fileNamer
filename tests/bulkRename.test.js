import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TemplateStore } from '../js/modules/TemplateStore.js';
import { NamerForm } from '../js/modules/NamerForm.js';
import { FileRenamer } from '../js/modules/FileRenamer.js';

// Setup Mock DOM
beforeEach(() => {
    const mockElement = {
        innerHTML: '',
        querySelector: vi.fn((selector) => {
            return {
                addEventListener: vi.fn(),
                setAttribute: vi.fn(),
                removeAttribute: vi.fn(),
                classList: {
                    add: vi.fn(),
                    remove: vi.fn(),
                    toggle: vi.fn()
                },
                style: {},
                querySelector: vi.fn(),
                querySelectorAll: vi.fn().mockReturnValue([])
            };
        }),
        querySelectorAll: vi.fn().mockReturnValue([]),
        addEventListener: vi.fn(),
        style: {}
    };

    global.document = {
        getElementById: vi.fn().mockReturnValue(mockElement)
    };

    global.window = {
        matchMedia: vi.fn().mockReturnValue({
            matches: false,
            addEventListener: vi.fn()
        }),
        location: { hash: '' },
        history: { replaceState: vi.fn() },
        JSZip: null
    };

    global.Blob = class Blob {
        constructor(content, options) {
            this.content = content;
            this.options = options;
        }
    };
    global.URL = {
        createObjectURL: vi.fn().mockReturnValue('mock-url'),
        revokeObjectURL: vi.fn()
    };
    global.alert = vi.fn();
});

describe('Bulk Filename Override Defaulting', () => {
    it('should generate filename using overrides and fallback to global values if empty', () => {
        const store = new TemplateStore();
        const activeTpl = {
            name: 'Client Template',
            separator: '_',
            case: 'none',
            fields: [
                { id: 'f1', type: 'text', label: 'Client', behavior: 'default', placeholder: 'GlobalClient' },
                { id: 'f2', type: 'text', label: 'Project', behavior: 'default', placeholder: 'GlobalProject' }
            ]
        };
        const added = store.addTemplate(activeTpl);
        store.setActiveTemplate(added.id);

        const form = new NamerForm('preview-editor-root', store);
        form.valuesCache = {
            f1: 'GlobalClient',
            f2: 'GlobalProject'
        };

        // Case 1: No overrides (defaults to global cache values)
        const name1 = form.generateFilename(0, null);
        expect(name1).toBe('GlobalClient_GlobalProject');

        // Case 2: Full override
        const name2 = form.generateFilename(0, { f1: 'OverrideClient', f2: 'OverrideProject' });
        expect(name2).toBe('OverrideClient_OverrideProject');

        // Case 3: Partial override (empty value should fallback to global cache value)
        const name3 = form.generateFilename(0, { f1: 'OverrideClient', f2: '' });
        expect(name3).toBe('OverrideClient_GlobalProject');
    });
});

describe('FileRenamer CSV Handling & Target Matching', () => {
    it('should match imported CSV rows by filename if column is present', () => {
        const store = new TemplateStore();
        const activeTpl = {
            name: 'Doc Template',
            separator: '-',
            case: 'none',
            fields: [
                { id: 'f1', type: 'text', label: 'Vendor' },
                { id: 'f2', type: 'text', label: 'Invoice' }
            ]
        };
        const added = store.addTemplate(activeTpl);
        store.setActiveTemplate(added.id);

        const form = new NamerForm('preview-editor-root', store);
        const renamer = new FileRenamer('dropzone-root', form);

        // Add 2 mock files
        renamer.files = [
            { name: 'documentA.pdf', size: 100 },
            { name: 'documentB.png', size: 200 }
        ];
        renamer.csvData = [{}, {}];

        // Mock CSV string with "Original Filename" matching out-of-order files
        const csvText = [
            'Original Filename,Vendor,Invoice',
            'documentB.png,Acme,456',
            'documentA.pdf,Beta,123'
        ].join('\n');

        const parsed = renamer.parseCSV(csvText);
        expect(parsed).toEqual([
            ['Original Filename', 'Vendor', 'Invoice'],
            ['documentB.png', 'Acme', '456'],
            ['documentA.pdf', 'Beta', '123']
        ]);

        const activeTplResolved = store.getActiveTemplate();
        // Simulating the logic from handleCSVImport
        const headers = parsed[0].map(h => h.trim().toLowerCase());
        const fieldMappings = {};
        activeTplResolved.fields.forEach(field => {
            const colIdx = headers.indexOf(field.label.toLowerCase());
            if (colIdx !== -1) {
                fieldMappings[field.id] = colIdx;
            }
        });
        const origFileColIdx = headers.findIndex(h => h.includes('original filename'));

        expect(origFileColIdx).toBe(0);
        expect(fieldMappings).toEqual({ f1: 1, f2: 2 });

        // Apply matching by filename
        renamer.csvData = renamer.files.map(() => ({}));
        const rows = parsed.slice(1);
        rows.forEach(row => {
            const csvFilename = row[origFileColIdx]?.trim();
            const fileIdx = renamer.files.findIndex(f => f.name.toLowerCase() === csvFilename.toLowerCase());
            if (fileIdx !== -1) {
                const rowData = {};
                activeTplResolved.fields.forEach(field => {
                    const colIdx = fieldMappings[field.id];
                    if (colIdx !== undefined && row[colIdx] !== undefined) {
                        rowData[field.id] = row[colIdx].trim();
                    }
                });
                renamer.csvData[fileIdx] = rowData;
            }
        });

        // Verify that documentA.pdf correctly mapped Acme/456 vs Beta/123 out-of-order
        expect(renamer.csvData[0]).toEqual({ f1: 'Beta', f2: '123' }); // documentA.pdf
        expect(renamer.csvData[1]).toEqual({ f1: 'Acme', f2: '456' }); // documentB.png
    });

    it('should fallback to index matching if Original Filename is not found', () => {
        const store = new TemplateStore();
        const activeTpl = {
            name: 'Doc Template',
            separator: '-',
            case: 'none',
            fields: [
                { id: 'f1', type: 'text', label: 'Vendor' },
                { id: 'f2', type: 'text', label: 'Invoice' }
            ]
        };
        const added = store.addTemplate(activeTpl);
        store.setActiveTemplate(added.id);

        const form = new NamerForm('preview-editor-root', store);
        const renamer = new FileRenamer('dropzone-root', form);

        renamer.files = [
            { name: 'documentA.pdf', size: 100 },
            { name: 'documentB.png', size: 200 }
        ];

        // CSV without "Original Filename" column
        const csvText = [
            'Vendor,Invoice',
            'Acme,456',
            'Beta,123'
        ].join('\n');

        const parsed = renamer.parseCSV(csvText);
        const headers = parsed[0].map(h => h.trim().toLowerCase());
        const fieldMappings = {};
        const activeTplResolved = store.getActiveTemplate();
        activeTplResolved.fields.forEach(field => {
            const colIdx = headers.indexOf(field.label.toLowerCase());
            if (colIdx !== -1) {
                fieldMappings[field.id] = colIdx;
            }
        });
        const origFileColIdx = headers.findIndex(h => h.includes('original filename'));

        expect(origFileColIdx).toBe(-1);

        const rows = parsed.slice(1);
        renamer.csvData = renamer.files.map((file, idx) => {
            const row = rows[idx];
            if (!row) return {};
            const rowData = {};
            activeTplResolved.fields.forEach(field => {
                const colIdx = fieldMappings[field.id];
                if (colIdx !== undefined && row[colIdx] !== undefined) {
                    rowData[field.id] = row[colIdx].trim();
                }
            });
            return rowData;
        });

        // Verify index-based matching (row 0 to file 0, row 1 to file 1)
        expect(renamer.csvData[0]).toEqual({ f1: 'Acme', f2: '456' });
        expect(renamer.csvData[1]).toEqual({ f1: 'Beta', f2: '123' });
    });
});
