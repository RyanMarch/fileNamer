/**
 * Custom Native Web Components for reusable helpdocs layout
 */

// Helper to extract word stem for robust search matching
function stemWord(word) {
    let stemmed = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (stemmed.endsWith('ing')) stemmed = stemmed.slice(0, -3);
    else if (stemmed.endsWith('ed')) stemmed = stemmed.slice(0, -2);
    else if (stemmed.endsWith('es')) stemmed = stemmed.slice(0, -2);
    else if (stemmed.endsWith('s') && !stemmed.endsWith('ss')) stemmed = stemmed.slice(0, -1);
    
    if (stemmed.endsWith('e')) stemmed = stemmed.slice(0, -1);
    return stemmed;
}

// Check if target text matches the query using word stems
function stemMatch(targetText, queryText) {
    const queryStems = queryText.split(/\s+/).map(stemWord).filter(Boolean);
    const targetWords = targetText.split(/\s+/).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean);

    if (queryStems.length === 0) return false;

    // Return true if every query word stem matches at least one word in the target text
    return queryStems.every(qStem => {
        return targetWords.some(tWord => {
            const tStem = stemWord(tWord);
            return tWord.startsWith(qStem) || tStem.startsWith(qStem) || qStem.startsWith(tStem);
        });
    });
}

// Automatically update category labels on cards on load if any static ones remain
function updateCardCategories() {
    // Left empty since CATEGORY_MAP is deprecated and cards are dynamically rendered.
}

class DocsHeader extends HTMLElement {
    constructor() {
        super();
        this.index = null;
        this.isLoading = false;
    }

    connectedCallback() {
        this.style.display = 'contents';
        const appUrl = this.getAttribute('app-url') || (this.isSubpage() ? '../../app/' : '../app/');
        const docsUrl = this.getAttribute('docs-url') || (this.isSubpage() ? '../index.html' : 'index.html');
        const showLogo = this.getAttribute('show-logo') !== 'false';

        this.innerHTML = `
            <div class="header-search-backdrop"></div>
            <header class="app-header">
                ${showLogo ? `
                <a href="/" class="header-logo" style="text-decoration: none;">
                    <filenamer-logo></filenamer-logo>
                    <h1>FileNamer</h1>
                </a>
                ` : ''}
                <div class="header-actions">
                    <div class="header-nav" aria-label="Main Navigation">
                        <a href="${appUrl}" class="nav-link">App</a>
                        <a href="${docsUrl}" class="nav-link active">Docs</a>
                    </div>
                    
                    <div class="header-search-container">
                        <input type="search" class="header-search-input" placeholder="Search guides..." aria-label="Search guides" autocomplete="off" />
                        <button class="header-search-button" aria-label="Search">
                            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </button>
                        <div class="header-search-dropdown" style="display: none;"></div>
                    </div>

                    <button id="mobile-nav-toggle" class="mobile-nav-toggle" aria-label="Toggle navigation menu" aria-expanded="false">
                        <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                        <svg class="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </header>
        `;

        this.setupMobileNav();
        this.setupSearch();
    }

    isSubpage() {
        const path = window.location.pathname;
        return /\/docs\/[^\/]+\//.test(path) || (!path.endsWith('/docs/') && path.split('/docs/')[1]?.length > 0 && path.split('/docs/')[1].includes('/'));
    }

    async loadIndex() {
        if (this.index || this.isLoading) return;
        this.isLoading = true;

        try {
            const basePath = this.isSubpage() ? '../' : '';
            const response = await fetch(`${basePath}search-index.json`);
            if (response.ok) {
                this.index = await response.json();
            }
        } catch (e) {
            console.error('Failed to load search index:', e);
        } finally {
            this.isLoading = false;
        }
    }

