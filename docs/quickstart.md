# Quick Start

## Install

```bash
npm install @johannes.latzel/json-file-store
```

## Basic usage

```typescript
import { randomUUID } from 'node:crypto';
import { JsonFileStore, type ObjectStore } from '@johannes.latzel/json-file-store';

type Entry = { id: string; title: string; done: boolean };

const store: ObjectStore<Entry> = new JsonFileStore<Entry>({ dir: './data' });

const entry = { id: randomUUID(), title: 'Write docs', done: false };
await store.set(entry);
const loaded = await store.get(entry.id); // { id, title, done }
const all = await store.entries(); // sorted by id
```

Ids are file-safe lowercase slugs (`[a-z0-9_-]+`). `randomUUID()` output is a
valid slug, as are user-derived ids like `'write-docs'`.

## Full API

See [API Reference](api-reference.md).
