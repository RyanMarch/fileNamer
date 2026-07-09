import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../js/components.js';

describe('Custom Web Components', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.removeAttribute('data-theme-mode');

        // Mock matchMedia for theme testing
        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
    });

    describe('<design-tip>', () => {
        it('should render correct HTML content when attached to DOM', () => {
            const tip = document.createElement('design-tip');
            document.body.appendChild(tip);

            expect(tip.querySelector('.info-aside')).not.toBeNull();
            expect(tip.querySelector('.aside-badge').textContent).toBe('Design Tip');
            expect(tip.textContent).toContain('FileNamer is designed for complete customization');
        });
    });

    describe('<filenamer-footer>', () => {
        it('should render footer links and active year', () => {
            const footer = document.createElement('filenamer-footer');
            document.body.appendChild(footer);

            expect(footer.querySelector('.page-footer')).not.toBeNull();
            expect(footer.querySelector('#copyright-year').textContent).toBe(String(new Date().getFullYear()));
            
            const ryanLink = footer.querySelector('a[href="https://ryanmarch.me/"]');
            expect(ryanLink).not.toBeNull();
            expect(ryanLink.textContent).toBe('Ryan March');
        });

        it('should initialize theme settings and handle theme toggles correctly', () => {
            const footer = document.createElement('filenamer-footer');
            document.body.appendChild(footer);

            const themeToggle = footer.querySelector('#theme-toggle');
            expect(themeToggle).not.toBeNull();

            // Default theme should be empty initially in localStorage
            expect(localStorage.getItem('theme')).toBeNull();

            // First click: light -> system
            themeToggle.click();
            expect(localStorage.getItem('theme')).toBe('system');
            expect(document.documentElement.getAttribute('data-theme-mode')).toBe('system');

            // Second click: system -> dark
            themeToggle.click();
            expect(localStorage.getItem('theme')).toBe('dark');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
            expect(document.documentElement.getAttribute('data-theme-mode')).toBeNull();

            // Third click: dark -> light
            themeToggle.click();
            expect(localStorage.getItem('theme')).toBe('light');
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
            expect(document.documentElement.getAttribute('data-theme-mode')).toBeNull();
        });
    });
});
