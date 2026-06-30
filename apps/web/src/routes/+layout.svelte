<script lang="ts">
  import { onMount } from 'svelte';
  import { dbStore } from '$lib/stores/db.svelte';
  import { pipelineStore } from '$lib/stores/pipeline.svelte';
  import { goto } from '$app/navigation';
  import '../app.css';
  
  let { children } = $props();

  onMount(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.endsWith('.html')) {
        goto('/', { replaceState: true });
      }
      if (window.innerWidth < 800) {
        document.body.classList.add('in-popup');
      }
    }

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

<div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative selection:bg-indigo-500/30">
  <!-- Dynamic ambient background elements -->
  <div class="absolute inset-0 overflow-hidden pointer-events-none fixed top-0 z-0">
    <div class="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-900/20 blur-[120px] mix-blend-screen"></div>
    <div class="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[100px] mix-blend-screen"></div>
  </div>

  <header class="sticky top-0 z-50 glass-panel border-b-0 border-white/5">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center">
          <a href="/" class="flex items-center gap-2 group">
            <div class="bg-indigo-500/20 p-1.5 rounded-lg border border-indigo-500/30 group-hover:bg-indigo-500/30 transition-colors">
              <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
            </div>
            <span class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">WatchNT</span>
          </a>
          <div class="ml-10 flex-1 max-w-lg hidden sm:block relative group">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-slate-500 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input type="text" placeholder="Ask WatchNT..." class="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-xl leading-5 bg-slate-900/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-slate-900 sm:text-sm transition-all shadow-inner">
            <div class="absolute inset-y-0 right-0 pr-2 flex items-center">
              <kbd class="hidden sm:inline-block border border-slate-700 rounded px-2 text-xs font-sans font-medium text-slate-500 bg-slate-800">⌘K</kbd>
            </div>
          </div>

          <nav class="ml-auto flex gap-1">
            {#each [
              { href: '/library', label: 'Library' },
              { href: '/flashcards', label: 'Flashcards' },
              { href: '/settings', label: 'Settings' }
            ] as link}
              <a href={link.href} class="text-sm px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-white/5 transition-colors font-medium">
                {link.label}
              </a>
            {/each}
          </nav>
        </div>
      </div>
    </div>
  </header>

  <main class="flex-1 max-w-7xl w-full mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
    {@render children()}
  </main>
</div>
