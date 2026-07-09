import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateStore } from '../js/modules/TemplateStore.js';
import { TemplateBuilder } from '../js/modules/TemplateBuilder.js';

describe('TemplateBuilder', () => {
    let container;
    let store;
    let changeCallback;

    beforeEach(() => {
        document.body.innerHTML = '';
        container = document.createElement('div');
        container.id = 'builder-container';
        document.body.appendChild(container);

        localStorage.clear();
        store = new TemplateStore();
        changeCallback = vi.fn();

        // Stub dialog methods directly
        window.prompt = vi.fn().mockReturnValue('My New Template');
        window.confirm = vi.fn().mockReturnValue(true);
    });

    it('should initialize and render default templates', () => {
        const builder = new TemplateBuilder('builder-container', store, changeCallback);
        
        expect(container.querySelector('#template-select')).not.toBeNull();
        expect(container.querySelector('#fields-list')).not.toBeNull();
        
        const fieldItems = container.querySelectorAll('.field-item');
        expect(fieldItems.length).toBeGreaterThan(0);
    });

    it('should trigger callback and update store when a new template is added', () => {
        const builder = new TemplateBuilder('builder-container', store, changeCallback);
        
        const addBtn = container.querySelector('#add-tpl-btn');
        expect(addBtn).not.toBeNull();

        addBtn.click();

        expect(window.prompt).toHaveBeenCalled();
        expect(store.getActiveTemplate().name).toBe('My New Template');
        expect(changeCallback).toHaveBeenCalled();
    });

    it('should update field properties in the store when inputs are modified', () => {
        const builder = new TemplateBuilder('builder-container', store, changeCallback);
        
        const activeTpl = store.getActiveTemplate();
        const initialLabel = activeTpl.fields[0].label;

        const firstLabelInput = container.querySelector(`.field-label[data-index="0"]`);
        expect(firstLabelInput).not.toBeNull();

        // Simulate typing a new label
        firstLabelInput.value = 'New Custom Label';
        firstLabelInput.dispatchEvent(new Event('input', { bubbles: true }));

        const updatedTpl = store.getActiveTemplate();
        expect(updatedTpl.fields[0].label).toBe('New Custom Label');
        expect(changeCallback).toHaveBeenCalled();
    });

    it('should handle adding a new field to the active template', () => {
        const builder = new TemplateBuilder('builder-container', store, changeCallback);
        
        const activeTplBefore = store.getActiveTemplate();
        const initialFieldCount = activeTplBefore.fields.length;

        const addTextFieldBtn = container.querySelector('.add-field-btn[data-type="text"]');
        expect(addTextFieldBtn).not.toBeNull();

        addTextFieldBtn.click();

        const activeTplAfter = store.getActiveTemplate();
        expect(activeTplAfter.fields.length).toBe(initialFieldCount + 1);
        expect(activeTplAfter.fields[initialFieldCount].type).toBe('text');
        expect(changeCallback).toHaveBeenCalled();
    });

    it('should allow removing an existing field from the active template', () => {
        const builder = new TemplateBuilder('builder-container', store, changeCallback);
        
        const activeTplBefore = store.getActiveTemplate();
        const initialFieldCount = activeTplBefore.fields.length;

        // Find the remove button for the first field
        const removeFieldBtn = container.querySelector('.remove-btn[data-index="0"]');
        expect(removeFieldBtn).not.toBeNull();

        removeFieldBtn.click();

        const activeTplAfter = store.getActiveTemplate();
        expect(activeTplAfter.fields.length).toBe(initialFieldCount - 1);
        expect(changeCallback).toHaveBeenCalled();
    });
});
