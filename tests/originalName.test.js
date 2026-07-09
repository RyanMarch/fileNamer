import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TemplateStore } from '../js/modules/TemplateStore.js';
import { NamerForm } from '../js/modules/NamerForm.js';

beforeEach(() => {
    const mockElement = {
        innerHTML: '',
        querySelector: vi.fn().mockReturnValue({
            addEventListener: vi.fn(),
            setAttribute: vi.fn(),
            classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
            style: {}
        }),
        addEventListener: vi.fn(),
        style: {}
    };

    global.document = {
        getElementById: vi.fn().mockReturnValue(mockElement)
    };
});

describe('Original Name Segment Evaluation', () => {
    it('should fall back to mock input value if no actual file is provided', () => {
        const store = new TemplateStore();
        const activeTpl = {
            name: 'Original Name Test',
            separator: '_',
            case: 'none',
            fields: [
                { id: 'f-orig', type: 'original-name', label: 'Original Name', origNameMode: 'keep', replaceSpaces: true, truncateLength: '' }
            ]
        };
        const added = store.addTemplate(activeTpl);
        store.setActiveTemplate(added.id);

        const form = new NamerForm('preview-editor-root', store);
        form.valuesCache = {
            'f-orig': 'My Mock File'
        };

        const result = form.generateFilename(0, null, false, null);
        // Space replacement is true by default, so "My Mock File" -> "My_Mock_File"
        expect(result).toBe('My_Mock_File');
    });

    it('should extract base filename without extension when a file name is provided', () => {
        const store = new TemplateStore();
        const activeTpl = {
            name: 'Original Name Test',
            separator: '_',
            case: 'none',
            fields: [
                { id: 'f-orig', type: 'original-name', label: 'Original Name', origNameMode: 'keep', replaceSpaces: true, truncateLength: '' }
            ]
        };
        const added = store.addTemplate(activeTpl);
        store.setActiveTemplate(added.id);

        const form = new NamerForm('preview-editor-root', store);

        const result = form.generateFilename(0, null, false, 'vacation_photo.JPG');
        expect(result).toBe('vacation_photo');
    });

    it('should respect case options (lowercase, uppercase, keep)', () => {
        const store = new TemplateStore();
        const activeTpl = {
            name: 'Original Name Case Test',
            separator: '_',
            case: 'none',
            fields: [
                { id: 'f-orig', type: 'original-name', label: 'Original Name', origNameMode: 'lowercase', replaceSpaces: false, truncateLength: '' }
            ]
        };
        const added = store.addTemplate(activeTpl);
        store.setActiveTemplate(added.id);

        const form = new NamerForm('preview-editor-root', store);

        // Lowercase
        let result = form.generateFilename(0, null, false, 'My-Sample-File.txt');
        expect(result).toBe('my-sample-file');

        // Uppercase
        activeTpl.fields[0].origNameMode = 'uppercase';
        store.updateTemplate(added.id, { fields: activeTpl.fields });
        result = form.generateFilename(0, null, false, 'My-Sample-File.txt');
        expect(result).toBe('MY-SAMPLE-FILE');

        // Keep case
        activeTpl.fields[0].origNameMode = 'keep';
        store.updateTemplate(added.id, { fields: activeTpl.fields });
        result = form.generateFilename(0, null, false, 'My-Sample-File.txt');
        expect(result).toBe('My-Sample-File');
    });

    it('should respect space replacement option', () => {
        const store = new TemplateStore();
        const activeTpl = {
            name: 'Space Replacement Test',
            separator: '-',
            case: 'none',
            fields: [
                { id: 'f-orig', type: 'original-name', label: 'Original Name', origNameMode: 'keep', replaceSpaces: true, truncateLength: '' }
            ]
        };
        const added = store.addTemplate(activeTpl);
        store.setActiveTemplate(added.id);

        const form = new NamerForm('preview-editor-root', store);

        // Space replacement enabled (spaces replaced with separator '-')
        let result = form.generateFilename(0, null, false, 'Summer Vacation Photo.png');
        expect(result).toBe('Summer-Vacation-Photo');

        // Space replacement disabled
        activeTpl.fields[0].replaceSpaces = false;
        store.updateTemplate(added.id, { fields: activeTpl.fields });
        result = form.generateFilename(0, null, false, 'Summer Vacation Photo.png');
        expect(result).toBe('Summer Vacation Photo');
    });

    it('should respect truncation length', () => {
        const store = new TemplateStore();
        const activeTpl = {
            name: 'Truncation Test',
            separator: '_',
            case: 'none',
            fields: [
                { id: 'f-orig', type: 'original-name', label: 'Original Name', origNameMode: 'keep', replaceSpaces: false, truncateLength: 6 }
            ]
        };
        const added = store.addTemplate(activeTpl);
        store.setActiveTemplate(added.id);

        const form = new NamerForm('preview-editor-root', store);

        const result = form.generateFilename(0, null, false, 'VeryLongFilenameHere.pdf');
        expect(result).toBe('VeryLo');
    });
});
