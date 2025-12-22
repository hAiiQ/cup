import { useMemo } from 'react'
import type { ReactNode } from 'react'
import type {
  BracketMatch,
  BracketNodeLayout,
  BracketConnection
} from '@/lib/bracketStructure'

const MATCH_WIDTH = 360
const MATCH_HEIGHT = 72
const COLUMN_GAP = 110
const ROW_GAP = 30
const CONNECTOR_COLOR = 'rgba(230,233,255,0.3)'
const CONNECTOR_WIDTH = 2.5

type MatchRenderer = (match: BracketMatch | undefined, id: string) => ReactNode

interface BracketDiagramProps {
  matches: BracketMatch[]
  layout: BracketNodeLayout[]
  connections?: BracketConnection[]
  renderMatch: MatchRenderer
  className?: string
}

const getBoxPosition = (node: BracketNodeLayout) => ({
  left: (node.column - 1) * (MATCH_WIDTH + COLUMN_GAP),
  top: (node.row - 1) * (MATCH_HEIGHT + ROW_GAP)
})

const createConnectorPath = (from: { left: number; top: number }, to: { left: number; top: number }): string => {
  const startX = from.left + MATCH_WIDTH
  const startY = from.top + MATCH_HEIGHT / 2
  const endX = to.left
  const endY = to.top + MATCH_HEIGHT / 2
  const horizontalDistance = Math.max(endX - startX, 1)
  const rawOffset = Math.max(horizontalDistance * 0.35, 30)
  const maxOffset = Math.max(horizontalDistance - 12, 12)
  const safeOffset = Math.min(rawOffset, maxOffset)

  const controlOffset = safeOffset <= 0 ? horizontalDistance / 2 : safeOffset
  const cp1X = startX + controlOffset
  const cp2X = endX - controlOffset

  if (cp2X <= cp1X) {
    const fallback = horizontalDistance / 2
    return `M${startX},${startY} C${startX + fallback},${startY} ${endX - fallback},${endY} ${endX},${endY}`
  }

  return `M${startX},${startY} C${cp1X},${startY} ${cp2X},${endY} ${endX},${endY}`
}

const BracketDiagram = ({
  matches,
  layout,
  connections = [],
  renderMatch,
  className = ''
}: BracketDiagramProps) => {
  const matchMap = useMemo(() => {
    return new Map(matches.map(match => [match.id, match]))
  }, [matches])

  const positionedLayout = useMemo(() => {
    return layout.map(node => ({
      ...node,
      position: getBoxPosition(node)
    }))
  }, [layout])

  const maxColumn = useMemo(() => {
    return layout.reduce((max, node) => Math.max(max, node.column), 0)
  }, [layout])

  const maxRow = useMemo(() => {
    return layout.reduce((max, node) => Math.max(max, node.row), 0)
  }, [layout])

  const width = Math.max(1, maxColumn) * MATCH_WIDTH + Math.max(0, maxColumn - 1) * COLUMN_GAP
  const height = Math.max(1, maxRow) * MATCH_HEIGHT + Math.max(0, maxRow - 1) * ROW_GAP

  const nodePositions = useMemo(() => {
    const map = new Map<string, { left: number; top: number }>()
    positionedLayout.forEach(node => map.set(node.id, node.position))
    return map
  }, [positionedLayout])

  return (
    <div className={`relative ${className}`}>
      <div
        className="relative"
        style={{
          width: `${width}px`,
          height: `${height}px`
        }}
      >
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          width={width}
          height={height}
        >
          {connections.map(([fromId, toId]) => {
            const from = nodePositions.get(fromId)
            const to = nodePositions.get(toId)

            if (!from || !to) {
              return null
            }

            const pathD = createConnectorPath(from, to)

            return (
              <path
                key={`${fromId}-${toId}`}
                d={pathD}
                fill="none"
                stroke={CONNECTOR_COLOR}
                strokeWidth={CONNECTOR_WIDTH}
                strokeLinecap="round"
              />
            )
          })}
        </svg>

        {positionedLayout.map(node => {
          const match = matchMap.get(node.id)
          return (
            <div
              key={node.id}
              className="absolute"
              style={{
                left: `${node.position.left}px`,
                top: `${node.position.top}px`,
                width: `${MATCH_WIDTH}px`,
                height: `${MATCH_HEIGHT}px`
              }}
            >
              <div className="h-full">
                {renderMatch(match, node.id)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BracketDiagram
