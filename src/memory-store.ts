import type { Identifiable, ObjectStore } from './store.js';

/**
 * In-memory {@link ObjectStore} backed by a {@link Map} keyed by id.
 *
 * Useful as a default store when no persistence is configured (e.g. a task
 * pool that should still always have a store). `entries()` returns values
 * sorted by id, matching {@link JsonFileStore}'s ordering, so consumers see
 * deterministic iteration regardless of backend. All methods are async to
 * satisfy the {@link ObjectStore} contract.
 */
export class MemoryStore<
    T extends Identifiable<Id>,
    Id extends string = string
> implements ObjectStore<T, Id> {
    private readonly values = new Map<Id, T>();

    async has(id: Id): Promise<boolean> {
        return this.values.has(id);
    }

    async get(id: Id): Promise<T | undefined> {
        return this.values.get(id);
    }

    async set(value: T): Promise<void> {
        this.values.set(value.id, value);
    }

    async delete(id: Id): Promise<void> {
        this.values.delete(id);
    }

    async entries(): Promise<T[]> {
        return [...this.values.keys()].sort().map((id) => this.values.get(id) as T);
    }

    async clear(): Promise<void> {
        this.values.clear();
    }
}
