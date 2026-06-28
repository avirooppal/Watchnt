<script lang="ts">
  import LibraryGrid from '$lib/components/LibraryGrid.svelte';
  import { dbStore } from '$lib/stores/db.svelte';
  import { pipelineStore } from '$lib/stores/pipeline.svelte';
  import { isSuccess } from '@watchnt/shared';
  
  let videos = $state<any[]>([]);
  let fileInput: HTMLInputElement;

  $effect(() => {
    if (dbStore.facade) {
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
  <title>Library - Watch'nt</title>
</svelte:head>

<div class="px-4 sm:px-0">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-semibold text-gray-900">My Library</h1>
    <div class="flex items-center space-x-4">
      <a href="/flashcards" class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
        <svg class="-ml-1 mr-2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        Review Flashcards
      </a>
      <input type="file" accept="video/webm,video/mp4" class="hidden" bind:this={fileInput} onchange={handleUpload} />
      <button 
        onclick={() => fileInput.click()}
        class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition"
      >
        Add Content
      </button>
    </div>
  </div>
  
  <LibraryGrid {videos} />
</div>
