<script lang="ts">
  import { page } from '$app/stores';
  import TranscriptViewer from '$lib/components/TranscriptViewer.svelte';

  let videoId = $derived($page.params.id);
  
  let videoElement: HTMLVideoElement | undefined = $state();
  let currentTime = $state(0);

  // Mock fragments for now
  const mockFragments = [
    { id: '1', content: 'Welcome to this demo video.', metadata: JSON.stringify({ startTime: 0, endTime: 5000 }) },
    { id: '2', content: 'Here we discuss AI architectures.', metadata: JSON.stringify({ startTime: 5000, endTime: 12000 }) },
    { id: '3', content: 'And how OPFS speeds up local storage.', metadata: JSON.stringify({ startTime: 12000, endTime: 25000 }) }
  ];

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
        <h1 class="text-2xl font-bold text-gray-900">Video Title (ID: {videoId})</h1>
        <p class="text-gray-500 mt-1">Recorded on Local Platform</p>
      </div>
    </div>

    <!-- Transcript Side Panel -->
    <div class="bg-white rounded-lg shadow p-4">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Transcript</h2>
      <TranscriptViewer 
        fragments={mockFragments} 
        {currentTime} 
        onSeek={handleSeek} 
      />
    </div>
  </div>
</div>
