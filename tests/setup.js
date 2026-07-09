import { vi } from 'vitest';

// Implement standard in-memory mock for localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] ?? null),
        setItem: vi.fn((key, value) => {
            store[key] = String(value);
        }),
        removeItem: vi.fn((key) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        key: vi.fn((index) => Object.keys(store)[index] ?? null),
        get length() {
            return Object.keys(store).length;
        }
    };
})();

// Assign to standard global scopes
globalThis.localStorage = localStorageMock;
if (typeof window !== 'undefined') {
    window.localStorage = localStorageMock;
}
