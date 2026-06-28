<script lang="ts">
  import LibraryGrid from '$lib/components/LibraryGrid.svelte';
  import { dbStore } from '$lib/stores/db.svelte';
  import { isSuccess } from '@watchnt/shared';
  import { onMount } from 'svelte';
  
  let videos = $state<any[]>([]);

  $effect(() => {
    if (dbStore.facade) {
      dbStore.facade.content.listByType('video').then(res => {
        if (isSuccess(res)) {
          videos = res.value;
        }
      });
    }
  });
</script>

<svelte:head>
  <title>Library - Watch'nt</title>
</svelte:head>

<div class="px-4 sm:px-0">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-semibold text-gray-900">My Library</h1>
    <button class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">
      Add Content
    </button>
  </div>
  
  <LibraryGrid {videos} />
</div>
