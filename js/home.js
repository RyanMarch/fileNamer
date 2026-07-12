/**
 * home.js
 * Homepage-specific interactions.
 */

(function () {
  'use strict';

  // ── Scrolling use cases ───────────────────────────────────────────────────────────────────────────────

  const tabs = document.querySelectorAll('.workflow-tab');
  const display = document.querySelector('.active-display-pattern');
  const title = document.querySelector('.window-title');

  const dataProfiles = {
    media: {
      pattern: 'YYYYMMDD_[Project]_[Camera]_[Take]',
      title: 'FileNamer - Template — Media Assets',
      color: 'var(--profile-media-color)',
      docsUrl: '/docs/project-files'
    },
    creative: {
      pattern: '[Client]-[Campaign]-[Asset]-[Size]-v[Num]',
      title: 'FileNamer - Template — Agency Files',
      color: 'var(--profile-creative-color)',
      docsUrl: '/docs/project-files'
    },
    devops: {
      pattern: '[Service]-[Env]-[Branch]-[BuildNum].tar.gz',
      title: 'FileNamer - Template — Pipeline Artifacts',
      color: 'var(--profile-devops-color)',
      docsUrl: '/docs/project-files'
    },
    analytics: {
      pattern: 'YYYY-MM-DD_[Tenant]_[Dataset]_[RunID].csv',
      title: 'FileNamer - Template — Analytics Datasets',
      color: 'var(--profile-analytics-color)',
      docsUrl: '/docs/project-files'
    },
    marketing: {
      pattern: '[Campaign]_[Channel]_[Source]_[Medium]',
      title: 'FileNamer - Template — Marketing URLs',
      color: 'var(--profile-marketing-color)',
      docsUrl: '/docs/utm-builder/'
    }
  };

  function updateActiveStudio(targetId) {
    const profile = dataProfiles[targetId];
    if (!profile) return;

    // Toggle Nav States
    tabs.forEach(t => {
      const isActive = t.dataset.target === targetId;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');

      // MOBILE INJECTION LAYER
      if (window.innerWidth <= 820) {
        let drawer = t.querySelector('.mobile-pattern-drawer');
        if (!drawer) {
          drawer = document.createElement('div');
          drawer.className = 'mobile-pattern-drawer';
          t.appendChild(drawer);
        }

        if (isActive) {
          drawer.innerHTML = /*html*/ `
            <div class="mobile-capsule-container" style="width: 100%; box-sizing: border-box; overflow: hidden; text-align: center;">
              <div class="active-display-pattern" style="display: inline-block; white-space: nowrap; max-width: 100%; box-sizing: border-box; width: auto;">
                ${profile.pattern}
              </div>
            </div>
            <a href="${profile.docsUrl}" class="gallery-card-link" style="display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem; margin-top: 1rem; text-decoration: none; font-size: 0.85rem; color: var(--dynamic-accent); width: 100%; box-sizing: border-box;">
              Explore the docs
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6h10M7 2l4 4-4 4"/></svg>
            </a>
          `;

          const patternElement = drawer.querySelector('.active-display-pattern');
          if (patternElement) {
            const calculatedSize = Math.min(14, Math.max(8, 400 / profile.pattern.length));
            patternElement.style.fontSize = `${calculatedSize}px`;
          }
        } else {
          drawer.innerHTML = '';
        }
      }
    });

    // DESKTOP INJECTION LAYER
    if (display) display.textContent = profile.pattern;
    if (title) title.textContent = profile.title;

    let desktopDocsLink = document.getElementById('desktop-workflow-docs-link');
    if (desktopDocsLink) {
      desktopDocsLink.setAttribute('href', profile.docsUrl);
      desktopDocsLink.style.color = profile.color;
    }

    document.documentElement.style.setProperty('--dynamic-accent', profile.color);
  }

  // 2. Click Intercept Layer
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      updateActiveStudio(tab.dataset.target);
    });
  });

  // 3. Pixel-Perfect Midpoint Scroll Tracker
  let scrollTimeout;

  window.addEventListener('scroll', () => {
    // Debounce slightly to ensure smooth performance during heavy scrolling
    cancelAnimationFrame(scrollTimeout);

    scrollTimeout = requestAnimationFrame(() => {
      const viewportCenter = window.innerHeight / 2;
      let closestTab = null;
      let minDistance = Infinity;

      tabs.forEach(tab => {
        const rect = tab.getBoundingClientRect();
        // Calculate the exact center point of the current tab element
        const tabCenter = rect.top + (rect.height / 2);
        const distanceToCenter = Math.abs(viewportCenter - tabCenter);

        // Track which tab is closest to the physical center of the screen
        if (distanceToCenter < minDistance) {
          minDistance = distanceToCenter;
          closestTab = tab;
        }
      });

      // Trigger the update cleanly only when a new closest element claims the center
      if (closestTab && !closestTab.classList.contains('active')) {
        updateActiveStudio(closestTab.dataset.target);
      }
    });
  });


  // ── FAQ Accordion ──────────────────────────────────────────────────────────

  function initFaqAccordion() {
    const accordion = document.querySelector('.faq-accordion');
    if (!accordion) return;
    accordion.addEventListener('click', function (e) {
      const btn = e.target.closest('.faq-question');
      if (!btn) return;
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      const answer = document.getElementById(btn.getAttribute('aria-controls'));
      if (!answer) return;
      btn.setAttribute('aria-expanded', String(!isOpen));
      answer.hidden = isOpen;
      btn.classList.toggle('is-open', !isOpen);
    });
  }

  // ── Demo Card Row Cycler ───────────────────────────────────────────────────

  function initDemoCard() {
    const rows = document.querySelectorAll('.demo-filename-row');
    const overlay = document.querySelector('.demo-card-success-overlay');
    if (!rows.length) return;

    let i = 0;

    function activate(row) {
      const code = row.querySelector('.demo-filename-text');
      const badge = row.querySelector('.demo-filename-badge');
      if (!code) return;

      code.textContent = row.dataset.target || code.textContent;
      if (badge) badge.style.opacity = '1';
    }

    function deactivate(row) {
      row.classList.remove('active');
    }

    function runPipelineStep() {
      // 1. Process the active row item
      rows[i].classList.add('active');
      activate(rows[i]);

      // 2. Schedule the next action
      setTimeout(function () {
        deactivate(rows[i]);

        // If there are more files left in this pass, jump to next row immediately
        if (i < rows.length - 1) {
          i++;
          runPipelineStep();
        } else {
          // WE HIT THE END: Trigger the master completion sequence
          triggerSuccessCelebration();
        }
      }, 500); // Your fast-paced row step duration
    }

    function triggerSuccessCelebration() {
      // Reveal the big green checkmark overlay panel
      if (overlay) overlay.classList.add('visible');

      // Hold the checkmark on screen for 2.5 seconds
      setTimeout(function () {
        // Begin global fade-out of badges, names, and overlay panel
        if (overlay) overlay.classList.remove('visible');

        rows.forEach(function (row) {
          const code = row.querySelector('.demo-filename-text');
          const badge = row.querySelector('.demo-filename-badge');

          // Softly drop opacity back to idle state before resetting strings
          if (code) code.style.opacity = '0';
          if (badge) badge.style.opacity = '0';
        });

        // Wait 400ms for the soft fade-out transition to finish completely
        setTimeout(function () {
          // Hard reset layout contents underneath back to original strings
          rows.forEach(function (row) {
            const code = row.querySelector('.demo-filename-text');
            if (code) {
              code.textContent = row.dataset.original || code.textContent;
              code.style.opacity = ''; // Restore default idle opacity
            }
          });

          // Loop back to the very first item and start fresh!
          i = 0;
          runPipelineStep();
        }, 400);

      }, 3000); // Success screen hold duration
    }

    // Kickstart the engine on boot
    setTimeout(function () {
      runPipelineStep();
    }, 1500);
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function init() {
    initFaqAccordion();
    initDemoCard();
    const activeTab = document.querySelector('.workflow-tab.active');
    if (activeTab) {
      updateActiveStudio(activeTab.dataset.target);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

