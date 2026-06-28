<script lang="ts">
  import { onMount } from 'svelte';

  // ── State ────────────────────────────────────────────────────────────────────
  type Strategy = 'hybrid' | 'vector-only' | 'fts-only';

  interface Message {
    role: 'user' | 'assistant';
    text: string;
    contextUsed?: string;
    timestamp: number;
  }

  let query = $state('');
  let strategy = $state<Strategy>('hybrid');
  let messages = $state<Message[]>([]);
  let loading = $state(false);
  let scrollEl: HTMLElement;

  // ── Scroll helper ────────────────────────────────────────────────────────────
  $effect(() => {
    if (messages.length && scrollEl) {
      setTimeout(() => scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' }), 50);
    }
  });

  // ── Send ─────────────────────────────────────────────────────────────────────
  async function send() {
    const q = query.trim();
    if (!q || loading) return;

    messages = [...messages, { role: 'user', text: q, timestamp: Date.now() }];
    query = '';
    loading = true;

    try {
      // Build a zero vector as a placeholder — in production this comes from
      // the embedding step for the query text.
      const zeroVec = new Array(384).fill(0);

      // Access the db via the global dbStore
      const { dbStore } = await import('$lib/stores/db.svelte');
      const { ContextBuilder } = await import('@watchnt/models');

      if (!dbStore.facade) throw new Error('Database not ready — please wait for the app to initialise.');

      // ContextBuilder expects a RelationalStorage, which is the internal db
      // on ModelFacade. We thread through a thin wrapper service instead.
      const ctxBuilder = new ContextBuilder((dbStore.facade as any)['db']);
      const ctxResult = await ctxBuilder.build(q, zeroVec, strategy, 5);

      const contextBlock = ctxResult.ok
        ? ctxResult.value.contextBlock
        : 'No context retrieved.';

      // Simulate an AI response (stub) — replace with actual AI provider call
      const answer = ctxResult.ok && ctxResult.value.results.length > 0
        ? `Based on your notes:\n\n${ctxResult.value.results.map((r: { content_title?: string | null; fragment_text: string }, i: number) =>
            `${i + 1}. **${r.content_title ?? 'Note'}** — ${r.fragment_text.slice(0, 200)}…`
          ).join('\n')}`
        : `I searched your knowledge base for "${q}" using the ${strategy} strategy, but found no relevant notes yet. Try importing some content first.`;

      messages = [
        ...messages,
        {
          role: 'assistant',
          text: answer,
          contextUsed: contextBlock,
          timestamp: Date.now()
        }
      ];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      messages = [
        ...messages,
        { role: 'assistant', text: `Error: ${msg}`, timestamp: Date.now() }
      ];
    } finally {
      loading = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }
</script>

<svelte:head>
  <title>Chat — Watch'nt</title>
  <meta name="description" content="Ask questions about your saved content using AI-powered retrieval-augmented generation." />
</svelte:head>

<div class="chat-page">
  <!-- Header -->
  <div class="chat-header">
    <h1>Chat with your knowledge</h1>
    <p>Ask questions — answers are grounded in your imported content.</p>

    <div class="strategy-picker">
      <label for="strategy-select">Retrieval strategy</label>
      <select id="strategy-select" bind:value={strategy}>
        <option value="hybrid">Hybrid (best quality)</option>
        <option value="vector-only">Vector only (semantic)</option>
        <option value="fts-only">Full-text only (keyword)</option>
      </select>
    </div>
  </div>

  <!-- Message Thread -->
  <div class="messages" bind:this={scrollEl}>
    {#if messages.length === 0}
      <div class="empty-state">
        <div class="empty-icon">💬</div>
        <p>Ask anything about your imported videos, PDFs, and articles.</p>
      </div>
    {/if}

    {#each messages as msg (msg.timestamp)}
      <div class="message {msg.role}">
        <div class="bubble">
          {#if msg.role === 'assistant'}
            <div class="assistant-label">Watch'nt AI</div>
          {/if}
          <!-- Render newlines properly -->
          {#each msg.text.split('\n') as line}
            <p>{line}</p>
          {/each}
        </div>
      </div>
    {/each}

    {#if loading}
      <div class="message assistant">
        <div class="bubble thinking">
          <span></span><span></span><span></span>
        </div>
      </div>
    {/if}
  </div>

  <!-- Input Bar -->
  <div class="input-bar">
    <textarea
      id="chat-input"
      bind:value={query}
      onkeydown={handleKeydown}
      placeholder="Ask a question about your content…"
      rows={2}
      disabled={loading}
    ></textarea>
    <button id="chat-send-btn" onclick={send} disabled={loading || !query.trim()}>
      {loading ? '…' : 'Send'}
    </button>
  </div>
</div>

<style>
  .chat-page {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 4rem);
    gap: 0;
  }

  /* Header */
  .chat-header {
    padding: 1.5rem 1.5rem 1rem;
    border-bottom: 1px solid #e5e7eb;
    background: white;
  }

  .chat-header h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.25rem;
  }

  .chat-header p {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0 0 0.75rem;
  }

  .strategy-picker {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .strategy-picker label {
    font-size: 0.8rem;
    font-weight: 500;
    color: #374151;
    white-space: nowrap;
  }

  .strategy-picker select {
    padding: 0.35rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.85rem;
    background: white;
    color: #374151;
    cursor: pointer;
    outline: none;
  }

  .strategy-picker select:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px #e0e7ff;
  }

  /* Messages */
  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: #f9fafb;
  }

  .empty-state {
    margin: auto;
    text-align: center;
    color: #9ca3af;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 0.75rem;
  }

  .message {
    display: flex;
  }

  .message.user {
    justify-content: flex-end;
  }

  .message.assistant {
    justify-content: flex-start;
  }

  .bubble {
    max-width: 70%;
    padding: 0.75rem 1rem;
    border-radius: 1rem;
    font-size: 0.925rem;
    line-height: 1.6;
  }

  .message.user .bubble {
    background: #6366f1;
    color: white;
    border-bottom-right-radius: 0.25rem;
  }

  .message.assistant .bubble {
    background: white;
    color: #1f2937;
    border: 1px solid #e5e7eb;
    border-bottom-left-radius: 0.25rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .bubble p {
    margin: 0;
  }

  .bubble p + p {
    margin-top: 0.35rem;
  }

  .assistant-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: #6b7280;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 0.4rem;
  }

  /* Typing indicator */
  .thinking {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.9rem 1.25rem;
  }

  .thinking span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #9ca3af;
    animation: bounce 1.2s infinite;
  }

  .thinking span:nth-child(2) { animation-delay: 0.2s; }
  .thinking span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-6px); }
  }

  /* Input Bar */
  .input-bar {
    display: flex;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background: white;
    border-top: 1px solid #e5e7eb;
    align-items: flex-end;
  }

  .input-bar textarea {
    flex: 1;
    padding: 0.6rem 0.9rem;
    border: 1px solid #d1d5db;
    border-radius: 0.75rem;
    font-size: 0.925rem;
    resize: none;
    outline: none;
    font-family: inherit;
    color: #1f2937;
    background: #f9fafb;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .input-bar textarea:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px #e0e7ff;
    background: white;
  }

  .input-bar button {
    padding: 0.65rem 1.4rem;
    background: #6366f1;
    color: white;
    font-weight: 600;
    font-size: 0.9rem;
    border: none;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    white-space: nowrap;
  }

  .input-bar button:hover:not(:disabled) {
    background: #4f46e5;
  }

  .input-bar button:active:not(:disabled) {
    transform: scale(0.97);
  }

  .input-bar button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
