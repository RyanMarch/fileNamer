import { vi, describe, it, expect, beforeEach } from 'vitest';
import { validateKeyConstraint, sanitizePasteConstraint } from '../js/modules/utils.js';

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
