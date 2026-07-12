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

  // Comprehensive mapping of your profile data properties
  const dataProfiles = {
    creative: {
      pattern: '[Client]-[Campaign]-[Asset]-[Size]-v[Num]',
      title: 'FileNamer - Template — Agency Profile'
    },
    media: {
      pattern: 'YYYYMMDD_[Project]_[Camera]_[Take]',
      title: 'FileNamer - Template — Media Profile'
    },
    devops: {
      pattern: '[Service]-[Env]-[Branch]-[BuildNum].tar.gz',
      title: 'FileNamer - Template — Pipeline Profile'
    },
    analytics: {
      pattern: 'YYYY-MM-DD_[Tenant]_[Dataset]_[RunID].csv',
      title: 'FileNamer - Template — Analytics Profile'
    },
    marketing: {
      pattern: 'example.com/?utm_source=[Source]&utm_medium=[Medium]',
      title: 'FileNamer - Template — UTM Parameters'
    }
  };

  // 1. Centralized UI Updates Function
  function updateActiveStudio(targetId) {
    const profile = dataProfiles[targetId];
    if (!profile) return;

    // Update active visual navigation cues
    tabs.forEach(t => {
      const isActive = t.dataset.target === targetId;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Animate and update active target contents
    display.textContent = profile.pattern;
    title.textContent = profile.title;
  }

  // 2. Click Intercept Layer
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      updateActiveStudio(tab.dataset.target);
    });
  });

  // 3. Modern Scroll Tracker Layer (Intersection Observer)
  const observerOptions = {
    root: null,
    rootMargin: '-30% 0px -50% 0px', // Triggers when element crosses the center-screen viewport area
    threshold: 0
  };

  const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        updateActiveStudio(entry.target.dataset.target);
      }
    });
  }, observerOptions);

  // Attach observer to the tabs so they register window context position shifts
  tabs.forEach(tab => scrollObserver.observe(tab));


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

  function init() { initFaqAccordion(); initDemoCard(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

