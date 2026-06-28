<script lang="ts">
  import { page } from '$app/stores';
  import TranscriptViewer from '$lib/components/TranscriptViewer.svelte';
  import { dbStore } from '$lib/stores/db.svelte';
  import { isSuccess } from '@watchnt/shared';

  let videoId = $derived($page.params.id);
  
  let videoElement: HTMLVideoElement | undefined = $state();
  let currentTime = $state(0);
  let fragments = $state<any[]>([]);
  let videoRecord = $state<any>(null);

  // Notes state
  let noteId = $derived(`note-${videoId}` as any);
  let noteText = $state('');
  let loadingNote = $state(true);
  let saveStatus = $state('All changes saved');
  let saveTimeout: any;

  $effect(() => {
    if (dbStore.facade) {
      // Load content
      dbStore.facade.content.get(videoId).then(res => {
        if (isSuccess(res)) videoRecord = res.value;
      });
      
      // Load note
      dbStore.facade.notes.getByContentId(videoId).then(res => {
        if (isSuccess(res) && res.value.length > 0) {
          noteText = res.value[0].text;
        }
        loadingNote = false;
      });
      
      const pollFragments = async () => {
        const res = await dbStore.facade!.knowledge.getFragmentsByType(videoId, 'chunk');
        if (isSuccess(res) && res.value.length > 0) {
          fragments = res.value;
        } else {
          setTimeout(pollFragments, 500);
        }
      };
      
      pollFragments();
    }
  });

  async function handleNoteChange() {
    saveStatus = 'Saving...';
    clearTimeout(saveTimeout);
    
    saveTimeout = setTimeout(async () => {
      if (dbStore.facade) {
        const isUpdate = (await dbStore.facade.notes.getByContentId(videoId)).value?.length > 0;
        await dbStore.facade.notesService.saveNote(noteId, videoId, noteText, isUpdate, Math.floor(currentTime * 1000));
        saveStatus = 'Saved';
      }
    }, 1000);
  }

  function handleTimeUpdate(e: Event) {
    const target = e.target as HTMLVideoElement;
    currentTime = target.currentTime;
  }

  function handleSeek(timeInSeconds: number) {
    if (videoElement) {
      videoElement.currentTime = timeInSeconds;
      videoElement.play().catch(() => {}); // Play if not playing
    }
  }
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
  
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Video Player Area -->
    <div class="lg:col-span-2">
      <div class="bg-black aspect-video rounded-lg overflow-hidden shadow">
        <!-- Mock video element for layout -->
        <!-- svelte-ignore a11y_media_has_caption -->
        <video 
          bind:this={videoElement}
          class="w-full h-full object-contain"
          controls
          ontimeupdate={handleTimeUpdate}
          src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
          crossorigin="anonymous"
        ></video>
      </div>
      <div class="mt-4">
        <h1 class="text-2xl font-bold text-gray-900">{videoRecord?.title || `Video ID: ${videoId}`}</h1>
        <p class="text-gray-500 mt-1">Recorded on Local Platform</p>
      </div>

      <!-- Notes Editor Area -->
      <div class="mt-8 bg-white rounded-lg shadow p-4 border-t-4 border-indigo-500">
        <h2 class="text-lg font-semibold text-gray-900 mb-2">My Notes</h2>
        <p class="text-sm text-gray-500 mb-4">Use [[Wikilinks]] to connect concepts. E.g. <code>[[Machine Learning]]</code></p>
        {#if loadingNote}
          <div class="h-32 bg-gray-100 animate-pulse rounded"></div>
        {:else}
          <textarea
            class="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="Type your notes here..."
            bind:value={noteText}
            oninput={handleNoteChange}
          ></textarea>
          <div class="flex justify-between items-center mt-2 text-sm text-gray-500">
            <span>{saveStatus}</span>
            <a href="/graph" class="text-indigo-600 hover:underline">View Knowledge Graph &rarr;</a>
          </div>
        {/if}
      </div>
    </div>

    <!-- Transcript Side Panel -->
    <div class="bg-white rounded-lg shadow p-4">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Transcript</h2>
      <TranscriptViewer 
        {fragments} 
        {currentTime} 
        onSeek={handleSeek} 
      />
    </div>
  </div>
</div>
