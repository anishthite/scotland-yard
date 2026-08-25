import stationsRaw from './stations.txt?raw'
import connectionsRaw from './connections.txt?raw'
import type { Edge, Station, Transport } from '../game/types'

const parseLines = (raw: string) =>
  raw
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

export const STATIONS: Station[] = parseLines(stationsRaw).map((line) => {
  const [id, x, y, transportList] = line.split(/\s+/)
  return {
    id: Number(id),
    x: Number(x),
    y: Number(y),
    transports: transportList.split(',') as Station['transports'],
  }
})

export const EDGES: Edge[] = parseLines(connectionsRaw).map((line) => {
  const [from, to, transport] = line.split(/\s+/)
  return { from: Number(from), to: Number(to), transport: transport as Transport }
})

export const STATION_BY_ID = new Map(STATIONS.map((station) => [station.id, station]))

export interface Connection {
  to: number
  transport: Transport
}

export const ADJACENCY = new Map<number, Connection[]>()
for (const station of STATIONS) ADJACENCY.set(station.id, [])
for (const edge of EDGES) {
  ADJACENCY.get(edge.from)?.push({ to: edge.to, transport: edge.transport })
  ADJACENCY.get(edge.to)?.push({ to: edge.from, transport: edge.transport })
}

for (const connections of ADJACENCY.values()) {
  connections.sort((a, b) => a.to - b.to || a.transport.localeCompare(b.transport))
}

export const DETECTIVE_STARTS = [13, 26, 29, 34, 50, 53, 91, 94, 103, 112, 117, 123, 138, 141, 155, 174]
export const FUGITIVE_STARTS = [35, 45, 51, 71, 78, 104, 106, 127, 132, 146, 166, 170, 172]
export const REVEAL_SLOTS = [3, 8, 13, 18]
export const MAX_TRAVEL_SLOTS = 22

export const TRANSPORT_LABELS: Record<Transport, string> = {
  taxi: 'Cab',
  bus: 'Bus',
  underground: 'Rail',
  water: 'Ferry',
}

export const TRANSPORT_SHORT: Record<Transport | 'black', string> = {
  taxi: 'T',
  bus: 'B',
  underground: 'U',
  water: 'F',
  black: '?',
}

export function validateMapData() {
  const errors: string[] = []
  const stationIds = new Set(STATIONS.map((station) => station.id))
  if (STATIONS.length !== 199) errors.push(`Expected 199 stations, received ${STATIONS.length}`)
  for (let id = 1; id <= 199; id += 1) {
    if (!stationIds.has(id)) errors.push(`Missing station ${id}`)
  }
  const seen = new Set<string>()
  for (const edge of EDGES) {
    if (!stationIds.has(edge.from) || !stationIds.has(edge.to)) {
      errors.push(`Invalid endpoint on ${edge.from}-${edge.to}`)
    }
    const key = `${Math.min(edge.from, edge.to)}:${Math.max(edge.from, edge.to)}:${edge.transport}`
    if (seen.has(key)) errors.push(`Duplicate edge ${key}`)
    seen.add(key)
  }
  if (EDGES.filter((edge) => edge.transport === 'water').length !== 3) {
    errors.push('Expected three ferry edges')
  }
  return errors
}

const distanceCache = new Map<string, number>()

export function graphDistance(from: number, to: number, allowed?: Set<Transport>): number {
  if (from === to) return 0
  const cacheKey = `${from}:${to}:${allowed ? [...allowed].sort().join(',') : 'all'}`
  const cached = distanceCache.get(cacheKey)
  if (cached !== undefined) return cached

  const visited = new Set([from])
  let frontier = [from]
  let distance = 0
  while (frontier.length > 0) {
    distance += 1
    const next: number[] = []
    for (const station of frontier) {
      for (const connection of ADJACENCY.get(station) ?? []) {
        if (allowed && !allowed.has(connection.transport)) continue
        if (connection.to === to) {
          distanceCache.set(cacheKey, distance)
          return distance
        }
        if (!visited.has(connection.to)) {
          visited.add(connection.to)
          next.push(connection.to)
        }
      }
    }
    frontier = next
  }
  return 999
}
