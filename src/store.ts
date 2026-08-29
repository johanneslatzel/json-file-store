/**
 * An object identified by a file-safe id inside an {@link ObjectStore}.
 *
 * Ids are file-safe lowercase slugs matching `/^[a-z0-9_-]+$/`, so they can
 * be used directly as file names.
 */
export interface Identifiable<Id extends string = string> {
    id: Id;
}

/**
 * A persistent store of JSON-serializable values, keyed by the file-safe id of
 * each value.
 *
 * Implementations validate ids and own their storage semantics. All methods
 * are asynchronous so disk or network backends fit the interface. Consumers
 * own value-level validation.
 */
export interface ObjectStore<T extends Identifiable<Id>, Id extends string = string> {
    /** Whether a value exists for the id. */
    has(id: Id): Promise<boolean>;

    /** Reads the value for an id; `undefined` when it does not exist. */
    get(id: Id): Promise<T | undefined>;

    /** Writes or replaces a value under `value.id`. */
    set(value: T): Promise<void>;

    /** Removes the value for an id; missing ids are a no-op. */
    delete(id: Id): Promise<void>;

    /** All stored values, sorted by id. */
    entries(): Promise<T[]>;

    /** Removes all values. */
    clear(): Promise<void>;
}
