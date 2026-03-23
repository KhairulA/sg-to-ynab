import { describe, it, expect } from 'vitest'
import { clusterXPositions, groupByRow, classifyColumn } from './columnDetector'
import type { TextItem } from './types'

function makeItem(str: string, x: number, y: number): TextItem {
  return { str, x, y, width: 30, height: 10, fontName: 'Arial' }
}

describe('clusterXPositions', () => {
  it('returns empty for empty input', () => {
    expect(clusterXPositions([])).toEqual([])
  })

  it('groups nearby x positions', () => {
    const items = [
      makeItem('a', 50, 0),
      makeItem('b', 52, 0),
      makeItem('c', 200, 0),
      makeItem('d', 203, 0),
    ]
    const clusters = clusterXPositions(items, 15)
    expect(clusters).toHaveLength(2)
    expect(clusters[0].min).toBe(50)
    expect(clusters[1].min).toBe(200)
  })

  it('filters clusters with count < 2', () => {
    const items = [
      makeItem('a', 50, 0),
      makeItem('b', 50, 0),
      makeItem('c', 500, 0), // isolated
    ]
    const clusters = clusterXPositions(items, 15)
    expect(clusters).toHaveLength(1)
    expect(clusters[0].count).toBe(2)
  })

  it('uses custom tolerance', () => {
    const items = [
      makeItem('a', 50, 0),
      makeItem('b', 60, 0),
      makeItem('c', 70, 0),
    ]
    // tolerance=5 should separate 50 and 60 (diff=10>5), but 60 and 70 stay together
    // Actually: sorted [50,60,70], 60-50=10>5 so split; 70-60=10>5 so split
    // All single items → all filtered out
    expect(clusterXPositions(items, 5)).toEqual([])
    // tolerance=15: all in one cluster
    const c = clusterXPositions(items, 15)
    expect(c).toHaveLength(1)
    expect(c[0].count).toBe(3)
  })
})

describe('groupByRow', () => {
  it('returns empty for empty input', () => {
    expect(groupByRow([])).toEqual([])
  })

  it('groups items by y position', () => {
    const items = [
      makeItem('a', 10, 100),
      makeItem('b', 50, 101),
      makeItem('c', 10, 200),
      makeItem('d', 50, 200),
    ]
    const rows = groupByRow(items, 3)
    expect(rows).toHaveLength(2)
    expect(rows[0].map(i => i.str)).toEqual(['a', 'b'])
    expect(rows[1].map(i => i.str)).toEqual(['c', 'd'])
  })

  it('sorts items within a row by x position', () => {
    const items = [
      makeItem('b', 200, 100),
      makeItem('a', 50, 100),
    ]
    const rows = groupByRow(items, 3)
    expect(rows[0].map(i => i.str)).toEqual(['a', 'b'])
  })
})

describe('classifyColumn', () => {
  const clusters = [
    { center: 50, min: 45, max: 55, count: 5 },
    { center: 200, min: 195, max: 205, count: 5 },
  ]

  it('classifies x within a cluster', () => {
    expect(classifyColumn(50, clusters)).toBe(0)
    expect(classifyColumn(200, clusters)).toBe(1)
  })

  it('classifies x within tolerance', () => {
    expect(classifyColumn(30, clusters, 20)).toBe(0)
  })

  it('returns -1 for unmatched x', () => {
    expect(classifyColumn(500, clusters)).toBe(-1)
  })
})
