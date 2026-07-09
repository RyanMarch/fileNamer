import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateStore } from '../js/modules/TemplateStore.js';
import { NamerForm } from '../js/modules/NamerForm.js';

describe('UTM URL Campaign Builder Logic', () => {
    let store;
    let previewRoot;

    beforeEach(() => {
        document.body.innerHTML = '';
        previewRoot = document.createElement('div');
        previewRoot.id = 'preview-editor-root';
        document.body.appendChild(previewRoot);

        localStorage.clear();
        store = new TemplateStore();
    });

    describe('getQueryParamKey', () => {
        it('should extract parenthesized key names correctly', () => {
            const form = new NamerForm('preview-editor-root', store);
            
            const field = { label: 'Campaign Source (utm_source)' };
            expect(form.getQueryParamKey(field)).toBe('utm_source');

            const field2 = { label: 'Medium (utm_medium)' };
            expect(form.getQueryParamKey(field2)).toBe('utm_medium');
        });

        it('should fallback to sanitizing raw labels to lower_snake_case if parentheses are missing', () => {
            const form = new NamerForm('preview-editor-root', store);
            
            const field = { label: 'Campaign Content' };
            expect(form.getQueryParamKey(field)).toBe('campaign_content');

            const field2 = { label: 'Promo ID!!!' };
            expect(form.getQueryParamKey(field2)).toBe('promo_id');
        });
    });

    describe('generateFilename (UTM URL output)', () => {
        it('should construct a full UTM url with correctly mapped query params', () => {
            // Retrieve default UTM template
            const utmTpl = store.getTemplates().find(t => t.id === 'tpl-utm');
            expect(utmTpl).not.toBeUndefined();
            store.setActiveTemplate(utmTpl.id);

            const form = new NamerForm('preview-editor-root', store);

            // Populate mock values in cache
            form.valuesCache = {
                'f-utm-url': 'ryanmarch.me/blog',
                'f-utm-source': 'newsletter',
                'f-utm-medium': 'email',
                'f-utm-campaign': 'summer_sale',
                'f-utm-content': 'promo_banner'
            };

            const result = form.generateFilename(0, null, false);
            // Protocol prepended, query parameters joined correctly
            expect(result).toBe('https://ryanmarch.me/blog?utm_source=newsletter&utm_medium=email&utm_campaign=summer_sale&utm_content=promo_banner');
        });

        it('should fallback to default host if Destination URL is missing', () => {
            const utmTpl = store.getTemplates().find(t => t.id === 'tpl-utm');
            store.setActiveTemplate(utmTpl.id);

            const form = new NamerForm('preview-editor-root', store);
            form.valuesCache = {
                'f-utm-url': '', // blank URL
                'f-utm-source': 'google'
            };

            const result = form.generateFilename(0, null, false);
            // Should fallback to placeholder URL (https://example.com)
            expect(result).toContain('https://example.com?utm_source=google');
        });
    });
});
