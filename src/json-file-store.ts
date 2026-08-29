import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Identifiable, ObjectStore } from './store.js';

/** File-safe lowercase slug: letters, digits, hyphen, underscore. */
const SAFE_ID_PATTERN = /^[a-z0-9_-]+$/;

/** Options for {@link JsonFileStore}. */
export type JsonFileStoreOptions<T extends Identifiable<Id>, Id extends string = string> = {
    /** Directory that holds the per-id files; created on demand by `set`. */
    dir: string;

    /** File extension for value files, with or without leading dot. Default `.json`. */
    extension?: string;

    /** Serializes a value to text. Default `JSON.stringify(value, null, 2)`. */
    stringify?: (value: T) => string;

    /** Parses stored text back into a value. Default `JSON.parse`. */
    parse?: (text: string) => unknown;
};

/**
 * {@link ObjectStore} that persists one file per id inside a directory, named
 * `<id><extension>`. Writes are atomic (temp file + rename) and ids are
 * validated as file-safe lowercase slugs, which also guarantees safe file
 * names.
 *
 * The store assumes a single writer; concurrent writers are not synchronized.
 * Values must be JSON-serializable — consumers own value-level validation.
 */
export class JsonFileStore<
    T extends Identifiable<Id>,
    Id extends string = string
> implements ObjectStore<T, Id> {
    /** The configured directory, also the store's location. */
    readonly location: string;

    private readonly dir: string;
    private readonly extension: string;
    private readonly stringify: (value: T) => string;
    private readonly parse: (text: string) => unknown;

    constructor(options: JsonFileStoreOptions<T, Id>) {
        if (options.dir.length === 0) {
            throw new Error('dir must not be empty');
        }
        this.dir = options.dir;
        this.location = options.dir;
        const extension = options.extension ?? '.json';
        this.extension = extension.startsWith('.') ? extension : '.' + extension;
        this.stringify = options.stringify ?? ((value: T) => JSON.stringify(value, null, 2)!);
        this.parse = options.parse ?? ((text: string) => JSON.parse(text) as unknown);
    }

    /** Checks that an id is a valid file-safe slug; the slug charset also guarantees a safe file name. Throws when invalid. */
    private validateId(id: string): void {
        if (!SAFE_ID_PATTERN.test(id)) {
            throw new Error('Id must be a valid slug ([a-z0-9_-]+)');
        }
    }

    private filePath(id: Id): string {
        this.validateId(id);
        return join(this.dir, id + this.extension);
    }

    async has(id: Id): Promise<boolean> {
        const path = this.filePath(id);
        try {
            await stat(path);
            return true;
        } catch {
            return false;
        }
    }

    async get(id: Id): Promise<T | undefined> {
        const path = this.filePath(id);
        let text: string;
        try {
            text = await readFile(path, 'utf-8');
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return undefined;
            }
            throw error;
        }
        return this.parse(text) as T;
    }

    async set(value: T): Promise<void> {
        const path = this.filePath(value.id);
        await mkdir(this.dir, { recursive: true });
        const text = this.stringify(value);
        const tmp = join(this.dir, '.' + value.id + this.extension + '.tmp');
        await writeFile(tmp, text, 'utf-8');
        await rename(tmp, path);
    }

    async delete(id: Id): Promise<void> {
        await rm(this.filePath(id), { force: true });
    }

    async entries(): Promise<T[]> {
        let names: string[];
        try {
            names = await readdir(this.dir);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return [];
            }
            throw error;
        }
        const ids = names
            .filter((name) => name.endsWith(this.extension))
            .map((name) => name.slice(0, name.length - this.extension.length))
            .sort();
        const values: T[] = [];
        for (const id of ids) {
            const text = await readFile(join(this.dir, id + this.extension), 'utf-8');
            values.push(this.parse(text) as T);
        }
        return values;
    }

    async clear(): Promise<void> {
        let names: string[];
        try {
            names = await readdir(this.dir);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return;
            }
            throw error;
        }
        const targets = names.filter((name) => name.endsWith(this.extension));
        if (targets.length === 0) {
            return;
        }
        await Promise.all(targets.map((name) => rm(join(this.dir, name), { force: true })));
    }
}
