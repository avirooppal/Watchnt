<script lang="ts">
  import GraphView from '$lib/components/GraphView.svelte';
  import { dbStore } from '$lib/stores/db.svelte';
  import { isSuccess } from '@watchnt/shared';

  let graphData = $state<{ nodes: any[], links: any[] }>({ nodes: [], links: [] });
  let loading = $state(true);

  $effect(() => {
    if (dbStore.facade) {
      loading = true;
      Promise.all([
        dbStore.facade.graph.getAllEntities(),
        dbStore.facade.graph.getAllEdges()
      ]).then(([entitiesRes, edgesRes]) => {
        if (isSuccess(entitiesRes) && isSuccess(edgesRes)) {
          const nodes = entitiesRes.value.map(e => ({
            id: e.id,
            name: e.name,
            type: e.type,
            color: getColorForType(e.type),
            description: `Entity mapped to content ${e.content_id}`
          }));

          const links = edgesRes.value.map(e => ({
            id: e.id,
            source: e.source_id,
            target: e.target_id,
            relationship: e.relationship
          }));

          graphData = { nodes, links };
        }
        loading = false;
      }).catch(err => {
        console.error('Failed to load graph data', err);
        loading = false;
      });
    }
  });

  function getColorForType(type: string): string {
    const colors: Record<string, string> = {
      person: '#fb7185', // rose-400
      concept: '#818cf8', // indigo-400
      organization: '#34d399', // emerald-400
      technology: '#f472b6', // pink-400
      default: '#94a3b8' // slate-400
    };
    return colors[type.toLowerCase()] || colors.default;
  }
</script>

<svelte:head>
  <title>Knowledge Graph - Watch'nt</title>
</svelte:head>

<div class="px-4 sm:px-0">
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-gray-900">Knowledge Graph</h1>
    <p class="text-gray-500 mt-2">Visualize the connections between your extracted entities and notes.</p>
  </div>
  
  {#if loading}
    <div class="flex items-center justify-center h-96 bg-gray-50 rounded-xl border border-gray-100">
      <div class="animate-pulse text-gray-400 font-medium">Loading graph...</div>
    </div>
  {:else if graphData.nodes.length === 0}
    <div class="flex items-center justify-center h-96 bg-gray-50 rounded-xl border border-gray-100">
      <div class="text-gray-500 text-center">
        <p class="font-medium text-gray-700">No knowledge graph data yet.</p>
        <p class="text-sm mt-1">Upload and process content to extract entities.</p>
      </div>
    </div>
  {:else}
    <div class="shadow-2xl rounded-2xl overflow-hidden ring-1 ring-gray-900/5">
      <GraphView {graphData} />
    </div>
  {/if}
</div>
