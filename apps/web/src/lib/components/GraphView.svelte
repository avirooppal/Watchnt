<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  
  let { graphData } = $props<{ graphData: { nodes: any[], links: any[] } }>();
  
  let graphContainer: HTMLDivElement;
  let forceGraphInstance: any;
  let selectedNode = $state<any>(null);

  onMount(async () => {
    // Dynamically import force-graph to avoid SSR issues
    const ForceGraphModule = await import('force-graph');
    const ForceGraph = ForceGraphModule.default;

    forceGraphInstance = ForceGraph()(graphContainer)
      .graphData(graphData)
      .nodeId('id')
      .nodeLabel('name')
      .nodeAutoColorBy('type')
      .nodeRelSize(6)
      .linkSource('source')
      .linkTarget('target')
      .linkLabel('relationship')
      .linkDirectionalArrowLength(3.5)
      .linkDirectionalArrowRelPos(1)
      .onNodeClick(node => {
        selectedNode = node;
        // Center/zoom on node
        forceGraphInstance.centerAt(node.x, node.y, 1000);
        forceGraphInstance.zoom(8, 2000);
      })
      .onBackgroundClick(() => {
        selectedNode = null;
      });
      
    // Apply premium dark styling to the graph rendering
    forceGraphInstance.backgroundColor('#0f172a'); // slate-900
    forceGraphInstance.nodeCanvasObject((node: any, ctx: any, globalScale: any) => {
      const label = node.name || node.id;
      const fontSize = 12 / globalScale;
      ctx.font = `${fontSize}px Inter, sans-serif`;
      const textWidth = ctx.measureText(label).width;
      const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
      ctx.fillStyle = node.color || '#3b82f6';
      ctx.fill();
      
      // Node label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, node.x, node.y + 8 + fontSize/2);
    });
    
    // Fit to container dynamically
    const resizeObserver = new ResizeObserver(() => {
      if (graphContainer) {
        forceGraphInstance.width(graphContainer.clientWidth);
        forceGraphInstance.height(graphContainer.clientHeight);
      }
    });
    resizeObserver.observe(graphContainer);
    
    return () => {
      resizeObserver.disconnect();
      forceGraphInstance._destructor();
    };
  });

  // React to data changes
  $effect(() => {
    if (forceGraphInstance && graphData.nodes.length > 0) {
      forceGraphInstance.graphData(graphData);
    }
  });
</script>

<div class="graph-layout">
  <div class="graph-canvas-wrapper" bind:this={graphContainer}></div>
  
  {#if selectedNode}
    <div class="graph-side-panel">
      <button class="close-btn" onclick={() => selectedNode = null}>&times;</button>
      <h3 class="panel-title">{selectedNode.name}</h3>
      <div class="panel-meta">
        <span class="type-badge">{selectedNode.type}</span>
      </div>
      <div class="panel-section">
        <h4 class="section-heading">Details</h4>
        <p class="section-text">
          {selectedNode.description || 'No additional description available.'}
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Rich Vanilla CSS for premium aesthetics */
  
  .graph-layout {
    position: relative;
    width: 100%;
    height: 600px;
    border-radius: 16px;
    overflow: hidden;
    background: #0f172a;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .graph-canvas-wrapper {
    width: 100%;
    height: 100%;
  }

  .graph-side-panel {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 320px;
    max-height: calc(100% - 32px);
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 24px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    color: white;
    font-family: 'Inter', sans-serif;
    animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    overflow-y: auto;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .close-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    transition: color 0.2s;
  }

  .close-btn:hover {
    color: white;
  }

  .panel-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 12px 0;
    background: linear-gradient(to right, #60a5fa, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .panel-meta {
    margin-bottom: 24px;
  }

  .type-badge {
    display: inline-block;
    padding: 4px 10px;
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.4);
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #93c5fd;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .panel-section {
    margin-top: 20px;
  }

  .section-heading {
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.5);
    margin: 0 0 8px 0;
    font-weight: 600;
  }

  .section-text {
    font-size: 0.95rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.85);
    margin: 0;
  }
</style>
