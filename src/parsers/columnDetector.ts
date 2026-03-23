import type { TextItem } from './types'

interface XCluster {
  center: number
  min: number
  max: number
  count: number
}

/**
 * Cluster x-positions of text items to detect table columns.
 * Items within `tolerance` points of each other are grouped.
 */
export function clusterXPositions(items: TextItem[], tolerance = 15): XCluster[] {
  if (items.length === 0) return []

  // Collect all x positions
  const positions = items.map(item => item.x).sort((a, b) => a - b)

  // Group nearby positions into clusters
  const clusters: XCluster[] = []
  let currentCluster: number[] = [positions[0]]

  for (let i = 1; i < positions.length; i++) {
    if (positions[i] - positions[i - 1] <= tolerance) {
      currentCluster.push(positions[i])
    } else {
      clusters.push(makeCluster(currentCluster))
      currentCluster = [positions[i]]
    }
  }
  clusters.push(makeCluster(currentCluster))

  return clusters.filter(c => c.count >= 2) // Filter noise
}

function makeCluster(positions: number[]): XCluster {
  const min = Math.min(...positions)
  const max = Math.max(...positions)
  const sum = positions.reduce((a, b) => a + b, 0)
  return {
    center: sum / positions.length,
    min,
    max,
    count: positions.length,
  }
}

/**
 * Group text items by their y-position (same row).
 * Items within `tolerance` y-points are considered on the same line.
 */
export function groupByRow(items: TextItem[], tolerance = 3): TextItem[][] {
  if (items.length === 0) return []

  const sorted = [...items].sort((a, b) => a.y - b.y)
  const rows: TextItem[][] = []
  let currentRow: TextItem[] = [sorted[0]]
  let currentY = sorted[0].y

  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].y - currentY) <= tolerance) {
      currentRow.push(sorted[i])
    } else {
      rows.push(currentRow.sort((a, b) => a.x - b.x))
      currentRow = [sorted[i]]
      currentY = sorted[i].y
    }
  }
  rows.push(currentRow.sort((a, b) => a.x - b.x))

  return rows
}

/**
 * Determine which column a text item belongs to based on its x-position.
 * Returns the column index, or -1 if no match.
 */
export function classifyColumn(x: number, clusters: XCluster[], tolerance = 20): number {
  for (let i = 0; i < clusters.length; i++) {
    if (x >= clusters[i].min - tolerance && x <= clusters[i].max + tolerance) {
      return i
    }
  }
  return -1
}
