# @watchnt/models

Contains the SQLite schema definitions and Repository patterns for standard CRUD operations in the Watch'nt application.

## Table Schemas

### `content`
Stores core references for ingested media and documents.

- `id` (TEXT PRIMARY KEY)
- `type` (TEXT NOT NULL) - Discriminator (e.g. 'video', 'audio', 'article')
- `created_at` (INTEGER NOT NULL)
- `updated_at` (INTEGER NOT NULL)
- `title` (TEXT)
- `mime_type` (TEXT)
- `duration_ms` (INTEGER)
- `file_size` (INTEGER)
