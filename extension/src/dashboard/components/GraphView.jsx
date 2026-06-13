import React, { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import api from '../../storage/api.js';

export function GraphView() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef(null);

  useEffect(() => {
    // Resize observer to make graph responsive
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight
      });
    }

    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/cards?limit=100');
        const cards = res.cards || [];

        const nodes = [];
        const links = [];
        const tagMap = new Map();

        cards.forEach(card => {
          // Add Card Node
          nodes.push({
            id: `card-${card.id}`,
            name: card.title,
            type: 'card',
            val: 3 // size
          });

          if (card.tags && Array.isArray(card.tags)) {
            card.tags.forEach(tag => {
              const tagId = `tag-${tag}`;
              if (!tagMap.has(tagId)) {
                tagMap.set(tagId, true);
                nodes.push({
                  id: tagId,
                  name: tag,
                  type: 'tag',
                  val: 1.5 // size
                });
              }

              // Add Edge
              links.push({
                source: `card-${card.id}`,
                target: tagId
              });
            });
          }
        });

        setGraphData({ nodes, links });
      } catch (err) {
        console.error('Failed to load graph data:', err);
      }
    }

    loadData();
  }, []);

  return (
    <div className="graph-view" ref={containerRef} style={{ width: '100%', height: 'calc(100vh - 140px)', background: 'var(--bg-surface)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
      {graphData.nodes.length > 0 ? (
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="name"
          nodeColor={node => node.type === 'card' ? '#6366f1' : '#a855f7'} // Indigo for cards, Purple for tags
          linkColor={() => 'rgba(255, 255, 255, 0.1)'}
          nodeRelSize={4}
          backgroundColor="#18181b"
          linkWidth={1.5}
        />
      ) : (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Loading Knowledge Graph...
        </div>
      )}
    </div>
  );
}
