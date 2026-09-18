import { vi, describe, it, expect, beforeEach } from 'vitest';
import { validateKeyConstraint, sanitizePasteConstraint, parseShareHash, getLocalDateString } from '../js/modules/utils.js';

// Regression coverage for the share-link URL format. This exists because the
// original "#t:" delimiter looked reasonable in code review but broke in
// iMessage (a bare colon reads as a URI scheme to its link detector, which
// truncates the link there) — a failure mode no unit test could have caught
// on its own, but the *format contract itself* — which delimiter is current,
// which legacy ones must keep working — can and should be pinned here so a
// future edit can't silently reintroduce it.
describe('parseShareHash', () => {
    it('parses the current "#t=" format', () => {
        expect(parseShareHash('#t=eyJuIjoiVGVzdCJ9')).toBe('eyJuIjoiVGVzdCJ9');
    });

    it('still parses the legacy "#t:" format for previously-shared links', () => {
        expect(parseShareHash('#t:eyJuIjoiVGVzdCJ9')).toBe('eyJuIjoiVGVzdCJ9');
    });

    it('still parses the older legacy "#template=" format', () => {
        expect(parseShareHash('#template=eyJuIjoiVGVzdCJ9')).toBe('eyJuIjoiVGVzdCJ9');
    });

    it('prefers "#t=" over "#t:" when (implausibly) both prefixes could match', () => {
        // "#t=" is checked first, so a value that happens to start with "="
        // right after "#t" is never misread as the legacy colon format.
        expect(parseShareHash('#t=:leadingColonInPayload')).toBe(':leadingColonInPayload');
    });

    it('returns null for a plain hash-less URL', () => {
        expect(parseShareHash('')).toBeNull();
    });

    it('returns null for an unrelated hash', () => {
        expect(parseShareHash('#some-other-section')).toBeNull();
    });

    it('returns an empty string (not null) for "#t=" with no payload', () => {
        // Distinct from "no share link at all" — callers treat this as falsy
        // via `if (hashVal)`, but the parser itself shouldn't conflate the two.
        expect(parseShareHash('#t=')).toBe('');
    });
});

