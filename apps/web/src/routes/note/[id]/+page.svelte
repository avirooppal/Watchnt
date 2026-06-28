<script lang="ts">
  import { page } from '$app/stores';
  import { dbStore } from '$lib/stores/db.svelte';
  import { isSuccess } from '@watchnt/shared';
  import { onMount } from 'svelte';

  let noteTitle = $derived($page.params.id);
  
  let backlinks = $state<any[]>([]);
  let forwardLinks = $state<any[]>([]);
  let loading = $state(true);
  
  $effect(() => {
    if (dbStore.facade && noteTitle) {
      loading = true;
      // Fetch backlinks (nodes that link to THIS title)
      dbStore.facade.backlinks.getBacklinks(noteTitle).then(res => {
        if (isSuccess(res)) backlinks = res.value;
      });

      // Fetch forward links if we somehow resolve this title to a note ID
      // For now, we'll just show the backlinks cluster.
      loading = false;
    }
  });

  // Simple Wikilink parser for rendering text
  function renderWikilinks(text: string) {
    if (!text) return '';
    return text.replace(/\[\[(.*?)\]\]/g, (match, target) => {
      let display = target;
      if (target.includes('|')) {
        const parts = target.split('|');
        target = parts[0].trim();
        display = parts[1].trim();
      }
      return `<a href="/note/${encodeURIComponent(target)}" class="text-indigo-500 hover:underline cursor-pointer font-medium bg-indigo-50 px-1 rounded">[[${display}]]</a>`;
    });
  }
</script>

<div class="max-w-4xl mx-auto px-4 py-8">
  <div class="mb-6">
    <a href="/" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
      &larr; Back to Home
    </a>
  </div>

  <h1 class="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">{noteTitle}</h1>
  <p class="text-gray-500 mb-8">Concept / Knowledge Node</p>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
    <div class="md:col-span-2">
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[300px]">
        <h2 class="text-xl font-bold text-gray-800 mb-4">Content</h2>
        <p class="text-gray-500 italic">
          This is a virtual concept node. In the future, you can write independent notes here.
          For now, explore the connections on the right.
        </p>
      </div>
    </div>

    <div class="space-y-6">
      <!-- Backlinks Panel -->
      <div class="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100">
        <h3 class="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
          Linked Mentions ({backlinks.length})
        </h3>
        
        {#if loading}
          <div class="animate-pulse flex space-x-4">
            <div class="flex-1 space-y-4 py-1">
              <div class="h-4 bg-indigo-200 rounded w-3/4"></div>
              <div class="h-4 bg-indigo-200 rounded"></div>
            </div>
          </div>
        {:else if backlinks.length === 0}
          <p class="text-sm text-indigo-400">No other notes link to this concept yet.</p>
        {:else}
          <ul class="space-y-3">
            {#each backlinks as link}
              <li class="text-sm bg-white p-3 rounded-lg shadow-sm border border-indigo-50 hover:shadow-md transition-shadow">
                <span class="text-gray-500 text-xs block mb-1">Source Note ID:</span>
                <span class="font-medium text-gray-800 break-all">{link.source_note_id}</span>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>
  </div>
</div>
