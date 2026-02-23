import type { TypeNode } from '../model'
import { TypeNodeCard } from './TypeNodeCard'

interface DiagramPanelProps {
  nodes: TypeNode[]
  onChange: (nextNodes: TypeNode[]) => void
}

const CARD_WIDTH = 300
const CARD_HEIGHT = 220
const GAP_X = 40
const GAP_Y = 28

function getNodePosition(index: number) {
  const column = index % 2
  const row = Math.floor(index / 2)

  return {
    left: column * (CARD_WIDTH + GAP_X),
    top: row * (CARD_HEIGHT + GAP_Y),
  }
}

function getNodeCenter(index: number) {
  const position = getNodePosition(index)
  return {
    x: position.left + CARD_WIDTH / 2,
    y: position.top + CARD_HEIGHT / 2,
  }
}

export function DiagramPanel({ nodes, onChange }: DiagramPanelProps) {
  const totalRows = Math.ceil(nodes.length / 2)
  const canvasWidth = CARD_WIDTH * 2 + GAP_X
  const canvasHeight = Math.max(totalRows * CARD_HEIGHT + (totalRows - 1) * GAP_Y, CARD_HEIGHT)

  const nodeIndexByName = new Map(nodes.map((node, index) => [node.name, index]))

  const edges = nodes.flatMap((node, targetIndex) => {
    return node.extends
      .map((baseName) => {
        const sourceIndex = nodeIndexByName.get(baseName)

        if (sourceIndex === undefined) {
          return null
        }

        const source = getNodeCenter(sourceIndex)
        const target = getNodeCenter(targetIndex)

        return {
          id: `${node.id}-${baseName}`,
          x1: source.x,
          y1: source.y,
          x2: target.x,
          y2: target.y,
        }
      })
      .filter((edge): edge is NonNullable<typeof edge> => edge !== null)
  })

  const handleEditNode = (nodeId: string, nextNode: TypeNode) => {
    onChange(nodes.map((node) => (node.id === nodeId ? nextNode : node)))
  }

  return (
    <section className="panel diagram-panel">
      <div className="panel-header">
        <h2>Type Diagram</h2>
      </div>
      <div className="diagram-canvas" style={{ width: canvasWidth, height: canvasHeight }}>
        <svg className="edge-layer" width={canvasWidth} height={canvasHeight}>
          {edges.map((edge) => (
            <line
              key={edge.id}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              stroke="currentColor"
              strokeWidth={2}
              strokeDasharray="4 3"
            />
          ))}
        </svg>

        {nodes.map((node, index) => {
          const position = getNodePosition(index)

          return (
            <div
              key={node.id}
              className="type-node-position"
              style={{ left: position.left, top: position.top, width: CARD_WIDTH }}
            >
              <TypeNodeCard node={node} onEdit={(nextNode) => handleEditNode(node.id, nextNode)} />
            </div>
          )
        })}
      </div>
    </section>
  )
}
