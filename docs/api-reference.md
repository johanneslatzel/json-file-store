# API Reference

## `Identifiable<Id extends string = string>`

```typescript
interface Identifiable<Id extends string = string> {
    id: Id;
}
```

Values stored in an `ObjectStore` must carry a file-safe lowercase slug `id`
(matching `/^[a-z0-9_-]+$/`), which is how the store identifies them.

## `ObjectStore<T extends Identifiable<Id>, Id extends string = string>`

Swappable persistence interface. All methods are async.

| Method       | Description                               |
| ------------ | ----------------------------------------- |
| `has(id)`    | whether a value exists                    |
| `get(id)`    | value, or `undefined` when missing        |
| `set(value)` | write or replace a value under `value.id` |
| `delete(id)` | remove; missing ids are a no-op           |
| `entries()`  | all stored values, sorted by id           |
| `clear()`    | remove all values                         |

## `JsonFileStore<T extends Identifiable<Id>, Id extends string = string>`

Directory-backed store, one `<id>.json` file per entry. `location` exposes the
configured directory path.

```typescript
new JsonFileStore<T>({ dir, extension?, stringify?, parse? });
```

| Option      | Default                          | Description                                   |
| ----------- | -------------------------------- | --------------------------------------------- |
| `dir`       | —                                | directory holding the per-id files (required) |
| `extension` | `.json`                          | file extension, with or without leading dot   |
| `stringify` | `JSON.stringify(value, null, 2)` | value → text                                  |
| `parse`     | `JSON.parse`                     | text → value                                  |

Ids are validated as file-safe lowercase slugs (`[a-z0-9_-]+`); that charset
also guarantees safe file names. `entries()` returns values sorted by id in
lexical order. Invalid ids throw.


## `MemoryStore<T extends Identifiable<Id>, Id extends string = string>`

In-memory store backed by a `Map`, useful as a default backend when no
persistence is configured. It implements the same async `ObjectStore`
contract and keeps `entries()` sorted by id, so consumers see deterministic
iteration regardless of backend.

```typescript
const store: ObjectStore<Entry> = new MemoryStore<Entry>();
await store.set(entry);
```

- `get()` on a missing id returns `undefined`; `set()` overwrites; `delete()`
  is a no-op for missing ids; `clear()` empties the store.
- Nothing is persisted, the store lives only for the process.
