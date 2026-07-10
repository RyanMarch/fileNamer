/**
 * FileNamer - Main Entry Point
 */

import { TemplateStore } from './modules/TemplateStore.js';
import { TemplateBuilder } from './modules/TemplateBuilder.js';
import { NamerForm } from './modules/NamerForm.js';
import { FileRenamer } from './modules/FileRenamer.js';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});


function initApp() {
    const store = new TemplateStore();

    // Check if shared via URL — three formats supported:
    //   1. #t:VALUE      (primary, no = sign, iMessage-safe)
    //   2. ?template=VALUE  (legacy query param)
    //   3. #template=VALUE  (legacy hash)
    let hashVal = null;
    const hash = window.location.hash;

    if (hash.startsWith('#t:')) {
        hashVal = hash.slice(3);
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        const queryTemplate = urlParams.get('template');
        if (queryTemplate) {
            if (store.getTemplates().some(t => t.id === queryTemplate)) {
                store.setActiveTemplate(queryTemplate);
            } else {
                hashVal = queryTemplate;
            }
        } else if (hash.startsWith('#template=')) {
            hashVal = hash.slice('#template='.length);
        }
    }

    if (hashVal) {
        const imported = store.deserializeTemplate(hashVal);
        if (imported) {
            const added = store.addTemplate(imported);
            store.setActiveTemplate(added.id);
            // Clear URL so bookmarking/reloads don't duplicate
            window.history.replaceState(null, null, window.location.pathname);
        }
    }

    // Initialize modules
    let builder;
    let form;
    let renamer;

    form = new NamerForm('preview-editor-root', store, () => {
        // Callback when form fields change: update renamer target previews
        if (renamer) {
            renamer.updateFilesList();
        }
    });

    builder = new TemplateBuilder('template-editor-root', store, () => {
        // Callback when template config changes
        form.renderForm();
        if (renamer) {
            renamer.updateFilesList();
        }
    });

    // FileRenamer takes container id and the namerForm instance
    renamer = new FileRenamer('dropzone-root', form);

    // Fullwidth Toggle
    const fullwidthBtn = document.getElementById('toggle-fullwidth-btn');
    const workspaceGrid = document.querySelector('.workspace-grid');
    if (fullwidthBtn && workspaceGrid) {
        fullwidthBtn.addEventListener('click', () => {
            const isFull = workspaceGrid.classList.toggle('fullwidth-mode');
            fullwidthBtn.textContent = isFull ? 'Exit Fullwidth' : 'Go Fullwidth';
        });
    }
}
