import { useMemo } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Incident } from '../types'

export function EntityGraph({ incident }: { incident: Incident }) {
  const { nodes, edges } = useMemo(() => buildGraph(incident), [incident])

  return (
    <div
      style={{
        height: 420,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--bg-panel)',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
      >
        <MiniMap pannable zoomable />
        <Controls />
        <Background gap={18} size={1} />
      </ReactFlow>
    </div>
  )
}

function buildGraph(incident: Incident): { nodes: Node[]; edges: Edge[] } {
  const geo = incident.evidence?.geo as { country?: string } | undefined
  const url =
    typeof incident.evidence === 'object' && incident.evidence
      ? String((incident.evidence as { url?: string }).url || '/login')
      : '/login'

  const nodes: Node[] = [
    node('ip', 'IP', incident.src_ip, 40, 160, '#ef4444'),
    node('incident', 'Incident', incident.id, 280, 160, '#3d8bfd'),
    node('asset', 'Asset', 'skyline-web', 520, 80, '#22c55e'),
    node('user', 'User', incident.owner || 'unknown', 520, 240, '#a855f7'),
    node('url', 'URL', url, 280, 320, '#f97316'),
    node('country', 'Geo', geo?.country || 'Unknown', 40, 320, '#eab308'),
  ]

  if (incident.technique_ids[0]) {
    nodes.push(
      node('tech', 'Technique', incident.technique_ids[0], 520, 320, '#06b6d4'),
    )
  }

  const edges: Edge[] = [
    edge('ip', 'incident'),
    edge('incident', 'asset'),
    edge('incident', 'user'),
    edge('incident', 'url'),
    edge('ip', 'country'),
  ]
  if (incident.technique_ids[0]) edges.push(edge('incident', 'tech'))

  return { nodes, edges }
}

function node(
  id: string,
  kind: string,
  label: string,
  x: number,
  y: number,
  color: string,
): Node {
  return {
    id,
    position: { x, y },
    data: {
      label: (
        <div style={{ fontSize: 12, lineHeight: 1.3 }}>
          <div style={{ opacity: 0.7 }}>{kind}</div>
          <strong>{label}</strong>
        </div>
      ),
    },
    style: {
      background: '#121a2b',
      color: '#e8eef9',
      border: `2px solid ${color}`,
      borderRadius: 12,
      padding: 10,
      width: 150,
    },
  }
}

function edge(source: string, target: string): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#93a4c3' },
  }
}
