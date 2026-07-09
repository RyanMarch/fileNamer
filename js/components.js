/**
 * Native HTML Web Components for FileNamer
 */

class FilenamerFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <footer class="page-footer">
                <div class="footer-container">
                    <p class="footer-copyright">&copy; <span id="copyright-year">${new Date().getFullYear()}</span> FileNamer • <a href="https://ryanmarch.me/">Ryan March</a></p>
                    <div class="footer-links">
                        <a href="/app/" class="footer-link">App</a>
                        <a href="/docs/" class="footer-link">Docs</a>
                        <a href="/terms/" class="footer-link footer-terms">Terms</a>
                        <a href="/terms/#privacy-policy" class="footer-link">Privacy</a>
                    </div>
                    <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme">
                        <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="5"></circle>
                            <line x1="12" y1="1" x2="12" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="23"></line>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                            <line x1="1" y1="12" x2="3" y2="12"></line>
                            <line x1="21" y1="12" x2="23" y2="12"></line>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                        </svg>
                        <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                        </svg>
                        <svg class="system-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                        <span id="theme-status" class="theme-status"></span>
                    </button>
                </div>
            </footer>
        `;

        this.initTheme();
    }

    initTheme() {
        const themeToggle = this.querySelector('#theme-toggle');
        const themeStatus = this.querySelector('#theme-status');
        let themeStatusTimeout;

        function showThemeStatus(text) {
            if (!themeStatus) return;
            themeStatus.textContent = text;
            themeStatus.classList.add('visible');
            clearTimeout(themeStatusTimeout);
            themeStatusTimeout = setTimeout(() => { themeStatus.classList.remove('visible'); }, 2000);
        }

        function setTheme(theme) {
            if (theme === 'system') {
                const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                document.documentElement.setAttribute('data-theme-mode', 'system');
            } else {
                document.documentElement.setAttribute('data-theme', theme);
                document.documentElement.removeAttribute('data-theme-mode');
            }
            localStorage.setItem('theme', theme);
        }

        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = localStorage.getItem('theme') || 'light';
                let newTheme = currentTheme === 'dark' ? 'light' : currentTheme === 'light' ? 'system' : 'dark';
                let statusText = newTheme === 'light' ? 'Light Theme' : newTheme === 'system' ? 'System Theme' : 'Dark Theme';

                setTheme(newTheme);
                showThemeStatus(statusText);
            });
        }

        // System theme change listener
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (localStorage.getItem('theme') === 'system') {
                document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            }
        });
    }
}

class DesignTip extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="info-aside">
                <div class="aside-badge">Design Tip</div>
                <p>
                    While these default presets serve as helpful starting points, FileNamer is designed for complete customization. You can adapt, reorder, or build entire naming structures from scratch to match the needs of your exact workflows and file standards.
                </p>
            </div>
        `;
    }
}

class FilenamerUiButton extends HTMLElement {
    connectedCallback() {
        const type = this.getAttribute('type');
        let title = '';
        let svg = '';
        let content = '';

        this.classList.add('doc-btn-inline');
        this.style.display = 'inline-flex';

        switch (type) {
            case 'add':
                title = 'New Custom Template';
                this.setAttribute('title', title);
                svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>`;
                break;
            case 'rename':
                title = 'Rename Active Template';
                this.setAttribute('title', title);
                svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>`;
                break;
            case 'delete':
                title = 'Delete Active Template';
                this.setAttribute('title', title);
                this.classList.add('danger-action');
                svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>`;
                break;
            case 'share':
                title = 'Share Active Template Link';
                this.setAttribute('title', title);
                svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>`;
                break;
            case 'import':
                title = 'Import JSON';
                this.setAttribute('title', title);
                svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>`;
                break;
            case 'export':
                title = 'Export JSON';
                this.setAttribute('title', title);
                svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>`;
                break;
            case 'copy':
                title = 'Copy Preview to Clipboard';
                this.setAttribute('title', title);
                this.classList.add('btn-primary');
                this.style.padding = '0.15rem 0.5rem';
                this.style.alignItems = 'center';
                this.style.gap = '0.25rem';
                this.style.fontSize = '0.8rem';
                this.style.fontWeight = '500';
                this.style.width = 'auto';
                this.style.height = 'auto';
                svg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                content = ' Copy';
                break;
        }

        this.innerHTML = `${svg}${content}`;
    }
}

customElements.define('filenamer-footer', FilenamerFooter);
customElements.define('design-tip', DesignTip);
customElements.define('filenamer-ui-button', FilenamerUiButton);

