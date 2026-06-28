<script lang="ts">
  let { fragments, currentTime, onSeek } = $props<{
    fragments: any[];
    currentTime: number;
    onSeek: (time: number) => void;
  }>();

  // Helper to check if a fragment is active
  // Wait, fragment metadata stores start/end times?
  // Our Note schema has timestamp_ms. KnowledgeFragment has metadata (stringified JSON)
  // Let's assume fragments have { metadata: string } where JSON parses to { startTime: number, endTime: number }
  
  function getTimestamps(fragment: any) {
    try {
      const meta = fragment.metadata ? (typeof fragment.metadata === 'string' ? JSON.parse(fragment.metadata) : fragment.metadata) : {};
      return {
        start: (meta.startMs ?? meta.startTime ?? 0) / 1000,
        end: (meta.endMs ?? meta.endTime ?? 0) / 1000
      };
    } catch {
      return { start: 0, end: 0 };
    }
  }
</script>

<div class="flex flex-col gap-3 max-h-96 overflow-y-auto p-2 bg-gray-50 rounded-md border border-gray-200">
  {#each fragments as fragment}
    {@const { start, end } = getTimestamps(fragment)}
    {@const active = currentTime >= start && currentTime < end}
    
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
      class="p-3 rounded-md cursor-pointer transition {active ? 'bg-indigo-100 border-l-4 border-indigo-600' : 'bg-white hover:bg-gray-100'}"
      onclick={() => onSeek(start)}
    >
      <div class="text-xs text-indigo-500 font-medium mb-1">
        {Math.floor(start / 60)}:{(Math.floor(start % 60)).toString().padStart(2, '0')}
      </div>
      <p class="text-gray-800 text-sm">{fragment.content}</p>
    </div>
  {/each}
</div>
