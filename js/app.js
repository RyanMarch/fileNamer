/**
 * FileNamer - Main Entry Point
 */

import { TemplateStore } from './modules/TemplateStore.js';
import { TemplateBuilder } from './modules/TemplateBuilder.js';
import { NamerForm } from './modules/NamerForm.js';
import { FileRenamer } from './modules/FileRenamer.js';
import { parseShareHash } from './modules/utils.js';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});


function initApp() {
    const store = new TemplateStore();

    // Check if a template was shared via the URL hash (#t=..., or a legacy
    // format — see parseShareHash), falling back to the older ?template=
    // query param, which has its own "is this an existing preset id?" check.
    let hashVal = parseShareHash(window.location.hash);

    if (hashVal === null) {
        const queryTemplate = new URLSearchParams(window.location.search).get('template');
        if (queryTemplate) {
            if (store.getTemplates().some(t => t.id === queryTemplate)) {
                store.setActiveTemplate(queryTemplate);
            } else {
                hashVal = queryTemplate;
            }
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
