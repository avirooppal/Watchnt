import { describe, it, expect, beforeEach } from 'vitest';
import { ContentRepository } from '../../src/repositories/content.js';
import { initialSchemaMigration } from '../../src/schema.js';
import { PGLiteRelationalStorage, DatabaseMigrationRunner } from '@watchnt/storage';
import { createContentId, createTimestamp, isSuccess } from '@watchnt/shared';

describe('ContentRepository', () => {
  let db: PGLiteRelationalStorage;
  let repo: ContentRepository;

  beforeEach(async () => {
    db = new PGLiteRelationalStorage('memory://models_test_' + Math.random());
    const runner = new DatabaseMigrationRunner(db, [initialSchemaMigration]);
    await runner.runMigrations();
    repo = new ContentRepository(db);
  });

  it('creates and gets content', async () => {
    const id = createContentId('vid1');
    const createdAt = createTimestamp(100);

    const createRes = await repo.create({
      id,
      type: 'video',
      createdAt,
      mimeType: 'video/mp4',
      durationMs: 5000,
      title: 'Test Video'
    } as any);

    expect(isSuccess(createRes)).toBe(true);

    const getRes = await repo.get(id);
    expect(isSuccess(getRes)).toBe(true);
    if (isSuccess(getRes) && getRes.value) {
      expect(getRes.value.id).toBe(id);
      expect(getRes.value.type).toBe('video');
      expect(getRes.value.title).toBe('Test Video');
      expect(getRes.value.duration_ms).toBe(5000);
    }
  });

  it('updates content', async () => {
    const id = createContentId('vid2');
    await repo.create({ id, type: 'audio', createdAt: createTimestamp(0) } as any);

    const updateRes = await repo.update(id, { title: 'Updated Title', duration_ms: 3000 });
    expect(isSuccess(updateRes)).toBe(true);

    const getRes = await repo.get(id);
    if (isSuccess(getRes) && getRes.value) {
      expect(getRes.value.title).toBe('Updated Title');
      expect(getRes.value.duration_ms).toBe(3000);
      expect(getRes.value.updated_at).toBeGreaterThan(0);
    }
  });

  it('deletes content', async () => {
    const id = createContentId('vid3');
    await repo.create({ id, type: 'article', createdAt: createTimestamp(0) } as any);
    
    let getRes = await repo.get(id);
    if (isSuccess(getRes)) expect(getRes.value).not.toBeNull();

    const delRes = await repo.delete(id);
    expect(isSuccess(delRes)).toBe(true);

    getRes = await repo.get(id);
    if (isSuccess(getRes)) expect(getRes.value).toBeNull();
  });
});