describe('validateKeyConstraint', () => {
    it('does nothing if e.target.dataset.fieldId is missing', () => {
        const event = {
            target: { dataset: {} },
            key: ' ',
            preventDefault: vi.fn()
        };
        validateKeyConstraint(event);
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('allows navigation and control keys', () => {
        const event = {
            target: { dataset: { fieldId: 'f1', noSpaces: 'true' } },
            key: 'Backspace',
            preventDefault: vi.fn()
        };
        validateKeyConstraint(event);
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('prevents space key if noSpaces is true', () => {
        const event = {
            target: { dataset: { fieldId: 'f1', noSpaces: 'true' } },
            key: ' ',
            preventDefault: vi.fn()
        };
        validateKeyConstraint(event);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('allows space key if noSpaces is false', () => {
        const event = {
            target: { dataset: { fieldId: 'f1', noSpaces: 'false' } },
            key: ' ',
            preventDefault: vi.fn()
        };
        validateKeyConstraint(event);
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('prevents underscore key if noUnderscores is true', () => {
        const event = {
            target: { dataset: { fieldId: 'f1', noUnderscores: 'true' } },
            key: '_',
            preventDefault: vi.fn()
        };
        validateKeyConstraint(event);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('validates charType alpha', () => {
        const allowedEvent = {
            target: { dataset: { fieldId: 'f1', charType: 'alpha' } },
            key: 'a',
            preventDefault: vi.fn()
        };
        validateKeyConstraint(allowedEvent);
        expect(allowedEvent.preventDefault).not.toHaveBeenCalled();

        const restrictedEvent = {
            target: { dataset: { fieldId: 'f1', charType: 'alpha' } },
            key: '1',
            preventDefault: vi.fn()
        };
        validateKeyConstraint(restrictedEvent);
        expect(restrictedEvent.preventDefault).toHaveBeenCalled();
    });

    it('validates charType numeric', () => {
        const allowedEvent = {
            target: { dataset: { fieldId: 'f1', charType: 'numeric' } },
            key: '5',
            preventDefault: vi.fn()
        };
        validateKeyConstraint(allowedEvent);
        expect(allowedEvent.preventDefault).not.toHaveBeenCalled();

        const restrictedEvent = {
            target: { dataset: { fieldId: 'f1', charType: 'numeric' } },
            key: 'a',
            preventDefault: vi.fn()
        };
        validateKeyConstraint(restrictedEvent);
        expect(restrictedEvent.preventDefault).toHaveBeenCalled();
    });

    it('validates charType alphanumeric', () => {
        const allowedEvent = {
            target: { dataset: { fieldId: 'f1', charType: 'alphanumeric' } },
            key: 'g',
            preventDefault: vi.fn()
        };
        validateKeyConstraint(allowedEvent);
        expect(allowedEvent.preventDefault).not.toHaveBeenCalled();

        const restrictedEvent = {
            target: { dataset: { fieldId: 'f1', charType: 'alphanumeric' } },
            key: '-',
            preventDefault: vi.fn()
        };
        validateKeyConstraint(restrictedEvent);
        expect(restrictedEvent.preventDefault).toHaveBeenCalled();
    });
});

describe('sanitizePasteConstraint', () => {
    beforeEach(() => {
        global.Event = class Event {
            constructor(type, options) {
                this.type = type;
                this.options = options;
            }
        };
    });

    it('does nothing if e.target.dataset.fieldId is missing', () => {
        const event = {
            target: { dataset: {} },
            clipboardData: { getData: vi.fn().mockReturnValue('abc') },
            preventDefault: vi.fn()
        };
        sanitizePasteConstraint(event);
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('sanitizes spaces and underscores if configured', () => {
        const el = {
            dataset: { fieldId: 'f1', noSpaces: 'true', noUnderscores: 'true' },
            value: 'hello',
            selectionStart: 5,
            selectionEnd: 5,
            dispatchEvent: vi.fn()
        };
        const event = {
            target: el,
            clipboardData: { getData: vi.fn().mockReturnValue('world_wide web') },
            preventDefault: vi.fn()
        };
        sanitizePasteConstraint(event);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(el.value).toBe('helloworldwideweb');
    });

    it('enforces character type sanitization', () => {
        const el = {
            dataset: { fieldId: 'f1', charType: 'numeric' },
            value: 'num',
            selectionStart: 3,
            selectionEnd: 3,
            dispatchEvent: vi.fn()
        };
        const event = {
            target: el,
            clipboardData: { getData: vi.fn().mockReturnValue('123-abc-456') },
            preventDefault: vi.fn()
        };
        sanitizePasteConstraint(event);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(el.value).toBe('num123456');
    });

    it('respects maxLength and trims pasted data', () => {
        const el = {
            dataset: { fieldId: 'f1', maxLength: '8' },
            value: 'abc', // 3 chars
            selectionStart: 3,
            selectionEnd: 3,
            dispatchEvent: vi.fn()
        };
        const event = {
            target: el,
            clipboardData: { getData: vi.fn().mockReturnValue('defghijk') }, // 8 chars, only 5 can fit
            preventDefault: vi.fn()
        };
        sanitizePasteConstraint(event);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(el.value).toBe('abcdefgh');
    });
});

describe('getLocalDateString', () => {
    it('formats a provided date object in local calendar units', () => {
        const d = new Date(2026, 8, 17, 20, 30, 0); // Sept 17, 2026 8:30 PM local
        expect(getLocalDateString(d)).toBe('2026-09-17');
    });

    it('pads single-digit months and days with leading zeroes', () => {
        const d = new Date(2026, 0, 5, 10, 0, 0); // Jan 5, 2026 local
        expect(getLocalDateString(d)).toBe('2026-01-05');
    });

    it('defaults to current local date when called without arguments', () => {
        const now = new Date();
        const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        expect(getLocalDateString()).toBe(expected);
    });
});
