<script lang="ts">
  import VideoCard from './VideoCard.svelte';
  let { videos } = $props<{ videos: any[] }>();
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
  {#each videos as video}
    <VideoCard {video} />
  {/each}
</div>
