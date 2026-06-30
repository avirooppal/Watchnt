<script lang="ts">
  import { fade, slide } from 'svelte/transition';
  import { dbStore } from '$lib/stores/db.svelte';

  let { onComplete } = $props<{ onComplete: () => void }>();

  // Steps: 1: Welcome, 2: Choose AI, 3: Download Models, 4: Storage, 5: Finish
  let step = $state(1);
  let aiChoice = $state<'local' | 'byok' | 'hybrid' | null>(null);
  let storageChoice = $state<'browser' | 'obsidian' | null>(null);
  let openaiKey = $state('');
  
  let isSaving = $state(false);
  let error = $state<string | null>(null);
  let downloadProgress = $state(0);

  function nextStep() {
    error = null;
    if (step === 2 && aiChoice === 'byok' && !openaiKey.trim().startsWith('sk-')) {
      error = 'Invalid OpenAI API Key format. Should start with "sk-".';
      return;
    }
    
    if (step === 2 && (aiChoice === 'local' || aiChoice === 'hybrid')) {
      step = 3;
      simulateDownload();
      return;
    }

    if (step === 3) {
      step = 4;
      return;
    }

    if (step === 4) {
      handleSave();
      return;
    }
    
    step++;
  }

  function simulateDownload() {
    downloadProgress = 0;
    const interval = setInterval(() => {
      downloadProgress += Math.random() * 15;
      if (downloadProgress >= 100) {
        downloadProgress = 100;
        clearInterval(interval);
        setTimeout(() => {
          step = 4;
        }, 1000);
      }
    }, 300);
  }

  async function handleSave() {
    isSaving = true;
    error = null;

    try {
      if (dbStore.settings) {
        if (aiChoice === 'byok') {
          await dbStore.settings.set('openai_api_key', openaiKey.trim());
        }
        await dbStore.settings.set('ai_provider', aiChoice);
        await dbStore.settings.set('storage_provider', storageChoice || 'browser');
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

<div class="h-full flex flex-col justify-center relative w-full h-full p-6 text-slate-100" transition:fade>
  <div class="glass-panel p-8 rounded-3xl max-w-sm mx-auto w-full relative z-10 overflow-hidden min-h-[450px] flex flex-col">
    
    <!-- Step 1: Welcome -->
    {#if step === 1}
      <div class="flex flex-col flex-1" in:fade={{ delay: 150, duration: 300 }} out:fade={{ duration: 150 }}>
        <div class="flex items-center space-x-3 mb-6 justify-center mt-4">
          <div class="bg-indigo-500/20 p-4 rounded-2xl border border-indigo-500/30">
            <svg class="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
          </div>
        </div>
        
        <h1 class="text-3xl font-bold text-center text-white mb-2 tracking-tight">Welcome to WatchNT</h1>
        <p class="text-[15px] text-indigo-200/80 text-center mb-6 font-medium">Your Personal Knowledge Operating System</p>
        
        <p class="text-sm text-slate-400 text-center mb-auto leading-relaxed">
          WatchNT automatically transforms everything you watch, listen to, read and discuss into organized, searchable knowledge. <br/><br/>
          Nothing is uploaded unless you choose to.<br/>
          Everything works locally.
        </p>

        <button onclick={nextStep} class="w-full mt-8 py-3.5 px-4 rounded-xl shadow-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-all hover:shadow-indigo-500/25">
          Let's set it up
        </button>
      </div>

    <!-- Step 2: Choose AI -->
    {:else if step === 2}
      <div class="flex flex-col flex-1" in:fade={{ delay: 150, duration: 300 }} out:fade={{ duration: 150 }}>
        <h2 class="text-xl font-bold text-white mb-2">Processing Engine</h2>
        <p class="text-sm text-slate-400 mb-6">How would you like WatchNT to process your knowledge?</p>

        <div class="space-y-3 mb-auto">
          <!-- Local AI -->
          <button onclick={() => aiChoice = 'local'} class="w-full text-left p-4 rounded-xl border transition-all {aiChoice === 'local' ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-slate-900/50 border-white/5 hover:border-white/10'}">
            <div class="flex justify-between items-center mb-1">
              <span class="font-medium text-white">Local AI <span class="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full ml-2 uppercase">Recommended</span></span>
              {#if aiChoice === 'local'}<svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>{/if}
            </div>
            <p class="text-xs text-slate-400">Private, offline. Downloads models once.</p>
          </button>

          <!-- Hybrid -->
          <button onclick={() => aiChoice = 'hybrid'} class="w-full text-left p-4 rounded-xl border transition-all {aiChoice === 'hybrid' ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-slate-900/50 border-white/5 hover:border-white/10'}">
            <div class="flex justify-between items-center mb-1">
              <span class="font-medium text-white">Hybrid</span>
              {#if aiChoice === 'hybrid'}<svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>{/if}
            </div>
            <p class="text-xs text-slate-400">Local by default. Cloud AI only for larger tasks.</p>
          </button>

          <!-- BYOK -->
          <button onclick={() => aiChoice = 'byok'} class="w-full text-left p-4 rounded-xl border transition-all {aiChoice === 'byok' ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-slate-900/50 border-white/5 hover:border-white/10'}">
            <div class="flex justify-between items-center mb-1">
              <span class="font-medium text-white">Bring Your Own Key</span>
              {#if aiChoice === 'byok'}<svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>{/if}
            </div>
            <p class="text-xs text-slate-400">Use OpenAI, Anthropic, or compatible APIs.</p>
          </button>

          {#if aiChoice === 'byok'}
            <div transition:slide={{ duration: 200 }}>
              <input type="password" bind:value={openaiKey} placeholder="Enter API Key (sk-...)" class="mt-2 block w-full rounded-lg bg-slate-950/50 border border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2.5 outline-none" />
            </div>
          {/if}
        </div>

        {#if error}<p class="text-xs text-rose-400 mt-2">{error}</p>{/if}

        <button onclick={nextStep} disabled={!aiChoice} class="w-full mt-6 py-3.5 px-4 rounded-xl shadow-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-all disabled:opacity-50">
          Continue
        </button>
      </div>

    <!-- Step 3: Download Models -->
    {:else if step === 3}
      <div class="flex flex-col flex-1 items-center justify-center text-center" in:fade={{ delay: 150, duration: 300 }} out:fade={{ duration: 150 }}>
        <h2 class="text-xl font-bold text-white mb-6">Downloading Models</h2>
        
        <div class="w-full space-y-4 mb-8 text-left">
          <div class="flex items-center text-sm text-slate-300">
            <svg class="w-5 h-5 mr-2 {downloadProgress > 30 ? 'text-emerald-400' : 'text-slate-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            Whisper Tiny
          </div>
          <div class="flex items-center text-sm text-slate-300">
            <svg class="w-5 h-5 mr-2 {downloadProgress > 60 ? 'text-emerald-400' : 'text-slate-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            Embedding Model
          </div>
          <div class="flex items-center text-sm text-slate-300">
            <svg class="w-5 h-5 mr-2 {downloadProgress >= 100 ? 'text-emerald-400' : 'text-slate-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            Small LLM
          </div>
        </div>

        <div class="w-full bg-slate-800 rounded-full h-2 mb-2 overflow-hidden">
          <div class="bg-indigo-500 h-2 rounded-full transition-all duration-300 ease-out" style="width: {downloadProgress}%"></div>
        </div>
        <p class="text-xs text-slate-500 mb-auto">Estimated: 800 MB</p>
      </div>

    <!-- Step 4: Storage -->
    {:else if step === 4}
      <div class="flex flex-col flex-1" in:fade={{ delay: 150, duration: 300 }} out:fade={{ duration: 150 }}>
        <h2 class="text-xl font-bold text-white mb-2">Storage</h2>
        <p class="text-sm text-slate-400 mb-6">Where should WatchNT keep your knowledge?</p>

        <div class="space-y-3 mb-auto">
          <!-- Browser Storage -->
          <button onclick={() => storageChoice = 'browser'} class="w-full text-left p-4 rounded-xl border transition-all {storageChoice === 'browser' ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-slate-900/50 border-white/5 hover:border-white/10'}">
            <div class="flex justify-between items-center mb-1">
              <span class="font-medium text-white">Browser Storage <span class="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full ml-2 uppercase">Default</span></span>
              {#if storageChoice === 'browser'}<svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>{/if}
            </div>
            <p class="text-xs text-slate-400">Uses local IndexedDB. Fast and secure.</p>
          </button>

          <!-- Obsidian Vault -->
          <button onclick={() => storageChoice = 'obsidian'} class="w-full text-left p-4 rounded-xl border transition-all {storageChoice === 'obsidian' ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-slate-900/50 border-white/5 hover:border-white/10'}">
            <div class="flex justify-between items-center mb-1">
              <span class="font-medium text-white">Obsidian Vault</span>
              {#if storageChoice === 'obsidian'}<svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>{/if}
            </div>
            <p class="text-xs text-slate-400">Sync directly to your local markdown vault.</p>
          </button>
        </div>

        {#if error}<p class="text-xs text-rose-400 mt-2">{error}</p>{/if}

        <button onclick={nextStep} disabled={!storageChoice || isSaving} class="w-full mt-6 py-3.5 px-4 rounded-xl shadow-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-all disabled:opacity-50 flex justify-center items-center">
          {#if isSaving}
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          {:else}
            Complete Setup
          {/if}
        </button>
      </div>
    {/if}

  </div>
</div>
