import { describe, it, expect, beforeEach } from 'vitest';
import { PGLiteRelationalStorage } from '../../src/pglite.js';
import { isSuccess, isFailure } from '@watchnt/shared';

describe('PGLiteRelationalStorage', () => {
  it('executes simple queries and schema operations', async () => {
    // using memory mode in node
    const storage = new PGLiteRelationalStorage('memory://testdb1');
    
    const createRes = await storage.execute('CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT)');
    expect(isSuccess(createRes)).toBe(true);
    
    const insertRes = await storage.execute('INSERT INTO users (name) VALUES ($1)', ['Alice']);
    expect(isSuccess(insertRes)).toBe(true);
    
    const queryRes = await storage.query<{ name: string }>('SELECT name FROM users');
    expect(isSuccess(queryRes)).toBe(true);
    if (isSuccess(queryRes)) {
      expect(queryRes.value.length).toBe(1);
      expect(queryRes.value[0].name).toBe('Alice');
    }
  });

  it('handles transactions correctly', async () => {
    const storage = new PGLiteRelationalStorage('memory://testdb2');
    await storage.execute('CREATE TABLE counter (count INTEGER)');
    
    const txRes = await storage.transaction(async (tx) => {
      await tx.execute('INSERT INTO counter (count) VALUES (1)');
      const res = await tx.query<{ count: number }>('SELECT count FROM counter');
      if (isSuccess(res) && res.value.length > 0) {
        return res.value[0].count;
      }
      throw new Error('Failed to query in tx');
    });
    
    expect(isSuccess(txRes)).toBe(true);
    if (isSuccess(txRes)) {
      expect(txRes.value).toBe(1);
    }
  });

  it('rolls back on transaction throw', async () => {
    const storage = new PGLiteRelationalStorage('memory://testdb3');
    await storage.execute('CREATE TABLE logs (msg TEXT)');
    
    const txRes = await storage.transaction(async (tx) => {
      await tx.execute('INSERT INTO logs (msg) VALUES ($1)', ['error_happens_next']);
      throw new Error('Abort transaction');
    });
    
    expect(isFailure(txRes)).toBe(true);
    
    const queryRes = await storage.query('SELECT * FROM logs');
    expect(isSuccess(queryRes)).toBe(true);
    if (isSuccess(queryRes)) {
      expect(queryRes.value.length).toBe(0); // Insert was rolled back
    }
  });

  it('prevents nested transactions', async () => {
    const storage = new PGLiteRelationalStorage('memory://testdb4');
    
    const txRes = await storage.transaction(async (tx) => {
      const nested = await tx.transaction(async () => 1);
      if (isFailure(nested)) {
        throw nested.error;
      }
      return 1;
    });
    
    expect(isFailure(txRes)).toBe(true);
    if (isFailure(txRes)) {
      expect(txRes.error.message).toContain('Nested transactions are not supported');
    }
  });
});
