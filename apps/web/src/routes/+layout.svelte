<script lang="ts">
  import { onMount } from 'svelte';
  import { dbStore } from '$lib/stores/db.svelte';
  import '../app.css';
  
  let { children } = $props();

  onMount(() => {
    dbStore.init();
    // Expose for E2E testing
    if (typeof window !== 'undefined') {
      (window as any).__dbStore = dbStore;
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
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    {@render children()}
  </main>
</div>
