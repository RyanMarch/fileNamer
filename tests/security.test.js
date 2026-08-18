/**
 * Security tests: verifies that escapeHtml correctly neutralises XSS payloads,
 * and that the TemplateStore deserialization does not blindly accept arbitrary
 * data without mapping through the allowed fields.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { escapeHtml } from '../js/modules/utils.js';
import { TemplateStore } from '../js/modules/TemplateStore.js';
import { NamerForm } from '../js/modules/NamerForm.js';
import { FileRenamer } from '../js/modules/FileRenamer.js';

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------

describe('escapeHtml', () => {
    it('escapes < and > to prevent tag injection', () => {
        expect(escapeHtml('<script>alert(1)</script>')).toBe(
            '&lt;script&gt;alert(1)&lt;/script&gt;'
        );
    });

    it('escapes double quotes to prevent attribute breakout', () => {
        expect(escapeHtml('" onmouseover="alert(1)')).toBe(
            '&quot; onmouseover=&quot;alert(1)'
        );
    });

    it('escapes single quotes to prevent attribute breakout', () => {
        expect(escapeHtml("' onmouseover='alert(1)'")).toBe(
            "&#39; onmouseover=&#39;alert(1)&#39;"
        );
    });

    it('escapes & to prevent HTML entity injection', () => {
        expect(escapeHtml('&amp;')).toBe('&amp;amp;');
    });

    it('returns empty string for null', () => {
        expect(escapeHtml(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
        expect(escapeHtml(undefined)).toBe('');
    });

    it('coerces numbers to string safely', () => {
        expect(escapeHtml(42)).toBe('42');
    });

    it('does not alter safe alphanumeric strings', () => {
        const safe = 'Hello World_2026-07-08';
        expect(escapeHtml(safe)).toBe(safe);
    });

    it('handles an img onerror payload', () => {
        const payload = '<img src=x onerror=alert(document.domain)>';
        expect(escapeHtml(payload)).toBe(
            '&lt;img src=x onerror=alert(document.domain)&gt;'
        );
    });

    it('handles a javascript: URI in an attribute context', () => {
        const payload = 'javascript:alert(1)';
        // escapeHtml does not need to alter this—it is safe as text content.
        // The output should be identical because there are no HTML special chars.
        expect(escapeHtml(payload)).toBe('javascript:alert(1)');
    });
});

// ---------------------------------------------------------------------------
// TemplateStore.deserializeTemplate — shared template URL injection
// ---------------------------------------------------------------------------

describe('TemplateStore.deserializeTemplate', () => {
    // TemplateStore relies on localStorage which is not available in Node/jsdom.
    // Stub it so construction works.
    const localStorageStub = (() => {
        const store = {};
        return {
            getItem: (k) => store[k] ?? null,
            setItem: (k, v) => { store[k] = v; },
            removeItem: (k) => { delete store[k]; },
        };
    })();

    globalThis.localStorage = localStorageStub;

    const ts = new TemplateStore();

    it('returns null for a completely invalid hash', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(ts.deserializeTemplate('!!!not-base64!!!')).toBeNull();
        consoleSpy.mockRestore();
    });

    it('returns null when required fields (n, f) are missing', () => {
        const partial = ts.encodeBase64(JSON.stringify({ s: '_' }));
        expect(ts.deserializeTemplate(partial)).toBeNull();
    });

    it('does not propagate unknown top-level keys from malicious JSON', () => {
        const malicious = {
            n: 'Evil Template',
            s: '_',
            c: 'none',
            f: [],
            __proto__: { polluted: true },    // prototype pollution attempt
            constructor: 'bad',
        };
        const hash = ts.encodeBase64(JSON.stringify(malicious));
        const result = ts.deserializeTemplate(hash);

        expect(result).not.toBeNull();
        // Only the expected keys should be on the result
        expect(result).toHaveProperty('name', 'Evil Template');
        expect(result).not.toHaveProperty('__proto__');
        expect(result).not.toHaveProperty('constructor');
    });

    it('does not execute when field labels contain script payloads', () => {
        const xssTemplate = {
            n: 'XSS Test',
            s: '_',
            c: 'none',
            f: [
                { i: 'f-1', t: 'text', l: '<script>alert("xss")</script>', p: '"><img src=x onerror=alert(1)>' }
            ]
        };
        const hash = ts.encodeBase64(JSON.stringify(xssTemplate));
        const result = ts.deserializeTemplate(hash);

        // deserialization gives back raw strings — that is expected and safe,
        // because escapeHtml handles them at render time.
        // What we verify here is that the object is structurally correct.
        expect(result.fields[0].label).toBe('<script>alert("xss")</script>');
        expect(result.fields[0].placeholder).toBe('"><img src=x onerror=alert(1)>');
        // No error should have been thrown
    });

    it('round-trips a legitimate template via serialize → deserialize', () => {
        const original = {
            id: 'tpl-test',
            name: 'Test Template',
            separator: '-',
            case: 'lower',
            fields: [
                { id: 'f-1', type: 'text', label: 'Project', placeholder: 'PRJ101', description: 'This is a test description' },
                { id: 'f-2', type: 'select', label: 'Department', options: ['ENG', 'PM'], sortAlphabetically: true }
            ]
        };
        const hash = ts.serializeTemplate(original);
        const result = ts.deserializeTemplate(hash);

        expect(result.name).toBe('Test Template');
        expect(result.separator).toBe('-');
        expect(result.case).toBe('lower');
        expect(result.fields).toHaveLength(2);
        expect(result.fields[0].label).toBe('Project');
        expect(result.fields[0].placeholder).toBe('PRJ101');
        expect(result.fields[0].description).toBe('This is a test description');
        expect(result.fields[1].label).toBe('Department');
        expect(result.fields[1].sortAlphabetically).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// FileRenamer.convertToCSV — CSV/formula injection (CWE-1236)
// ---------------------------------------------------------------------------

describe('FileRenamer.convertToCSV', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="dropzone-root"></div>';
    });

    // A leading =, +, -, or @ is interpreted as a formula by Excel/Google Sheets
    // when the CSV is opened, even though the value is a perfectly normal quoted
    // CSV field. Historically this has been used for RCE via Excel DDE payloads.
    const dangerousPrefixes = ['=SUM(1+1)', '+1+1', '-1+1', '@SUM(1+1)', '=cmd|"/c calc"!A1'];

    it.each(dangerousPrefixes)('neutralizes a formula-injection payload: %s', (payload) => {
        const renamer = new FileRenamer('dropzone-root', {});
        const csv = renamer.convertToCSV(['Target Filename'], [[payload]]);
        const dataLine = csv.split('\n')[1];

        // The dangerous leading character must not be the first character written
        expect(/^[=+\-@]/.test(dataLine)).toBe(false);
        // It should instead be neutralized with a leading apostrophe (forces text mode)
        expect(dataLine.startsWith("'") || dataLine.startsWith('"\'')).toBe(true);
    });

    it('leaves ordinary filenames with an internal hyphen untouched', () => {
        const renamer = new FileRenamer('dropzone-root', {});
        const csv = renamer.convertToCSV(['Target Filename'], [['normal-file_2026.txt']]);
        expect(csv).toBe('Target Filename\nnormal-file_2026.txt');
    });

    it('still prefixes a filename that legitimately starts with a hyphen (accepted usability tradeoff)', () => {
        const renamer = new FileRenamer('dropzone-root', {});
        const csv = renamer.convertToCSV(['Target Filename'], [['-backup-2026.txt']]);
        expect(csv).toBe("Target Filename\n'-backup-2026.txt");
    });
});
