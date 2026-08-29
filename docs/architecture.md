# Architecture

## Design

`ObjectStore<T, Id>` is the swappable persistence interface for
[`Identifiable<Id>`](api-reference.md) objects — each value carries a
file-safe lowercase slug `id` that serves as its key. Consumers depend on the
interface and swap backends without changing their code. All operations are
async.

## JsonFileStore

Stores each value in a file named `<id><extension>` inside a configured
directory.

- `set` is atomic: write a temp file, then rename into place — readers never
  observe a half-written file.
- The directory is created recursively on first write.
- Corrupt or unreadable entries throw rather than being skipped — consumers
  own corruption handling.
- Assumes a single writer; concurrent writers are not synchronized.

Ids are validated as file-safe lowercase slugs (`[a-z0-9_-]+`); the slug
charset also guarantees safe file names. `entries()` returns values sorted by
id in lexical order; ids are lowercase-canonical (uppercase ids are rejected,
never coerced).

## MemoryStore

A `Map`-backed in-memory backend implementing the same `ObjectStore`
interface, with `entries()` sorted by id to match `JsonFileStore`. It is the
convenient default when a store must always be present but no persistence is
configured (nothing is written to disk, and data is lost on restart).

## Dependencies

None at runtime — only Node.js built-ins (`node:fs/promises`, `node:path`).
