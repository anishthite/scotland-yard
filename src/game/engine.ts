import {
  ADJACENCY,
  DETECTIVE_STARTS,
  FUGITIVE_STARTS,
  MAX_TRAVEL_SLOTS,
  REVEAL_SLOTS,
} from '../data/map'
import type {
  Detective,
  DetectiveMove,
  DetectiveView,
  Difficulty,
  FugitiveMove,
  GameEvent,
  GameResult,
  GameState,
  HumanRole,
  NewGameOptions,
  Transport,
} from './types'

export const DETECTIVE_COLORS = ['#ee6b54', '#56a8dc', '#e0b14f', '#9a7bd1', '#66b892']
export const DETECTIVE_NAMES = ['Rose', 'Bishop', 'Gold', 'Violet', 'Sage']

function normalizeSeed(seed: number) {
  const normalized = Math.abs(Math.floor(seed)) >>> 0
  return normalized || 0x6d2b79f5
}

export function createSeededRandom(seed: number) {
  let state = normalizeSeed(seed)
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(items: readonly T[], random: () => number) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const next = Math.floor(random() * (index + 1))
    ;[result[index], result[next]] = [result[next], result[index]]
  }
  return result
}

function makeEvent(state: Pick<GameState, 'events'>, event: Omit<GameEvent, 'id'>): GameEvent {
  return { id: state.events.length + 1, ...event }
}

export function createGame(options: NewGameOptions): GameState {
  const seed = normalizeSeed(options.seed ?? Date.now())
  const random = createSeededRandom(seed)
  const detectiveStarts = shuffled(DETECTIVE_STARTS, random).slice(0, 5)
  const fugitiveStart = shuffled(FUGITIVE_STARTS, random)[0]

  const detectives: Detective[] = detectiveStarts.map((position, index) => ({
    id: `d${index + 1}`,
    name: DETECTIVE_NAMES[index],
    color: DETECTIVE_COLORS[index],
    position,
    tickets: { taxi: 11, bus: 8, underground: 4 },
  }))

  const base: GameState = {
    schemaVersion: 1,
    rulesVersion: 'london-pursuit-2023',
    seed,
    role: options.role,
    difficulty: options.difficulty,
    phase: options.role === 'fugitive' ? 'fugitive' : 'fugitive-bot',
    fugitive: { position: fugitiveStart, blackTickets: 5, doubleTickets: 2 },
    detectives,
    humanDetectiveId: 'd1',
    travelLog: [],
    fugitiveVisible: options.role === 'fugitive',
    detectiveCursor: 0,
    doubleMoveActive: false,
    result: null,
    events: [],
    createdAt: new Date().toISOString(),
  }

  return {
    ...base,
    events: [
      makeEvent(base, {
        kind: 'game-started',
        actor: 'system',
        note: `Operation started with seed ${seed}`,
      }),
    ],
  }
}

export function getFugitiveMoves(state: GameState): FugitiveMove[] {
  if (state.result || (state.phase !== 'fugitive' && state.phase !== 'fugitive-bot')) return []
  const occupied = new Set(state.detectives.map((detective) => detective.position))
  const moves: FugitiveMove[] = []
  for (const connection of ADJACENCY.get(state.fugitive.position) ?? []) {
    if (occupied.has(connection.to)) continue
    if (connection.transport !== 'water') {
      moves.push({
        to: connection.to,
        transport: connection.transport,
        ticket: connection.transport,
      })
    }
    if (state.fugitive.blackTickets > 0) {
      moves.push({ to: connection.to, transport: connection.transport, ticket: 'black' })
    }
  }
  return moves
}

export function canUseDoubleMove(state: GameState) {
  return (
    !state.doubleMoveActive &&
    state.fugitive.doubleTickets > 0 &&
    MAX_TRAVEL_SLOTS - state.travelLog.length >= 2
  )
}

export function getDetectiveMoves(state: GameState, detectiveId: string): DetectiveMove[] {
  if (state.result) return []
  const detective = state.detectives.find((candidate) => candidate.id === detectiveId)
  if (!detective) return []
  const occupied = new Set(
    state.detectives.filter((candidate) => candidate.id !== detectiveId).map((candidate) => candidate.position),
  )
  const moves: DetectiveMove[] = []
  for (const connection of ADJACENCY.get(detective.position) ?? []) {
    if (connection.transport === 'water' || occupied.has(connection.to)) continue
    if (detective.tickets[connection.transport] > 0) {
      moves.push({ detectiveId, to: connection.to, transport: connection.transport })
    }
  }
  return moves
}

