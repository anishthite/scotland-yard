import { ADJACENCY, graphDistance, REVEAL_SLOTS } from '../data/map'
import {
  canUseDoubleMove,
  createDetectiveView,
  getDetectiveMoves,
  getFugitiveMoves,
} from './engine'
import type { DetectiveMove, DetectiveView, FugitiveMove, GameState, Transport } from './types'

function hashValue(input: string) {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

function deterministicNoise(seed: number, key: string) {
  return hashValue(`${seed}:${key}`)
}

function stationMobility(station: number, occupied: Set<number>, includeWater = false) {
  return (ADJACENCY.get(station) ?? []).filter(
    (connection) => !occupied.has(connection.to) && (includeWater || connection.transport !== 'water'),
  ).length
}

function detectiveScore(view: DetectiveView, move: DetectiveMove) {
  const candidates = view.candidateStations.length > 0 ? view.candidateStations : [move.to]
  const distances = candidates.map((candidate) => graphDistance(move.to, candidate))
  const closeCoverage = distances.filter((distance) => distance <= 1).length
  const twoStepCoverage = distances.filter((distance) => distance <= 2).length
  const meanDistance = distances.reduce((sum, distance) => sum + distance, 0) / distances.length
  const teamSpread = Math.min(
    ...view.detectives
      .filter((detective) => detective.id !== view.detective.id)
      .map((detective) => graphDistance(move.to, detective.position)),
  )
  const scarcityPenalty =
    move.transport === 'underground' && view.detective.tickets.underground <= 2
      ? 2.5
      : move.transport === 'bus' && view.detective.tickets.bus <= 2
        ? 1
        : 0

  return closeCoverage * 9 + twoStepCoverage * 2 - meanDistance * 3 + Math.min(teamSpread, 3) - scarcityPenalty
}

export function chooseDetectiveMoveFromView(
  view: DetectiveView,
  legalMoves: DetectiveMove[],
): DetectiveMove | null {
  if (legalMoves.length === 0) return null
  if (view.difficulty === 'easy') {
    const index = Math.floor(
      deterministicNoise(view.seed, `${view.slot}:${view.detective.id}:easy`) * legalMoves.length,
    )
    return [...legalMoves].sort((a, b) => a.to - b.to || a.transport.localeCompare(b.transport))[index]
  }

  const scored = legalMoves.map((move) => {
    let score = detectiveScore(view, move)
    if (view.difficulty === 'hard') {
      const onward = (ADJACENCY.get(move.to) ?? []).filter(
        (connection) => connection.transport !== 'water',
      )
      const futureCoverage = view.candidateStations.filter((candidate) =>
        onward.some((connection) => graphDistance(connection.to, candidate) <= 1),
      ).length
      score += futureCoverage * 1.4
    }
    score += deterministicNoise(
      view.seed,
      `${view.slot}:${view.detective.id}:${move.to}:${move.transport}`,
    ) * 0.05
    return { move, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored[0].move
}

export function chooseDetectiveBotMove(state: GameState): DetectiveMove | null {
  const current = state.detectives[state.detectiveCursor]
  if (!current) return null
  const view = createDetectiveView(state, current.id)
  return chooseDetectiveMoveFromView(view, getDetectiveMoves(state, current.id))
}

function futureThreat(state: GameState, destination: number) {
  return Math.min(...state.detectives.map((detective) => graphDistance(detective.position, destination)))
}

function scoreFugitiveMove(state: GameState, move: FugitiveMove) {
  const occupied = new Set(state.detectives.map((detective) => detective.position))
  const minDistance = futureThreat(state, move.to)
  const mobility = stationMobility(move.to, occupied, true)
  const nextSlot = state.travelLog.length + 1
  const revealsNow = REVEAL_SLOTS.includes(nextSlot)
  const modes = new Set<Transport>(
    (ADJACENCY.get(move.to) ?? []).filter((edge) => !occupied.has(edge.to)).map((edge) => edge.transport),
  ).size
  const blackPenalty =
    move.ticket === 'black'
      ? move.transport === 'water'
        ? 0.5
        : state.fugitive.blackTickets <= 2
          ? 6
          : 3
      : 0

  let score = minDistance * 12 + mobility * 3 + modes * 1.5 - blackPenalty
  if (revealsNow) score += minDistance * 6
  if (state.difficulty === 'hard') {
    const nextConnections = (ADJACENCY.get(move.to) ?? []).filter((connection) => !occupied.has(connection.to))
    const worstNextDistance = Math.max(
      0,
      ...nextConnections.map((connection) => futureThreat(state, connection.to)),
    )
    score += worstNextDistance * 4 + nextConnections.length * 1.5
  }
  score += deterministicNoise(
    state.seed,
    `${nextSlot}:${move.to}:${move.transport}:${move.ticket}`,
  ) * (state.difficulty === 'easy' ? 10 : 0.1)
  return score
}

export function chooseFugitiveBotAction(state: GameState): {
  move: FugitiveMove | null
  useDouble: boolean
} {
  const moves = getFugitiveMoves(state)
  if (moves.length === 0) return { move: null, useDouble: false }

  let move: FugitiveMove
  if (state.difficulty === 'easy') {
    const ordinary = moves.filter((candidate) => candidate.ticket !== 'black' || candidate.transport === 'water')
    const pool = ordinary.length > 0 ? ordinary : moves
    const index = Math.floor(
      deterministicNoise(state.seed, `${state.travelLog.length}:fugitive:easy`) * pool.length,
    )
    move = [...pool].sort((a, b) => a.to - b.to || a.ticket.localeCompare(b.ticket))[index]
  } else {
    move = [...moves].sort((a, b) => scoreFugitiveMove(state, b) - scoreFugitiveMove(state, a))[0]
  }

  const distance = futureThreat(state, state.fugitive.position)
  const approachingReveal = REVEAL_SLOTS.includes(state.travelLog.length + 2)
  const doubleThreshold = state.difficulty === 'hard' ? 2 : 1
  const useDouble =
    !state.doubleMoveActive &&
    canUseDoubleMove(state) &&
    state.difficulty !== 'easy' &&
    (distance <= doubleThreshold || approachingReveal) &&
    deterministicNoise(state.seed, `${state.travelLog.length}:double`) > 0.28

  return { move, useDouble }
}
