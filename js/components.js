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

customElements.define('filenamer-footer', FilenamerFooter);
customElements.define('design-tip', DesignTip);
