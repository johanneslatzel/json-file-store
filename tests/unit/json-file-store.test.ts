import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JsonFileStore } from '../../src/json-file-store.js';

type Entry = { id: string; n: number };

describe('JsonFileStore', () => {
    let root: string;

    beforeEach(async () => {
        root = await mkdtemp(join(tmpdir(), 'json-file-store-'));
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    it('exposes the configured directory as location', () => {
        const store = new JsonFileStore<Entry>({ dir: join(root, 'here') });
        expect(store.location).toBe(join(root, 'here'));
    });

    it('rejects an empty dir option', () => {
        expect(() => new JsonFileStore<Entry>({ dir: '' })).toThrow('dir must not be empty');
    });

    it('round-trips a value through set and get', async () => {
        const store = new JsonFileStore<Entry>({ dir: join(root, 'here') });
        const value = { id: randomUUID(), n: 1 };
        await store.set(value);
        await expect(store.get(value.id)).resolves.toEqual(value);
        await expect(store.has(value.id)).resolves.toBe(true);
    });

    it('returns undefined and false for missing ids', async () => {
        const store = new JsonFileStore<Entry>({ dir: join(root, 'here') });
        const id = randomUUID();
        await expect(store.get(id)).resolves.toBeUndefined();
        await expect(store.has(id)).resolves.toBe(false);
    });

    it('set overwrites previous values with the same id', async () => {
        const store = new JsonFileStore<Entry>({ dir: join(root, 'here') });
        const id = randomUUID();
        await store.set({ id, n: 1 });
        await store.set({ id, n: 2 });
        await expect(store.get(id)).resolves.toEqual({ id, n: 2 });
    });

    it('set creates the directory recursively and leaves only id files', async () => {
        const nested = join(root, 'a', 'b');
        const store = new JsonFileStore<Entry>({ dir: nested });
        const value = { id: randomUUID(), n: 1 };
        await store.set(value);
        await expect(store.get(value.id)).resolves.toEqual(value);
        await expect(readdir(nested)).resolves.toEqual([value.id + '.json']);
    });

    it('delete removes a value and is a no-op for missing ids', async () => {
        const store = new JsonFileStore<Entry>({ dir: join(root, 'here') });
        const id = randomUUID();
        await store.set({ id, n: 1 });
        await store.delete(id);
        await expect(store.get(id)).resolves.toBeUndefined();
        await expect(store.delete(id)).resolves.toBeUndefined();
    });

    it('entries returns all values sorted by id and ignores other files', async () => {
        const store = new JsonFileStore<Entry>({ dir: root });
        await writeFile(join(root, 'notes.txt'), 'ignore me', 'utf-8');
        await mkdir(join(root, 'sub.dir'));
        const a = { id: 'alpha', n: 1 };
        const b = { id: 'bravo', n: 2 };
        const c = { id: 'charlie', n: 3 };
        await store.set(b);
        await store.set(c);
        await store.set(a);
        const expected = [a, b, c].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
        await expect(store.entries()).resolves.toEqual(expected);
    });

    it('entries returns an empty list for a missing directory', async () => {
        const store = new JsonFileStore<Entry>({ dir: join(root, 'nowhere') });
        await expect(store.entries()).resolves.toEqual([]);
    });

    it('throws on corrupt files', async () => {
        const store = new JsonFileStore<Entry>({ dir: root });
        const badId = randomUUID();
        await writeFile(join(root, badId + '.json'), '{not json', 'utf-8');
        await expect(store.get(badId)).rejects.toThrow();
        await expect(store.entries()).rejects.toThrow();
    });

    it('get rethrows non-ENOENT read errors (directory as value file)', async () => {
        const store = new JsonFileStore<Entry>({ dir: root });
        const id = randomUUID();
        await mkdir(join(root, id + '.json'));
        await expect(store.get(id)).rejects.toThrow();
    });

    it('clear removes all values and tolerates missing and empty directories', async () => {
        const store = new JsonFileStore<Entry>({ dir: join(root, 'here') });
        await store.set({ id: randomUUID(), n: 1 });
        await store.set({ id: randomUUID(), n: 2 });
        await store.clear();
        await expect(store.entries()).resolves.toEqual([]);
        await new JsonFileStore<Entry>({ dir: join(root, 'empty') }).clear();
        await mkdir(join(root, 'emptydir'));
        await new JsonFileStore<Entry>({ dir: join(root, 'emptydir') }).clear();
        await new JsonFileStore<Entry>({ dir: join(root, 'nowhere') }).clear();
    });

    it('entries rethrows when the store dir is a regular file', async () => {
        const file = join(root, 'afile');
        await writeFile(file, 'x', 'utf-8');
        const store = new JsonFileStore<Entry>({ dir: file });
        await expect(store.entries()).rejects.toThrow();
    });

    it('clear rethrows when the store dir is a regular file', async () => {
        const file = join(root, 'afile');
        await writeFile(file, 'x', 'utf-8');
        const store = new JsonFileStore<Entry>({ dir: file });
        await expect(store.clear()).rejects.toThrow();
    });

    it('supports a custom extension with and without a leading dot', async () => {
        const dot = new JsonFileStore<Entry>({ dir: join(root, 'dot'), extension: '.data' });
        const dotValue = { id: randomUUID(), n: 1 };
        await dot.set(dotValue);
        await expect(readdir(join(root, 'dot'))).resolves.toEqual([dotValue.id + '.data']);

        const noDot = new JsonFileStore<Entry>({ dir: join(root, 'nodot'), extension: 'store' });
        const noDotValue = { id: randomUUID(), n: 1 };
        await noDot.set(noDotValue);
        await expect(readdir(join(root, 'nodot'))).resolves.toEqual([noDotValue.id + '.store']);
        await expect(noDot.get(noDotValue.id)).resolves.toEqual(noDotValue);
    });

    it('supports custom stringify and parse', async () => {
        const store = new JsonFileStore<Entry>({
            dir: join(root, 'here'),
            stringify: (value) => 'v1:' + JSON.stringify(value),
            parse: (text) => JSON.parse(text.slice(3))
        });
        const value = { id: randomUUID(), n: 7 };
        await store.set(value);
        await expect(store.get(value.id)).resolves.toEqual(value);
        const raw = await readFile(join(root, 'here', value.id + '.json'), 'utf-8');
        expect(raw).toBe('v1:' + JSON.stringify(value));
    });

    it('accepts any file-safe slug id (weakening over strict UUIDs)', async () => {
        const store = new JsonFileStore<Entry>({ dir: join(root, 'here') });
        const ids = ['aaaa', '42', 'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz', 'first_memory', 'a-1_b'];
        for (const id of ids) {
            await store.set({ id, n: 1 });
            await expect(store.get(id)).resolves.toEqual({ id, n: 1 });
            await expect(store.has(id)).resolves.toBe(true);
        }
        await expect(store.entries()).resolves.toHaveLength(ids.length);
    });

    it('rejects ids that are not file-safe slugs on every method', async () => {
        const store = new JsonFileStore<Entry>({ dir: join(root, 'here') });
        const msg = 'Id must be a valid slug ([a-z0-9_-]+)';
        await expect(store.set({ id: 'a/b', n: 1 })).rejects.toThrow(msg);
        await expect(store.get('..')).rejects.toThrow(msg);
        await expect(store.has('')).rejects.toThrow(msg);
        await expect(store.delete('a\u0000')).rejects.toThrow(msg);
        await expect(store.set({ id: 'Memory', n: 1 })).rejects.toThrow(msg);
    });
});
