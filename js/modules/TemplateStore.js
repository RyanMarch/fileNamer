/**
 * TemplateStore - Manages saving, loading, importing, exporting, and sharing of filename templates.
 */

export const DEFAULT_TEMPLATES = [
    {
        id: 'tpl-project-files',
        name: 'Project Files',
        separator: '_',
        case: 'none',
        fields: [
            { id: 'f-date', type: 'date', label: 'Date Created', format: 'YYYYMMDD' },
            { id: 'f-proj', type: 'text', label: 'Project Code', placeholder: 'PRJ101' },
            { id: 'f-desc', type: 'text', label: 'Description', placeholder: 'PromoShot' },
            { id: 'f-index', type: 'index', label: 'Index', digits: 2 },
            { id: 'f-ext', type: 'extension', label: 'Extension', extensionMode: 'keep', customExtension: '', includeExtInPreview: true }
        ]
    },
    {
        id: 'tpl-academic',
        name: 'Academic Papers',
        separator: '_',
        case: 'none',
        fields: [
            { id: 'f-author', type: 'text', label: 'Author Surname', placeholder: 'Smith' },
            { id: 'f-year', type: 'text', label: 'Year', placeholder: '2026' },
            { id: 'f-title', type: 'text', label: 'Paper Title', placeholder: 'NeuralNetworks' },
            { id: 'f-ext', type: 'extension', label: 'Extension', extensionMode: 'keep', customExtension: '', includeExtInPreview: true }
        ]
    },
    {
        id: 'tpl-invoice',
        name: 'Invoices / Receipts',
        separator: '-',
        case: 'none',
        fields: [
            { id: 'f-inv-date', type: 'date', label: 'Date', format: 'YYYY-MM-DD' },
            { id: 'f-vendor', type: 'text', label: 'Vendor', placeholder: 'Google' },
            { id: 'f-inv-num', type: 'text', label: 'Invoice Number', placeholder: 'INV-98765' },
            { id: 'f-ext', type: 'extension', label: 'Extension', extensionMode: 'keep', customExtension: '', includeExtInPreview: true }
        ]
    },
    {
        id: 'tpl-utm',
        name: 'UTM Campaign Naming',
        separator: '_',
        case: 'lower',
        fields: [
            { id: 'f-utm-source', type: 'select', label: 'Campaign Source (utm_source)', options: ['google', 'newsletter', 'facebook', 'linkedin', 'partner'] },
            { id: 'f-utm-medium', type: 'select', label: 'Campaign Medium (utm_medium)', options: ['cpc', 'email', 'social', 'affiliate', 'referral'] },
            { id: 'f-utm-campaign', type: 'text', label: 'Campaign Name (utm_campaign)', placeholder: 'spring-launch' },
            { id: 'f-utm-content', type: 'text', label: 'Campaign Content (utm_content)', placeholder: 'button-blue', behavior: 'placeholder' }
        ]
    }
];

