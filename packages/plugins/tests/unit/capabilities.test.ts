import { describe, it, expect } from 'vitest';
import { RpcMediator } from '../../src/rpc.js';
import type { PluginPermission } from '../../src/manifest.js';

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
function mediatorWith(...perms: PluginPermission[]) {
  return new RpcMediator(perms);
}

// ────────────────────────────────────────────────────────────
// Permission Enforcement
// ────────────────────────────────────────────────────────────
describe('RpcMediator – capability permission enforcement', () => {
  it('allows storage:saveContent when plugin has storage:write', async () => {
    const m = mediatorWith('storage:write');
    const res = await m.handleRequest('storage:saveContent', { title: 'Video X' });
    expect(res.success).toBe(true);
  });

  it('denies storage:saveContent without storage:write', async () => {
    const m = mediatorWith('storage:read');
    await expect(m.handleRequest('storage:saveContent', {})).rejects.toThrow('Permission denied');
  });

  it('allows ai:invoke when plugin has ai:invoke permission', async () => {
    const m = mediatorWith('ai:invoke');
    const res = await m.handleRequest('ai:invoke', { model: 'gemma', prompt: 'Hello' });
    expect(res.result).toContain('Hello');
  });

  it('denies ai:invoke without ai:invoke permission', async () => {
    const m = mediatorWith('network');
    await expect(m.handleRequest('ai:invoke', { prompt: 'Hi' })).rejects.toThrow('Permission denied');
  });

  it('allows retrieval:search when plugin has retrieval:search permission', async () => {
    const m = mediatorWith('retrieval:search');
    const res = await m.handleRequest('retrieval:search', { query: 'machine learning' });
    expect(Array.isArray(res.results)).toBe(true);
  });

  it('denies retrieval:search without retrieval:search permission', async () => {
    const m = mediatorWith('storage:read');
    await expect(m.handleRequest('retrieval:search', { query: 'ml' })).rejects.toThrow('Permission denied');
  });

  it('allows prompt:read when plugin has prompt:read permission', async () => {
    const m = mediatorWith('prompt:read');
    const res = await m.handleRequest('prompt:read', { key: 'summarize' });
    expect(typeof res.template).toBe('string');
    expect(res.template.length).toBeGreaterThan(0);
  });

  it('allows notes:generate when plugin has notes:generate permission', async () => {
    const m = mediatorWith('notes:generate');
    const res = await m.handleRequest('notes:generate', { title: 'My Note', content: 'Body.' });
    expect(res.success).toBe(true);
    expect(typeof res.noteId).toBe('string');
  });

  it('denies notes:generate without notes:generate permission', async () => {
    const m = mediatorWith('storage:write');
    await expect(m.handleRequest('notes:generate', { title: 'x' })).rejects.toThrow('Permission denied');
  });

  it('throws on unknown RPC method', async () => {
    const m = mediatorWith('network');
    await expect(m.handleRequest('nonexistent:method', {})).rejects.toThrow('Unknown RPC method');
  });
});

// ────────────────────────────────────────────────────────────
// Plugin Registration & Revocation (custom handler lifecycle)
// ────────────────────────────────────────────────────────────
describe('RpcMediator – registration and revocation', () => {
  it('can register a custom handler and invoke it', async () => {
    const m = mediatorWith('network');
    m.registerHandler('network:ping', 'network', async (_) => ({ pong: true }));
    const res = await m.handleRequest('network:ping', {});
    expect(res.pong).toBe(true);
  });

  it('overwriting a handler replaces it', async () => {
    const m = mediatorWith('storage:read');
    m.registerHandler('storage:readNotes', 'storage:read', async (_) => ({ notes: [{ id: 'custom' }] }));
    const res = await m.handleRequest('storage:readNotes', {});
    expect(res.notes[0].id).toBe('custom');
  });
});