function endGame(state: GameState, result: GameResult): GameState {
  const withResult = { ...state, phase: 'complete' as const, result, fugitiveVisible: true }
  return {
    ...withResult,
    events: [
      ...state.events,
      makeEvent(state, {
        kind: 'game-ended',
        actor: result.winner,
        note: result.message,
      }),
    ],
  }
}

function permanentlyStranded(detective: Detective) {
  return !(ADJACENCY.get(detective.position) ?? []).some(
    (connection) => connection.transport !== 'water' && detective.tickets[connection.transport] > 0,
  )
}

function finishDetectivePhase(state: GameState): GameState {
  if (state.travelLog.length >= MAX_TRAVEL_SLOTS) {
    return endGame(state, {
      winner: 'fugitive',
      reason: 'escaped',
      message: 'The final cordon failed. The fugitive vanished into the city.',
    })
  }
  if (state.detectives.every(permanentlyStranded)) {
    return endGame(state, {
      winner: 'fugitive',
      reason: 'detectives-stranded',
      message: 'Every detective ran out of usable transport tickets.',
    })
  }
  return {
    ...state,
    phase: state.role === 'fugitive' ? 'fugitive' : 'fugitive-bot',
    detectiveCursor: 0,
    fugitiveVisible: state.role === 'fugitive',
  }
}

function advanceDetectiveCursor(state: GameState): GameState {
  const nextCursor = state.detectiveCursor + 1
  if (nextCursor >= state.detectives.length) return finishDetectivePhase(state)
  return { ...state, detectiveCursor: nextCursor }
}

export function moveFugitive(state: GameState, move: FugitiveMove, useDouble = false): GameState {
  if (state.result || (state.phase !== 'fugitive' && state.phase !== 'fugitive-bot')) return state
  const legal = getFugitiveMoves(state).some(
    (candidate) =>
      candidate.to === move.to &&
      candidate.transport === move.transport &&
      candidate.ticket === move.ticket,
  )
  if (!legal || (useDouble && !canUseDoubleMove(state))) return state

  const wasDoubleActive = state.doubleMoveActive
  const slot = state.travelLog.length + 1
  const revealed = REVEAL_SLOTS.includes(slot)
  const entry = {
    slot,
    ticket: move.ticket,
    transport: move.transport,
    destination: move.to,
    revealed,
    blockedStations: state.detectives.map((detective) => detective.position),
  }
  const from = state.fugitive.position
  let next: GameState = {
    ...state,
    fugitive: {
      ...state.fugitive,
      position: move.to,
      blackTickets: state.fugitive.blackTickets - (move.ticket === 'black' ? 1 : 0),
      doubleTickets: state.fugitive.doubleTickets - (useDouble ? 1 : 0),
    },
    travelLog: [...state.travelLog, entry],
    fugitiveVisible: state.role === 'fugitive' || revealed,
    doubleMoveActive: useDouble ? true : wasDoubleActive ? false : state.doubleMoveActive,
    events: [
      ...state.events,
      makeEvent(state, {
        kind: 'fugitive-moved',
        actor: 'fugitive',
        from,
        to: move.to,
        ticket: move.ticket,
        slot,
        note: `Fugitive moved to ${move.to} using ${move.ticket}`,
      }),
      ...(revealed
        ? [
            makeEvent({ events: [...state.events, {} as GameEvent] }, {
              kind: 'fugitive-revealed' as const,
              actor: 'fugitive',
              to: move.to,
              slot,
              note: `Fugitive surfaced at station ${move.to}`,
            }),
          ]
        : []),
    ],
  }

  if (wasDoubleActive || !useDouble) {
    next = { ...next, doubleMoveActive: false, phase: 'detectives', detectiveCursor: 0 }
  }

  if (next.doubleMoveActive && getFugitiveMoves(next).length === 0) {
    return endGame(next, {
      winner: 'detectives',
      reason: 'fugitive-blocked',
      message: 'The fugitive committed to a double move but every escape route was sealed.',
    })
  }

  return next
}

export function declareFugitiveBlocked(state: GameState): GameState {
  if (getFugitiveMoves(state).length > 0 || state.result) return state
  return endGame(state, {
    winner: 'detectives',
    reason: 'fugitive-blocked',
    message: 'Every route out was blocked. The detectives closed the net.',
  })
}

