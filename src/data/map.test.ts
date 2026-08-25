import { describe, expect, it } from 'vitest'
import { ADJACENCY, DETECTIVE_STARTS, EDGES, FUGITIVE_STARTS, STATIONS, validateMapData } from './map'

describe('canonical map data', () => {
  it('contains the complete corrected graph', () => {
    expect(STATIONS).toHaveLength(199)
    expect(EDGES).toHaveLength(468)
    expect(validateMapData()).toEqual([])
  })

  it('contains separate official start pools', () => {
    expect(DETECTIVE_STARTS).toHaveLength(16)
    expect(FUGITIVE_STARTS).toHaveLength(13)
    expect(DETECTIVE_STARTS.some((station) => FUGITIVE_STARTS.includes(station))).toBe(false)
  })

  it('builds every route in both directions', () => {
    for (const edge of EDGES) {
      expect(ADJACENCY.get(edge.from)).toContainEqual({ to: edge.to, transport: edge.transport })
      expect(ADJACENCY.get(edge.to)).toContainEqual({ to: edge.from, transport: edge.transport })
    }
  })
})
