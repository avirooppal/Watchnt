<script lang="ts">
  import LibraryGrid from '$lib/components/LibraryGrid.svelte';
  
  // Mock data for now, since we haven't wired ModelFacade in the UI yet
  const videos = [
    { id: 'vid-1', title: 'Example Video 1', thumbnail: '', duration_ms: 120000, created_at: Date.now() },
    { id: 'vid-2', title: 'Example Video 2', thumbnail: '', duration_ms: 240000, created_at: Date.now() }
  ];
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