export function moveDetective(state: GameState, move: DetectiveMove): GameState {
  if (state.phase !== 'detectives' || state.result) return state
  const current = state.detectives[state.detectiveCursor]
  if (!current || current.id !== move.detectiveId) return state
  const legal = getDetectiveMoves(state, current.id).some(
    (candidate) => candidate.to === move.to && candidate.transport === move.transport,
  )
  if (!legal) return state

  const detectives = state.detectives.map((detective) =>
    detective.id === current.id
      ? {
          ...detective,
          position: move.to,
          tickets: {
            ...detective.tickets,
            [move.transport]: detective.tickets[move.transport] - 1,
          },
        }
      : detective,
  )
  const moved: GameState = {
    ...state,
    detectives,
    events: [
      ...state.events,
      makeEvent(state, {
        kind: 'detective-moved',
        actor: current.id,
        from: current.position,
        to: move.to,
        ticket: move.transport,
        note: `${current.name} moved to station ${move.to}`,
      }),
    ],
  }

  if (move.to === state.fugitive.position) {
    return endGame(moved, {
      winner: 'detectives',
      reason: 'captured',
      message: `${current.name} found the fugitive at station ${move.to}.`,
    })
  }

  return advanceDetectiveCursor(moved)
}

export function skipDetective(state: GameState): GameState {
  if (state.phase !== 'detectives' || state.result) return state
  const current = state.detectives[state.detectiveCursor]
  if (!current || getDetectiveMoves(state, current.id).length > 0) return state
  const skipped: GameState = {
    ...state,
    events: [
      ...state.events,
      makeEvent(state, {
        kind: 'detective-stranded',
        actor: current.id,
        note: `${current.name} had no legal move`,
      }),
    ],
  }
  return advanceDetectiveCursor(skipped)
}

export function resignGame(state: GameState): GameState {
  if (state.result) return state
  const winner = state.role === 'fugitive' ? 'detectives' : 'fugitive'
  return endGame(state, {
    winner,
    reason: 'resigned',
    message: `The ${state.role} ended the operation early.`,
  })
}

export function getCandidateStations(state: Pick<GameState, 'travelLog'>): number[] {
  let candidates = new Set(FUGITIVE_STARTS)
  for (const entry of state.travelLog) {
    if (entry.revealed) {
      candidates = new Set([entry.destination])
      continue
    }
    const next = new Set<number>()
    const allowed =
      entry.ticket === 'black'
        ? new Set<Transport>(['taxi', 'bus', 'underground', 'water'])
        : new Set<Transport>([entry.ticket])
    for (const station of candidates) {
      for (const connection of ADJACENCY.get(station) ?? []) {
        if (allowed.has(connection.transport) && !entry.blockedStations.includes(connection.to)) {
          next.add(connection.to)
        }
      }
    }
    candidates = next
  }
  return [...candidates].sort((a, b) => a - b)
}

export function createDetectiveView(
  state: GameState,
  detectiveId = state.detectives[state.detectiveCursor]?.id ?? state.humanDetectiveId,
): DetectiveView {
  const detective = state.detectives.find((candidate) => candidate.id === detectiveId) ?? state.detectives[0]
  return {
    seed: state.seed,
    difficulty: state.difficulty,
    detective: structuredClone(detective),
    detectives: structuredClone(state.detectives),
    travelLog: state.travelLog.map((entry) => ({
      slot: entry.slot,
      ticket: entry.ticket,
      revealed: entry.revealed,
      blockedStations: [...entry.blockedStations],
      ...(entry.ticket === 'black' ? {} : { transport: entry.transport }),
      ...(entry.revealed ? { destination: entry.destination } : {}),
    })),
    candidateStations: getCandidateStations(state),
    slot: state.travelLog.length,
  }
}

export function isHumanTurn(state: GameState) {
  if (state.result) return false
  if (state.role === 'fugitive') return state.phase === 'fugitive'
  return (
    state.phase === 'detectives' &&
    state.detectives[state.detectiveCursor]?.id === state.humanDetectiveId
  )
}

export function currentActorLabel(state: GameState) {
  if (state.result) return 'Operation complete'
  if (state.phase === 'fugitive' || state.phase === 'fugitive-bot') {
    return state.doubleMoveActive ? 'Fugitive · second move' : 'Fugitive moving'
  }
  const detective = state.detectives[state.detectiveCursor]
  return detective ? `${detective.name} moving` : 'Detective phase'
}

export function difficultyLabel(difficulty: Difficulty) {
  return difficulty[0].toUpperCase() + difficulty.slice(1)
}

export function roleLabel(role: HumanRole) {
  return role === 'fugitive' ? 'The Fugitive' : 'Lead Detective'
}