    setupSearch() {
        const container = this.querySelector('.header-search-container');
        const input = this.querySelector('.header-search-input');
        const button = this.querySelector('.header-search-button');
        const dropdown = this.querySelector('.header-search-dropdown');
        const backdrop = this.querySelector('.header-search-backdrop');
        let selectedIndex = -1;

        if (!container || !input || !button || !dropdown || !backdrop) return;

        const openSearch = () => {
            container.classList.add('active');
            backdrop.classList.add('active');
            input.focus();
            this.loadIndex();
        };

        const closeSearch = () => {
            container.classList.remove('active');
            backdrop.classList.remove('active');
            dropdown.style.display = 'none';
            selectedIndex = -1;
        };

        // Toggle expand/collapse when clicking the magnifying glass button
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = container.classList.contains('active');
            if (!isActive) {
                openSearch();
            } else {
                // If it is already active and contains text, clear it or close it
                if (input.value.trim().length > 0) {
                    input.value = '';
                    dropdown.style.display = 'none';
                    dropdown.innerHTML = '';
                    selectedIndex = -1;
                    input.focus();
                } else {
                    closeSearch();
                }
            }
        });

        // Load index when input gets focused
        input.addEventListener('focus', () => {
            container.classList.add('active');
            backdrop.classList.add('active');
            this.loadIndex();
            if (input.value.trim().length > 0) {
                dropdown.style.display = 'block';
            }
        });

        // Close dropdown & collapse search when clicking outside
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target) && e.target !== backdrop) {
                closeSearch();
            }
        });

        // Click on backdrop closes search
        backdrop.addEventListener('click', () => {
            closeSearch();
        });

        // Keydown shortcut '/' to focus search
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && document.activeElement !== input && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                // Only trigger if no main page search input exists or is visible
                const pageSearchInput = document.querySelector('.docs-search-wrapper .search-input');
                if (!pageSearchInput || !document.body.contains(pageSearchInput)) {
                    e.preventDefault();
                    openSearch();
                }
            }
        });

        // Search logic
        input.addEventListener('input', () => {
            const query = input.value.trim().toLowerCase();
            if (!query) {
                dropdown.style.display = 'none';
                dropdown.innerHTML = '';
                selectedIndex = -1;
                return;
            }

            if (!this.index) {
                dropdown.innerHTML = '<div class="search-status">Loading search...</div>';
                dropdown.style.display = 'block';
                return;
            }

            const results = this.index
                .map(item => {
                    const titleLower = item.title.toLowerCase();
                    const category = item.category || 'Guides';
                    const categoryLower = category.toLowerCase();

                    let score = 0;
                    if (titleLower === query) {
                        score += 100;
                    } else if (titleLower.startsWith(query)) {
                        score += 80;
                    } else if (titleLower.includes(query)) {
                        score += 50;
                    } else if (stemMatch(item.title, query)) {
                        score += 35;
                    }

                    if (categoryLower.includes(query)) {
                        score += 20;
                    }
                    if (item.headings.some(h => h.toLowerCase().includes(query))) {
                        score += 10;
                    } else if (item.headings.some(h => stemMatch(h, query))) {
                        score += 6;
                    }
                    if (item.excerpt.toLowerCase().includes(query)) {
                        score += 5;
                    } else if (item.excerpt.toLowerCase().includes(query) || stemMatch(item.excerpt, query)) {
                        score += 3;
                    }
                    return { item, score };
                })
                .filter(res => res.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(res => res.item);

            const basePath = this.isSubpage() ? '../' : '';
            let html = '';
            if (results.length === 0) {
                html += '<div class="search-status">No results found</div>';
            } else {
                html += results.map((item, idx) => {
                    const matchingHeadings = item.headings
                        .filter(h => h.toLowerCase().includes(query))
                        .slice(0, 2);

                    const headingSnippet = matchingHeadings.length > 0
                        ? `<div class="result-heading-match">Matches: ${matchingHeadings.map(h => `<span class="heading-tag">${h}</span>`).join(', ')}</div>`
                        : '';

                    return `
                        <a href="${basePath}${item.path}" class="search-result-item" data-index="${idx}">
                            <div class="result-title">${item.title}</div>
                            <div class="result-category">${item.category || 'Guides'}</div>
                            <div class="result-excerpt">${item.excerpt}</div>
                            ${headingSnippet}
                        </a>
                    `;
                }).join('');
            }

            // Append the Full Search option
            html += `
                <a href="${basePath}list.html?q=${encodeURIComponent(query)}" class="search-result-item full-search-row" data-index="${results.length}">
                    <div class="result-title">Full Search</div>
                    <div class="result-excerpt">See all results matching "${query}"</div>
                </a>
            `;
            dropdown.innerHTML = html;

            dropdown.style.display = 'block';
            selectedIndex = -1;
        });

        // Key navigation (ArrowUp, ArrowDown, Enter, Escape)
        input.addEventListener('keydown', (e) => {
            const items = dropdown.querySelectorAll('.search-result-item');
            if (e.key === 'Escape') {
                closeSearch();
                input.blur();
                return;
            }

            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                this.updateSelection(items, selectedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                this.updateSelection(items, selectedIndex);
            } else if (e.key === 'Enter') {
                if (selectedIndex >= 0 && selectedIndex < items.length) {
                    e.preventDefault();
                    window.location.href = items[selectedIndex].href;
                }
            }
        });
    }

    updateSelection(items, index) {
        items.forEach((item, idx) => {
            if (idx === index) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    setupMobileNav() {
        const mobileNavToggle = this.querySelector('#mobile-nav-toggle');
        // Delay selector query slightly to ensure DOM has rendered
        setTimeout(() => {
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
        }, 50);

        // Reset drawer state when viewport width expands
        window.addEventListener('resize', () => {
            const pageSidebar = document.querySelector('.page-sidebar');
            const mobileOverlay = document.getElementById('mobile-overlay');
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
    }
}

class DocsSidebar extends HTMLElement {
    connectedCallback() {
        this.style.display = 'contents';
        const appUrl = this.getAttribute('app-url') || (this.isSubpage() ? '../../app/' : '../app/');
        const prefix = this.isSubpage() ? '../' : './';

        this.innerHTML = `
            <nav class="page-sidebar" aria-label="Documentation sections">
                <div class="sidebar-logo">
                    <a href="/" class="logo-link"
                        style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none; color: var(--accent); margin-bottom: 1.5rem;">
                        <filenamer-logo style="width: 1.85rem; height: 1.85rem; flex-shrink: 0;"></filenamer-logo>
                        <span
                            style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 700; color: var(--text-main); letter-spacing: -0.025em;">FileNamer</span>
                    </a>
                </div>
                <ul class="sidebar-menu-list">
                    <li><a href="${prefix}index.html" class="sidebar-link">← Help Center</a></li>
                </ul>
                <div class="sidebar-footer">
                    <div class="cta-card">
                        <div class="cta-card-icon">
                            <filenamer-logo></filenamer-logo>
                        </div>
                        <h4 class="cta-card-title">FileNamer</h4>
                        <p class="cta-card-desc">Design custom schemas, test with live previews, and batch rename local
                            files safely in-browser.</p>
                        <a href="${appUrl}" class="btn-cta-generator">
                            <span>Go to FileNamer</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14"
                                height="14">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </a>
                    </div>
                </div>
            </nav>
        `;

        this.highlightActiveLink();
    }

    isSubpage() {
        const path = window.location.pathname;
        return /\/docs\/[^\/]+\//.test(path) || (!path.endsWith('/docs/') && path.split('/docs/')[1]?.length > 0 && path.split('/docs/')[1].includes('/'));
    }

    highlightActiveLink() {
        const currentHash = window.location.hash;

        // Insert category badge above the h1 in the content area
        const h1 = document.querySelector('.page-content h1');
        if (h1 && !document.querySelector('.doc-page-category')) {
            const basePath = this.isSubpage() ? '../' : '';
            fetch(`${basePath}search-index.json`)
                .then(r => r.json())
                .then(index => {
                    const currentPath = window.location.pathname;
                    const match = index.find(item => currentPath.endsWith(item.path) || item.path.includes(currentPath.split('/docs/')[1]));
                    const category = match ? match.category : 'Guides';

                    const categoryEl = document.createElement('a');
                    categoryEl.className = 'doc-page-category';
                    categoryEl.href = `${basePath}list.html?category=${encodeURIComponent(category)}`;
                    categoryEl.textContent = category;
                    h1.parentNode.insertBefore(categoryEl, h1);
                })
                .catch(e => console.error(e));
        }

        // Generate dynamic section links for the current page
        setTimeout(() => {
            const menuList = this.querySelector('.sidebar-menu-list');
            if (menuList) {
                // Add Overview link if #overview exists
                if (document.getElementById('overview')) {
                    const overviewLi = document.createElement('li');
                    const overviewLink = document.createElement('a');
                    overviewLink.href = '#overview';
                    overviewLink.className = 'sidebar-link';
                    overviewLink.textContent = 'Overview';
                    if (currentHash === '#overview' || !currentHash) {
                        overviewLink.classList.add('active');
                    }
                    overviewLi.appendChild(overviewLink);
                    menuList.appendChild(overviewLi);
                }

                const headings = Array.from(document.querySelectorAll('.page-content h2, .page-content h3'));
                let currentH2Li = null;
                let currentSublist = null;

                headings.forEach(heading => {
                    let id = heading.id;
                    if (!id) {
                        id = heading.textContent.toLowerCase().trim()
                            .replace(/[^\w\s-]/g, '')
                            .replace(/[\s_]+/g, '-')
                            .replace(/^-+|-+$/g, '');
                        heading.id = id;
                    }

                    const cloned = heading.cloneNode(true);
                    const anchor = cloned.querySelector('.heading-anchor');
                    if (anchor) {
                        anchor.remove();
                    }
                    const text = cloned.textContent.trim();

                    if (heading.tagName === 'H2') {
                        currentH2Li = document.createElement('li');
                        const link = document.createElement('a');
                        link.href = `#${id}`;
                        link.className = 'sidebar-link';
                        link.textContent = text;

                        if (currentHash === `#${id}`) {
                            link.classList.add('active');
                        }

                        currentH2Li.appendChild(link);
                        menuList.appendChild(currentH2Li);
                        currentSublist = null;
                    } else if (heading.tagName === 'H3' && currentH2Li) {
                        if (!currentSublist) {
                            currentSublist = document.createElement('ul');
                            currentSublist.className = 'sidebar-sublist';
                            currentH2Li.appendChild(currentSublist);
                        }
                        const subLi = document.createElement('li');
                        const subLink = document.createElement('a');
                        subLink.href = `#${id}`;
                        subLink.className = 'sidebar-link sub-link';
                        subLink.textContent = text;

                        if (currentHash === `#${id}`) {
                            subLink.classList.add('active');
                        }

                        subLi.appendChild(subLink);
                        currentSublist.appendChild(subLi);
                    }
                });
            }

            this.setupScrollSpy();
        }, 50);
    }

    setupScrollSpy() {
        const links = Array.from(this.querySelectorAll('.sidebar-link')).filter(l => l.getAttribute('href')?.startsWith('#'));
        if (links.length === 0) return;

        const targets = links.map(link => {
            const id = link.getAttribute('href').substring(1);
            return document.getElementById(id);
        }).filter(Boolean);

        if (targets.length === 0) return;

        const visibleTargets = new Map();

        const observerOptions = {
            root: null,
            rootMargin: '-10% 0px -55% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                visibleTargets.set(entry.target, entry.isIntersecting);
            });

            // Find the first target that is currently intersecting
            const activeTarget = targets.find(target => visibleTargets.get(target));

            if (activeTarget) {
                const activeId = activeTarget.getAttribute('id');
                links.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${activeId}`);
                });
            } else if (window.scrollY < 100 && links.length > 0) {
                // Default to highlighting the first link (e.g. Overview) when scrolled to the top
                links.forEach((link, idx) => {
                    link.classList.toggle('active', idx === 0);
                });
            }
        }, observerOptions);

        targets.forEach(target => observer.observe(target));
    }
}

class DocsAnchorHelper extends HTMLElement {
    connectedCallback() {
        this.style.display = 'contents';
        const headings = this.querySelectorAll('h1, h2, h3');

        function getHeadingId(heading) {
            if (heading.id) return heading.id;

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
            if (heading.tagName === 'H1' && heading.textContent.trim() === 'User Guide') {
                return;
            }

            const id = getHeadingId(heading);
            if (!id) return;

            if (heading.querySelector('.heading-anchor')) return;

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
            heading.appendChild(anchor);

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
    }
}

customElements.define('docs-header', DocsHeader);
customElements.define('docs-sidebar', DocsSidebar);
customElements.define('docs-anchor-helper', DocsAnchorHelper);

class DocsSearch extends HTMLElement {
    constructor() {
        super();
        this.index = null;
        this.isLoading = false;
    }

    connectedCallback() {
        this.style.display = 'contents';
        this.innerHTML = `
            <div class="docs-search-wrapper">
                <div class="search-input-container">
                    <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="search" class="search-input" placeholder="Search guides... (press '/' to focus)" aria-label="Search guides" autocomplete="off" />
                    <kbd class="search-kbd">/</kbd>
                </div>
                <div class="search-dropdown" style="display: none;"></div>
            </div>
        `;

        this.setupSearch();
    }

    isSubpage() {
        const path = window.location.pathname;
        return /\/docs\/[^\/]+\//.test(path) || (!path.endsWith('/docs/') && path.split('/docs/')[1]?.length > 0 && path.split('/docs/')[1].includes('/'));
    }

    async loadIndex() {
        if (this.index || this.isLoading) return;
        this.isLoading = true;

        try {
            const basePath = this.isSubpage() ? '../' : '';
            const response = await fetch(`${basePath}search-index.json`);
            if (response.ok) {
                this.index = await response.json();
            }
        } catch (e) {
            console.error('Failed to load search index:', e);
        } finally {
            this.isLoading = false;
        }
    }

    setupSearch() {
        const input = this.querySelector('.search-input');
        const dropdown = this.querySelector('.search-dropdown');
        let selectedIndex = -1;

        if (!input || !dropdown) return;

        // Focus input on shortcut '/'
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && document.activeElement !== input && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                e.preventDefault();
                input.focus();
            }
        });

        // Load index when input is focused
        input.addEventListener('focus', () => {
            this.loadIndex();
            if (input.value.trim().length > 0) {
                dropdown.style.display = 'block';
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.contains(e.target)) {
                dropdown.style.display = 'none';
                selectedIndex = -1;
            }
        });

        input.addEventListener('input', () => {
            const query = input.value.trim().toLowerCase();
            if (!query) {
                dropdown.style.display = 'none';
                dropdown.innerHTML = '';
                selectedIndex = -1;
                return;
            }

            if (!this.index) {
                dropdown.innerHTML = '<div class="search-status">Loading search...</div>';
                dropdown.style.display = 'block';
                return;
            }

            const results = this.index
                .map(item => {
                    const titleLower = item.title.toLowerCase();
                    const category = item.category || 'Guides';
                    const categoryLower = category.toLowerCase();

                    let score = 0;
                    if (titleLower === query) {
                        score += 100;
                    } else if (titleLower.startsWith(query)) {
                        score += 80;
                    } else if (titleLower.includes(query)) {
                        score += 50;
                    } else if (stemMatch(item.title, query)) {
                        score += 35;
                    }

                    if (categoryLower.includes(query)) {
                        score += 20;
                    }
                    if (item.headings.some(h => h.toLowerCase().includes(query))) {
                        score += 10;
                    } else if (item.headings.some(h => stemMatch(h, query))) {
                        score += 6;
                    }
                    if (item.excerpt.toLowerCase().includes(query)) {
                        score += 5;
                    } else if (item.excerpt.toLowerCase().includes(query) || stemMatch(item.excerpt, query)) {
                        score += 3;
                    }
                    return { item, score };
                })
                .filter(res => res.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(res => res.item);

            const basePath = this.isSubpage() ? '../' : '';
            let html = '';
            if (results.length === 0) {
                html += '<div class="search-status">No results found</div>';
            } else {
                html += results.map((item, idx) => {
                    const matchingHeadings = item.headings
                        .filter(h => h.toLowerCase().includes(query))
                        .slice(0, 2);

                    const headingSnippet = matchingHeadings.length > 0
                        ? `<div class="result-heading-match">Matches: ${matchingHeadings.map(h => `<span class="heading-tag">${h}</span>`).join(', ')}</div>`
                        : '';

                    return `
                        <a href="${basePath}${item.path}" class="search-result-item" data-index="${idx}">
                            <div class="result-title">${item.title}</div>
                            <div class="result-category">${item.category || 'Guides'}</div>
                            <div class="result-excerpt">${item.excerpt}</div>
                            ${headingSnippet}
                        </a>
                    `;
                }).join('');
            }

            // Append the Full Search option
            html += `
                <a href="${basePath}list.html?q=${encodeURIComponent(query)}" class="search-result-item full-search-row" data-index="${results.length}">
                    <div class="result-title">Full Search</div>
                    <div class="result-excerpt">See all results matching "${query}"</div>
                </a>
            `;
            dropdown.innerHTML = html;

            dropdown.style.display = 'block';
            selectedIndex = -1;
        });

        // Key navigation
        input.addEventListener('keydown', (e) => {
            const items = dropdown.querySelectorAll('.search-result-item');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                this.updateSelection(items, selectedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                this.updateSelection(items, selectedIndex);
            } else if (e.key === 'Enter') {
                if (selectedIndex >= 0 && selectedIndex < items.length) {
                    e.preventDefault();
                    items[selectedIndex].click();
                }
            } else if (e.key === 'Escape') {
                dropdown.style.display = 'none';
                selectedIndex = -1;
                input.blur();
            }
        });
    }

    updateSelection(items, index) {
        items.forEach((item, idx) => {
            if (idx === index) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }
}

customElements.define('docs-search', DocsSearch);

class DocsGrid extends HTMLElement {
    connectedCallback() {
        this.style.display = 'contents';
        this.render();
    }
    async render() {
        const isSubpage = /\/docs\/[^\/]+\//.test(window.location.pathname);
        const basePath = isSubpage ? '../' : '';
        try {
            const response = await fetch(`${basePath}search-index.json`);
            if (!response.ok) throw new Error('Failed to load search-index.json');
            let items = await response.json();
            
            // Filter by specific IDs if attribute is present
            const idsAttr = this.getAttribute('ids');
            if (idsAttr) {
                const allowedIds = idsAttr.split(',').map(id => id.trim().toLowerCase());
                items = items.filter(item => {
                    const docId = item.id || item.path.split('/')[0];
                    return allowedIds.includes(docId.toLowerCase());
                });
            }
            
            this.innerHTML = `
                <div class="docs-grid">
                    ${items.map(item => `
                        <a href="${basePath}${item.path}" class="docs-card">
                            <div class="docs-card-category">${item.category || 'Guides'}</div>
                            <h3 class="docs-card-title">${item.title}</h3>
                            <p class="docs-card-desc">${item.excerpt}</p>
                            <span class="docs-card-link">
                                Read Guide
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                    <polyline points="12 5 19 12 12 19"></polyline>
                                </svg>
                            </span>
                        </a>
                    `).join('')}
                </div>
            `;
        } catch (e) {
            this.innerHTML = `<div class="error">Failed to load guides.</div>`;
            console.error(e);
        }
    }
}
customElements.define('docs-grid', DocsGrid);
