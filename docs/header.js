document.addEventListener('DOMContentLoaded', () => {
    // ---- Theme Toggle Logic ----
    const themeToggle = document.getElementById('theme-toggle');
    const themeStatus = document.getElementById('theme-status');
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
            const currentTheme = localStorage.getItem('theme') || 'dark';
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

    // ---- Mobile Drawer Toggle & Overlay ----
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const pageSidebar = document.querySelector('.page-sidebar');
    const mobileOverlay = document.getElementById('mobile-overlay');

    if (mobileNavToggle && pageSidebar && mobileOverlay) {
        mobileNavToggle.addEventListener('click', () => {
            const isExpanded = mobileNavToggle.getAttribute('aria-expanded') === 'true';
            mobileNavToggle.setAttribute('aria-expanded', !isExpanded);
            
            pageSidebar.classList.toggle('active', !isExpanded);
            mobileOverlay.classList.toggle('active', !isExpanded);

            const menuIcon = mobileNavToggle.querySelector('.menu-icon');
            const closeIcon = mobileNavToggle.querySelector('.close-icon');
            if (menuIcon && closeIcon) {
                menuIcon.style.display = isExpanded ? 'block' : 'none';
                closeIcon.style.display = isExpanded ? 'none' : 'block';
            }
        });

        mobileOverlay.addEventListener('click', () => {
            mobileNavToggle.setAttribute('aria-expanded', 'false');
            pageSidebar.classList.remove('active');
            mobileOverlay.classList.remove('active');

            const menuIcon = mobileNavToggle.querySelector('.menu-icon');
            const closeIcon = mobileNavToggle.querySelector('.close-icon');
            if (menuIcon && closeIcon) {
                menuIcon.style.display = 'block';
                closeIcon.style.display = 'none';
            }
        });
    }

    // Reset drawer state when viewport width expands
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024 && pageSidebar && pageSidebar.classList.contains('active')) {
            pageSidebar.classList.remove('active');
            if (mobileOverlay) mobileOverlay.classList.remove('active');
            if (mobileNavToggle) {
                mobileNavToggle.setAttribute('aria-expanded', 'false');
                const menuIcon = mobileNavToggle.querySelector('.menu-icon');
                const closeIcon = mobileNavToggle.querySelector('.close-icon');
                if (menuIcon) menuIcon.style.display = 'block';
                if (closeIcon) closeIcon.style.display = 'none';
            }
        }
    });

    // ---- Heading Anchor Links copy to Clipboard ----
    const headings = document.querySelectorAll('.page-content h1, .page-content h2, .page-content h3');
    
    function getHeadingId(heading) {
        if (heading.id) return heading.id;

        // Auto-slugify heading contents if ID is missing
        const slug = heading.textContent.toLowerCase().trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_]+/g, '-')
            .replace(/^-+|-+$/g, '');
            
        let uniqueSlug = slug;
        let count = 1;
        while (document.getElementById(uniqueSlug)) {
            uniqueSlug = `${slug}-${count}`;
            count++;
        }

        heading.id = uniqueSlug;
        return uniqueSlug;
    }

    headings.forEach(heading => {
        // Skip title heading
        if (heading.tagName === 'H1' && heading.textContent.trim() === 'User Guide') {
            return;
        }

        const id = getHeadingId(heading);
        if (!id) return;

        const anchor = document.createElement('a');
        anchor.className = 'heading-anchor';
        anchor.href = `#${id}`;
        anchor.setAttribute('aria-label', 'Copy link to this section');

        const linkIconSvg = `
            <svg class="anchor-svg-link" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
        `;

        const checkIconSvg = `
            <svg class="anchor-svg-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none; color: var(--success);">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;

        anchor.innerHTML = linkIconSvg + checkIconSvg;
        heading.appendChild(anchor); // Place at the end of the heading text

        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const url = `${window.location.origin}${window.location.pathname}#${id}`;

            navigator.clipboard.writeText(url).then(() => {
                history.pushState(null, null, `#${id}`);
                heading.scrollIntoView({ behavior: 'smooth' });

                const linkIcon = anchor.querySelector('.anchor-svg-link');
                const checkIcon = anchor.querySelector('.anchor-svg-check');

                if (linkIcon && checkIcon) {
                    linkIcon.style.display = 'none';
                    checkIcon.style.display = 'inline-block';
                    anchor.classList.add('copied');

                    setTimeout(() => {
                        linkIcon.style.display = 'inline-block';
                        checkIcon.style.display = 'none';
                        anchor.classList.remove('copied');
                    }, 2000);
                }
            });
        });
    });
});