export class TemplateStore {
    constructor() {
        this.templates = [];
        this.activeTemplateId = null;
        this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem('fn_templates');
            const activeId = localStorage.getItem('fn_active_template_id');

            if (stored) {
                this.templates = JSON.parse(stored);
                let updated = false;
                DEFAULT_TEMPLATES.forEach(defaultTpl => {
                    if (!this.templates.some(t => t.id === defaultTpl.id)) {
                        this.templates.push(JSON.parse(JSON.stringify(defaultTpl)));
                        updated = true;
                    }
                });
                // Migration: remove extension field from existing tpl-utm if present
                const existingUtmTpl = this.templates.find(t => t.id === 'tpl-utm');
                if (existingUtmTpl) {
                    const extFieldIdx = existingUtmTpl.fields.findIndex(f => f.type === 'extension');
                    if (extFieldIdx !== -1) {
                        existingUtmTpl.fields.splice(extFieldIdx, 1);
                        updated = true;
                    }
                }
                if (updated) {
                    this.saveToStorage();
                }
            } else {
                this.templates = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
                this.saveToStorage();
            }

            if (activeId && this.templates.some(t => t.id === activeId)) {
                this.activeTemplateId = activeId;
            } else if (this.templates.length > 0) {
                this.activeTemplateId = this.templates[0].id;
            }
        } catch (e) {
            console.error('Failed to load templates from localStorage:', e);
            this.templates = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
            this.activeTemplateId = this.templates[0].id;
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('fn_templates', JSON.stringify(this.templates));
            if (this.activeTemplateId) {
                localStorage.setItem('fn_active_template_id', this.activeTemplateId);
            }
        } catch (e) {
            console.error('Failed to save templates to localStorage:', e);
        }
    }

    getTemplates() {
        return this.templates;
    }

    getActiveTemplate() {
        return this.templates.find(t => t.id === this.activeTemplateId) || null;
    }

    setActiveTemplate(id) {
        this.activeTemplateId = id;
        this.saveToStorage();
    }

    addTemplate(template) {
        const newTpl = {
            id: 'tpl-' + Date.now(),
            name: template.name || 'Untitled Template',
            separator: template.separator || '_',
            case: template.case || 'none',
            fields: template.fields || []
        };
        this.templates.push(newTpl);
        this.activeTemplateId = newTpl.id;
        this.saveToStorage();
        return newTpl;
    }

    updateTemplate(id, updatedFields) {
        const idx = this.templates.findIndex(t => t.id === id);
        if (idx !== -1) {
            this.templates[idx] = { ...this.templates[idx], ...updatedFields };
            this.saveToStorage();
            return this.templates[idx];
        }
        return null;
    }

    deleteTemplate(id) {
        this.templates = this.templates.filter(t => t.id !== id);
        if (this.activeTemplateId === id) {
            this.activeTemplateId = this.templates.length > 0 ? this.templates[0].id : null;
        }
        this.saveToStorage();
    }

    resetToDefault() {
        this.templates = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
        this.activeTemplateId = this.templates[0].id;
        this.saveToStorage();
    }

    /**
     * Share template via URL hash base64 encoding.
     */
    serializeTemplate(template) {
        const minimalConfig = {
            n: template.name,
            s: template.separator,
            c: template.case,
            f: template.fields.map(f => {
                const minimalField = { i: f.id, t: f.type, l: f.label };
                if (f.placeholder) minimalField.p = f.placeholder;
                if (f.options) minimalField.o = f.options;
                if (f.format) minimalField.f = f.format;
                if (f.digits) minimalField.d = f.digits;
                if (f.extensionMode) minimalField.em = f.extensionMode;
                if (f.customExtension) minimalField.ce = f.customExtension;
                if (f.includeExtInPreview !== undefined) minimalField.iep = f.includeExtInPreview;
                if (f.description) minimalField.de = f.description;
                if (f.sortAlphabetically) minimalField.sa = f.sortAlphabetically;
                // Restriction fields
                if (f.noSpaces) minimalField.ns = f.noSpaces;
                if (f.noUnderscores) minimalField.nu = f.noUnderscores;
                if (f.charType && f.charType !== 'any') minimalField.ct = f.charType;
                if (f.minLength !== undefined && f.minLength !== '') minimalField.mn = f.minLength;
                if (f.maxLength !== undefined && f.maxLength !== '') minimalField.mx = f.maxLength;
                return minimalField;
            })
        };
        const jsonStr = JSON.stringify(minimalConfig);
        return this.encodeBase64(jsonStr);
    }

    /**
     * Parse template from URL hash.
     */
    deserializeTemplate(hashStr) {
        try {
            const jsonStr = this.decodeBase64(hashStr);
            const data = JSON.parse(jsonStr);
            if (!data.n || !data.f) return null;

            return {
                id: 'shared-' + Date.now(),
                name: data.n,
                separator: data.s || '_',
                case: data.c || 'none',
                fields: data.f.map(f => {
                    const field = { id: f.i || ('f-' + Math.random().toString(36).substr(2, 5)), type: f.t, label: f.l };
                    if (f.p) field.placeholder = f.p;
                    if (f.o) field.options = f.o;
                    if (f.f) field.format = f.f;
                    if (f.d) field.digits = f.d;
                    if (f.em) field.extensionMode = f.em;
                    if (f.ce) field.customExtension = f.ce;
                    if (f.iep !== undefined) field.includeExtInPreview = f.iep;
                    if (f.de) field.description = f.de;
                    if (f.sa) field.sortAlphabetically = f.sa;
                    // Restriction fields
                    if (f.ns) field.noSpaces = f.ns;
                    if (f.nu) field.noUnderscores = f.nu;
                    if (f.ct) field.charType = f.ct;
                    if (f.mn !== undefined) field.minLength = f.mn;
                    if (f.mx !== undefined) field.maxLength = f.mx;
                    return field;
                })
            };
        } catch (e) {
            console.error('Failed to deserialize shared template:', e);
            return null;
        }
    }

    encodeBase64(str) {
        return btoa(unescape(encodeURIComponent(str)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    decodeBase64(str) {
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        return decodeURIComponent(escape(atob(base64)));
    }
}
