<script lang="ts">
  let { videos } = $props<{ videos: any[] }>();
</script>

{#if videos.length === 0}
  <div class="text-center py-24 glass-panel rounded-2xl max-w-2xl mx-auto">
    <svg class="mx-auto h-16 w-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
    <h3 class="mt-2 text-xl font-semibold text-slate-200">No content in your library</h3>
    <p class="mt-2 text-slate-400">Get started by capturing a video or uploading one.</p>
  </div>
{:else}
  <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {#each videos as video}
      <a href={`/video/${video.id}`} class="glass-card rounded-2xl overflow-hidden group block">
        <div class="aspect-w-16 aspect-h-9 bg-slate-800/50 relative overflow-hidden">
          {#if video.metadata?.thumbnailUrl}
            <img src={video.metadata.thumbnailUrl} alt={video.title} class="object-cover w-full h-full opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
          {:else}
            <div class="flex items-center justify-center h-48 w-full bg-slate-800/50 border-b border-white/5">
              <svg class="h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          {/if}
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent"></div>
        </div>
        <div class="p-5 relative">
          <h3 class="text-lg font-semibold text-slate-100 truncate group-hover:text-indigo-400 transition-colors">{video.title || 'Untitled Knowledge'}</h3>
          <div class="mt-3 flex items-center justify-between text-sm text-slate-400">
            <span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> {new Date(video.created_at).toLocaleDateString()}</span>
            {#if video.metadata?.duration}
              <span class="bg-slate-800/80 px-2 py-0.5 rounded-md text-xs font-medium border border-white/5">{Math.floor(video.metadata.duration / 60)}:{String(Math.floor(video.metadata.duration % 60)).padStart(2, '0')}</span>
            {/if}
          </div>
        </div>
      </a>
    {/each}
  </div>
{/if}
