<script lang="ts">
  import { onMount } from 'svelte';
  import { dbStore } from '$lib/stores/db.svelte';
  import { pipelineStore } from '$lib/stores/pipeline.svelte';
  import '../app.css';
  
  let { children } = $props();

  onMount(() => {
    dbStore.init().then(() => {
      pipelineStore.init();
    });
    // Expose for E2E testing
    if (typeof window !== 'undefined') {
      (window as any).__dbStore = dbStore;
      (window as any).__pipelineStore = pipelineStore;
    }
  });
</script>

<div class="min-h-screen bg-gray-50 text-gray-900">
  <header class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex">
          <div class="shrink-0 flex items-center">
            <a href="/" class="text-xl font-bold text-indigo-600">Watch'nt</a>
          </div>
          <nav class="ml-8 flex gap-4">
            <a href="/library" class="text-sm text-gray-600 hover:text-indigo-600">Library</a>
            <a href="/search" class="text-sm text-gray-600 hover:text-indigo-600">Search</a>
            <a href="/chat" class="text-sm text-gray-600 hover:text-indigo-600">Chat</a>
            <a href="/graph" class="text-sm text-gray-600 hover:text-indigo-600">Graph</a>
            <a href="/flashcards" class="text-sm text-gray-600 hover:text-indigo-600">Flashcards</a>
            <a href="/settings" class="text-sm text-gray-600 hover:text-indigo-600">Settings</a>
          </nav>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    {@render children()}
  </main>
</div>
