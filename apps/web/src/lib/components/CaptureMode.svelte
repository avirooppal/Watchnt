<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  let currentUrl = $state('');
  let currentTitle = $state('');
  let isSniffing = $state(true);
  let discoveryResult = $state<any>(null);

  onMount(() => {
    // Check if we are in a Chrome extension popup context
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          currentUrl = tabs[0].url || '';
          currentTitle = tabs[0].title || '';
          
          // Let the background script sniff the tab
          chrome.runtime.sendMessage({ type: 'SNIFF_TAB', tabId: tabs[0].id, url: currentUrl }, (response) => {
            discoveryResult = response;
            isSniffing = false;
          });
        }
      });
    } else {
      isSniffing = false;
      currentUrl = window.location.href;
      currentTitle = document.title;
    }
  });

  function startCapture() {
    // Send message to background to start a Capture Session
    if (typeof chrome !== 'undefined' && chrome.runtime) {
       chrome.runtime.sendMessage({ type: 'START_CAPTURE_SESSION', discovery: discoveryResult });
    }
  }
</script>

<div class="p-4 h-full flex flex-col bg-gray-50 text-gray-900" transition:fade>
  <div class="flex items-center space-x-3 mb-6">
    <div class="bg-indigo-600 p-2 rounded-lg">
<div class="h-full flex flex-col bg-slate-950 text-slate-100 min-h-screen" transition:fade>
  <div class="flex items-center space-x-3 p-6 border-b border-white/5">
    <div class="bg-indigo-600 p-2 rounded-xl">
      <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
    </div>
    <h1 class="text-xl font-bold">WatchNT Capture</h1>
  </div>

  {#if isSniffing}
    <div class="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10 min-h-[400px]">
      <div class="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
      <p class="text-lg font-medium text-slate-300">Initializing WatchNT pipeline...</p>
    </div>
  {:else if discoveryResult}
    <div class="h-full flex flex-col items-center justify-center relative w-full p-6">
    <div class="glass-panel p-8 rounded-2xl max-w-sm mx-auto w-full text-center relative z-10 border border-white/10 shadow-2xl bg-slate-900/50 backdrop-blur-xl">
      <div class="mb-8">
        <div class="mx-auto w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 border border-indigo-500/30 relative">
          <div class="absolute inset-0 rounded-full border border-indigo-400/20 animate-ping opacity-20"></div>
          <svg class="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-white mb-2 tracking-tight">Ready to Capture</h2>
        <p class="text-sm text-slate-400">
          WatchNT will automatically process the video you are currently watching.
        </p>
      </div>

      <div class="space-y-3">
        {#each lastOutputs as output}
          <div class="text-xs font-mono text-indigo-300 bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20 truncate">
            {output}
          </div>
        {/each}
      </div>

      <div class="space-y-4 mt-8">
        <button 
          onclick={startCapture}
          class="w-full bg-indigo-600 text-white font-medium py-3.5 px-4 rounded-xl hover:bg-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition-all shadow-lg hover:shadow-indigo-500/25 flex justify-center items-center gap-2 group"
        >
          <span>Start Knowledge Capture</span>
          <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </button>
        <button 
          onclick={() => window.open(chrome.runtime.getURL('index.html'), '_blank')}
          class="w-full bg-slate-800/80 text-slate-300 font-medium py-3.5 px-4 rounded-xl hover:bg-slate-700/80 border border-slate-700 hover:text-white transition-all shadow-lg flex justify-center items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          Open Dashboard
        </button>
      </div>
    </div>
  </div>
  {:else}
    <div class="flex-1 flex flex-col items-center justify-center text-center px-4">
      <div class="bg-slate-800 p-3 rounded-full mb-4">
        <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      </div>
      <p class="text-slate-400 text-sm">No supported media or content found on this page.</p>
    </div>
  {/if}
</div>
