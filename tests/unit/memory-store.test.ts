import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../../src/memory-store.js';

type Entry = { id: string; n: number };

describe('MemoryStore', () => {
    it('round-trips a value through set and get', async () => {
        const store = new MemoryStore<Entry>();
        const value = { id: 'alpha', n: 1 };
        await store.set(value);
        await expect(store.get(value.id)).resolves.toEqual(value);
        await expect(store.has(value.id)).resolves.toBe(true);
    });

    it('returns undefined and false for missing ids', async () => {
        const store = new MemoryStore<Entry>();
        await expect(store.get('missing')).resolves.toBeUndefined();
        await expect(store.has('missing')).resolves.toBe(false);
    });

    it('set overwrites previous values with the same id', async () => {
        const store = new MemoryStore<Entry>();
        await store.set({ id: 'alpha', n: 1 });
        await store.set({ id: 'alpha', n: 2 });
        await expect(store.get('alpha')).resolves.toEqual({ id: 'alpha', n: 2 });
        await expect(store.entries()).resolves.toEqual([{ id: 'alpha', n: 2 }]);
    });

    it('delete removes a value and is a no-op for missing ids', async () => {
        const store = new MemoryStore<Entry>();
        await store.set({ id: 'alpha', n: 1 });
        await store.delete('alpha');
        await expect(store.get('alpha')).resolves.toBeUndefined();
        await expect(store.delete('missing')).resolves.toBeUndefined();
    });

    it('entries returns all values sorted by id', async () => {
        const store = new MemoryStore<Entry>();
        await store.set({ id: 'charlie', n: 3 });
        await store.set({ id: 'alpha', n: 1 });
        await store.set({ id: 'bravo', n: 2 });
        await expect(store.entries()).resolves.toEqual([
            { id: 'alpha', n: 1 },
            { id: 'bravo', n: 2 },
            { id: 'charlie', n: 3 }
        ]);
    });

    it('clear removes all values', async () => {
        const store = new MemoryStore<Entry>();
        await store.set({ id: 'alpha', n: 1 });
        await store.set({ id: 'bravo', n: 2 });
        await store.clear();
        await expect(store.entries()).resolves.toEqual([]);
        await expect(store.has('alpha')).resolves.toBe(false);
    });
});
