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

    // Check if shared via URL hash
    const hash = window.location.hash;
    if (hash.startsWith('#template=')) {
        const hashVal = hash.slice('#template='.length);
        const imported = store.deserializeTemplate(hashVal);
        if (imported) {
            const added = store.addTemplate(imported);
            store.setActiveTemplate(added.id);
            // Clear hash so bookmarking/reloads don't duplicate
            window.history.replaceState(null, null, ' ');
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
