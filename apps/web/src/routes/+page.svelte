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
    <div>
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
