<script lang="ts">
  let { video } = $props<{ video: any }>();
  
  // format duration
  const mins = $derived(Math.floor(video.duration_ms / 60000));
  const secs = $derived(Math.floor((video.duration_ms % 60000) / 1000));
  const durationStr = $derived(`${mins}:${secs.toString().padStart(2, '0')}`);
</script>

<a href="/video/{video.id}" class="group block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
  <div class="aspect-video bg-gray-200 relative flex items-center justify-center">
    {#if video.thumbnail}
      <img src={video.thumbnail} alt={video.title} class="w-full h-full object-cover" />
    {:else}
      <span class="text-gray-400">No Thumbnail</span>
    {/if}
    <div class="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
      {durationStr}
    </div>
  </div>
  <div class="p-4">
    <h3 class="font-medium text-gray-900 truncate group-hover:text-indigo-600 transition">{video.title}</h3>
    <p class="text-sm text-gray-500 mt-1">
      {new Date(video.created_at).toLocaleDateString()}
    </p>
  </div>
</a>
