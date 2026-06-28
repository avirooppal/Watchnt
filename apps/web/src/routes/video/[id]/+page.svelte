<script lang="ts">
  import { page } from '$app/stores';
  let videoId = $derived($page.params.id);
</script>

<svelte:head>
  <title>Video {videoId} - Watch'nt</title>
</svelte:head>

<div class="px-4 sm:px-0">
  <div class="mb-6">
    <a href="/" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
      &larr; Back to Library
    </a>
  </div>
  
  <div class="bg-white shadow sm:rounded-lg mb-8">
    <div class="px-4 py-5 sm:p-6">
      <h3 class="text-lg leading-6 font-medium text-gray-900">
        Video Details (ID: {videoId})
      </h3>
      <div class="mt-2 max-w-xl text-sm text-gray-500">
        <p>This page will host the video player and transcription viewer.</p>
      </div>
    </div>
  </div>
</div>
