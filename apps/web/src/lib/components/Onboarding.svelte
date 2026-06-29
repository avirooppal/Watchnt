<script lang="ts">
  import { fade } from 'svelte/transition';
  import { dbStore } from '$lib/stores/db.svelte';

  let { onComplete } = $props<{ onComplete: () => void }>();

  let openaiKey = $state('');
  let isSaving = $state(false);
  let error = $state<string | null>(null);

  async function handleSave() {
    if (!openaiKey.trim()) {
      error = 'Please enter an OpenAI API Key';
      return;
    }

    if (!openaiKey.trim().startsWith('sk-')) {
      error = 'Invalid OpenAI API Key format. Should start with "sk-".';
      return;
    }

    isSaving = true;
    error = null;

    try {
      if (dbStore.settings) {
        await dbStore.settings.set('openai_api_key', openaiKey.trim());
        onComplete();
      } else {
        throw new Error('Settings store is not initialized');
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save settings';
    } finally {
      isSaving = false;
    }
  }
</script>

<div class="h-full flex flex-col justify-center relative w-full h-full p-6" transition:fade>
  <div class="glass-panel p-8 rounded-2xl max-w-sm mx-auto w-full relative z-10">
    <div class="flex items-center space-x-3 mb-6 justify-center">
      <div class="bg-indigo-500/20 p-3 rounded-xl border border-indigo-500/30">
        <svg class="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
      </div>
    </div>
    
    <h1 class="text-2xl font-bold text-center text-white mb-2">Welcome to WatchNT</h1>
    <p class="text-sm text-slate-400 text-center mb-8">
      WatchNT runs locally and uses your own API keys for complete privacy and cost control.
    </p>

    <div class="space-y-5">
      <div>
        <label for="openai_key" class="block text-sm font-medium text-slate-300 mb-1.5">OpenAI API Key</label>
        <input 
          type="password" 
          id="openai_key" 
          bind:value={openaiKey}
          placeholder="sk-..." 
          class="block w-full rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2.5 transition-colors focus:outline-none"
        />
        <p class="mt-2 text-xs text-slate-500">Your key never leaves your browser.</p>
      </div>

      {#if error}
        <div class="text-rose-400 text-sm bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
          {error}
        </div>
      {/if}

      <button 
        onclick={handleSave}
        disabled={isSaving}
        class="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all mt-8 hover:shadow-indigo-500/25"
      >
        {#if isSaving}
          <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        {:else}
          Continue to WatchNT
        {/if}
      </button>
    </div>
  </div>
</div>
