<script lang="ts">
  import LibraryGrid from '$lib/components/LibraryGrid.svelte';
  import CaptureMode from '$lib/components/CaptureMode.svelte';
  import Onboarding from '$lib/components/Onboarding.svelte';
  import { dbStore } from '$lib/stores/db.svelte';
  import { pipelineStore } from '$lib/stores/pipeline.svelte';
  import { isSuccess } from '@watchnt/shared';
  import { onMount } from 'svelte';
  
  let videos = $state<any[]>([]);
  let fileInput = $state<HTMLInputElement>();
  let isPopup = $state(false);
  let mounted = $state(false);
  let isConfigured = $state(false);
  let loadingSettings = $state(true);

  onMount(() => {
    // If window width is less than 800px, we assume it's the extension popup.
    // The popup is fixed at 600px width.
    isPopup = window.innerWidth < 800;
    mounted = true;
  });

  $effect(() => {
    if (dbStore.settings && loadingSettings) {
      dbStore.settings.get('openai_api_key').then((res) => {
        if (isSuccess(res) && res.value) {
          isConfigured = true;
        }
        loadingSettings = false;
      });
    }

    if (dbStore.facade && !isPopup) {
      dbStore.facade.content.listByType('video').then(res => {
        if (isSuccess(res)) {
          videos = res.value;
        }
      });
    }
  });

  async function handleUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      try {
        await pipelineStore.uploadVideo(file);
        // Refresh the list after pipeline starts
        if (dbStore.facade) {
          const res = await dbStore.facade.content.listByType('video');
          if (isSuccess(res)) videos = res.value;
        }
      } catch (err) {
        console.error('Failed to upload', err);
      }
    }
  }
</script>

<svelte:head>
  <title>WatchNT</title>
</svelte:head>

{#if mounted && !loadingSettings}
  {#if isPopup}
    {#if isConfigured}
      <CaptureMode />
    {:else}
      <Onboarding onComplete={() => (isConfigured = true)} />
    {/if}
  {:else}
    <div class="px-4 sm:px-0">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-white tracking-tight">My Library</h1>
        <div class="flex items-center space-x-4">
          <a href="/flashcards" class="inline-flex items-center px-4 py-2.5 border border-white/10 shadow-sm text-sm font-medium rounded-xl text-slate-200 bg-slate-900/50 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 backdrop-blur-md transition-all">
            <svg class="-ml-1 mr-2 h-5 w-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            Review Flashcards
          </a>
          <input type="file" accept="video/webm,video/mp4" class="hidden" bind:this={fileInput} onchange={handleUpload} />
          <button 
            onclick={() => fileInput.click()}
            class="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-500 transition-all font-medium shadow-lg hover:shadow-indigo-500/25 border border-indigo-500/30 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            Add Content
          </button>
        </div>
      </div>
      
      <LibraryGrid {videos} />
    </div>
  {/if}
{/if}
