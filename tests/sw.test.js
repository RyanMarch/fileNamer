import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Service Worker (sw.js)', () => {
    let listeners = {};
    let mockCache;
    let swCode;

    beforeAll(() => {
        const swPath = path.resolve(__dirname, '../sw.js');
        swCode = fs.readFileSync(swPath, 'utf8');
    });

    beforeEach(() => {
        listeners = {};
        mockCache = {
            addAll: vi.fn().mockResolvedValue(),
        };

        globalThis.self = {
            addEventListener: vi.fn((event, cb) => {
                listeners[event] = cb;
            }),
            skipWaiting: vi.fn(),
            clients: {
                claim: vi.fn().mockResolvedValue(),
            }
        };

        globalThis.caches = {
            open: vi.fn().mockResolvedValue(mockCache),
            keys: vi.fn().mockResolvedValue([]),
            delete: vi.fn().mockResolvedValue(true),
            match: vi.fn().mockResolvedValue(null),
        };

        globalThis.fetch = vi.fn();
    });

    function runServiceWorker() {
        const execute = new Function('self', 'caches', 'fetch', swCode);
        execute(globalThis.self, globalThis.caches, globalThis.fetch);
    }

    it('should register correct event listeners and cache assets on install', async () => {
        runServiceWorker();

        expect(self.addEventListener).toHaveBeenCalledWith('install', expect.any(Function));
        expect(self.addEventListener).toHaveBeenCalledWith('activate', expect.any(Function));
        expect(self.addEventListener).toHaveBeenCalledWith('fetch', expect.any(Function));

        // Simulate install event
        const installEvent = {
            waitUntil: vi.fn((promise) => promise),
        };

        listeners['install'](installEvent);

        expect(self.skipWaiting).toHaveBeenCalled();
        expect(caches.open).toHaveBeenCalledWith(expect.stringMatching(/^fn-maker-cache-/));
        
        await installEvent.waitUntil.mock.results[0].value;
        expect(mockCache.addAll).toHaveBeenCalled();
    });

    it('should clean up old caches on activation', async () => {
        runServiceWorker();

        caches.keys = vi.fn().mockResolvedValue(['old-cache-v1', 'fn-maker-cache-v6']);

        const activateEvent = {
            waitUntil: vi.fn((promise) => promise),
        };

        listeners['activate'](activateEvent);

        await activateEvent.waitUntil.mock.results[0].value;
        expect(caches.delete).toHaveBeenCalledWith('old-cache-v1');
        expect(caches.delete).not.toHaveBeenCalledWith('fn-maker-cache-v6');
        expect(self.clients.claim).toHaveBeenCalled();
    });

    it('should match cache and fallback to network on fetch', async () => {
        runServiceWorker();

        const mockRequest = { url: 'https://example.com/app/index.html' };
        const mockResponse = { status: 200, text: () => Promise.resolve('ok') };
        
        caches.match = vi.fn().mockResolvedValue(mockResponse);

        const fetchEvent = {
            request: mockRequest,
            respondWith: vi.fn((promise) => promise),
        };

        listeners['fetch'](fetchEvent);

        const result = await fetchEvent.respondWith.mock.results[0].value;
        expect(caches.match).toHaveBeenCalledWith(mockRequest);
        expect(result).toBe(mockResponse);
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });
});
