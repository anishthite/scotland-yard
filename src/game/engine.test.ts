import { describe, expect, it } from 'vitest'
import { ADJACENCY, DETECTIVE_STARTS, FUGITIVE_STARTS, REVEAL_SLOTS } from '../data/map'
import {
  canUseDoubleMove,
  createDetectiveView,
  createGame,
  declareFugitiveBlocked,
  getDetectiveMoves,
  getFugitiveMoves,
  moveDetective,
  moveFugitive,
  skipDetective,
} from './engine'
import type { GameState, TravelEntry } from './types'

function dummyEntry(slot: number): TravelEntry {
  return {
    slot,
    ticket: 'taxi',
    transport: 'taxi',
    destination: 8,
    revealed: REVEAL_SLOTS.includes(slot),
    blockedStations: [],
  }
}

describe('game setup', () => {
  it('is deterministic and assigns canonical resources', () => {
    const first = createGame({ role: 'detective', difficulty: 'hard', seed: 4242 })
    const second = createGame({ role: 'detective', difficulty: 'hard', seed: 4242 })
    expect(first.fugitive.position).toBe(second.fugitive.position)
    expect(first.detectives.map((detective) => detective.position)).toEqual(
      second.detectives.map((detective) => detective.position),
    )
    expect(FUGITIVE_STARTS).toContain(first.fugitive.position)
    expect(first.detectives.every((detective) => DETECTIVE_STARTS.includes(detective.position))).toBe(true)
    expect(new Set(first.detectives.map((detective) => detective.position)).size).toBe(5)
    expect(first.detectives[0].tickets).toEqual({ taxi: 11, bus: 8, underground: 4 })
    expect(first.fugitive).toMatchObject({ blackTickets: 5, doubleTickets: 2 })
  })
})

describe('fugitive rules', () => {
  it('offers ordinary and black variants while reserving ferries for black tickets', () => {
    const base = createGame({ role: 'fugitive', difficulty: 'medium', seed: 1 })
    const state = { ...base, fugitive: { ...base.fugitive, position: 115 } }
    const moves = getFugitiveMoves(state)
    expect(moves).toContainEqual({ to: 108, transport: 'water', ticket: 'black' })
    expect(moves).not.toContainEqual({ to: 108, transport: 'water', ticket: 'water' })
    expect(moves.some((move) => move.ticket === 'taxi')).toBe(true)
    expect(moves.some((move) => move.ticket === 'black' && move.transport === 'taxi')).toBe(true)
  })

  it('records a normal move and starts the detective phase', () => {
    const state = createGame({ role: 'fugitive', difficulty: 'medium', seed: 22 })
    const move = getFugitiveMoves(state).find((candidate) => candidate.ticket !== 'black')!
    const next = moveFugitive(state, move)
    expect(next.travelLog).toHaveLength(1)
    expect(next.travelLog[0]).toMatchObject({ destination: move.to, ticket: move.ticket, slot: 1 })
    expect(next.phase).toBe('detectives')
  })

  it('executes a double move without a detective response between legs', () => {
    const state = createGame({ role: 'fugitive', difficulty: 'hard', seed: 31 })
    expect(canUseDoubleMove(state)).toBe(true)
    const first = moveFugitive(state, getFugitiveMoves(state)[0], true)
    expect(first.phase).toBe('fugitive')
    expect(first.doubleMoveActive).toBe(true)
    expect(first.fugitive.doubleTickets).toBe(1)
    const second = moveFugitive(first, getFugitiveMoves(first)[0])
    expect(second.travelLog).toHaveLength(2)
    expect(second.doubleMoveActive).toBe(false)
    expect(second.phase).toBe('detectives')
  })

  it('reveals exactly on the scheduled slots', () => {
    const base = createGame({ role: 'fugitive', difficulty: 'easy', seed: 55 })
    const state: GameState = { ...base, travelLog: [dummyEntry(1), dummyEntry(2)] }
    const next = moveFugitive(state, getFugitiveMoves(state)[0])
    expect(next.travelLog.at(-1)?.slot).toBe(3)
    expect(next.travelLog.at(-1)?.revealed).toBe(true)
    expect(next.fugitiveVisible).toBe(true)
  })

  it('declares a blocked fugitive captured', () => {
    const base = createGame({ role: 'fugitive', difficulty: 'easy', seed: 8 })
    const neighbors = [...new Set((ADJACENCY.get(1) ?? []).map((connection) => connection.to))]
    const state: GameState = {
      ...base,
      fugitive: { ...base.fugitive, position: 1 },
      detectives: base.detectives.map((detective, index) => ({
        ...detective,
        position: neighbors[index] ?? 199 - index,
      })),
    }
    expect(getFugitiveMoves(state)).toHaveLength(0)
    expect(declareFugitiveBlocked(state).result).toMatchObject({
      winner: 'detectives',
      reason: 'fugitive-blocked',
    })
  })
})

describe('detective rules', () => {
  it('consumes the chosen ticket', () => {
    const base = createGame({ role: 'detective', difficulty: 'medium', seed: 17 })
    const state: GameState = { ...base, phase: 'detectives', detectiveCursor: 0 }
    const move = getDetectiveMoves(state, 'd1')[0]
    const before = state.detectives[0].tickets[move.transport]
    const next = moveDetective(state, move)
    expect(next.detectives[0].position).toBe(move.to)
    expect(next.detectives[0].tickets[move.transport]).toBe(before - 1)
    expect(next.detectiveCursor).toBe(1)
  })

  it('captures on the true hidden station', () => {
    const base = createGame({ role: 'detective', difficulty: 'medium', seed: 91 })
    const detective = base.detectives[0]
    const connection = (ADJACENCY.get(detective.position) ?? []).find((edge) => edge.transport !== 'water')!
    const state: GameState = {
      ...base,
      phase: 'detectives',
      fugitiveVisible: false,
      fugitive: { ...base.fugitive, position: connection.to },
    }
    const move = getDetectiveMoves(state, detective.id).find(
      (candidate) => candidate.to === connection.to && candidate.transport === connection.transport,
    )!
    const next = moveDetective(state, move)
    expect(next.result).toMatchObject({ winner: 'detectives', reason: 'captured' })
    expect(next.fugitiveVisible).toBe(true)
  })

  it('only permits skipping when no route is usable', () => {
    const base = createGame({ role: 'detective', difficulty: 'medium', seed: 71 })
    const movable: GameState = { ...base, phase: 'detectives' }
    expect(skipDetective(movable)).toBe(movable)
    const stranded: GameState = {
      ...movable,
      detectives: movable.detectives.map((detective, index) =>
        index === 0 ? { ...detective, tickets: { taxi: 0, bus: 0, underground: 0 } } : detective,
      ),
    }
    expect(skipDetective(stranded).detectiveCursor).toBe(1)
  })
})

describe('hidden-information boundary', () => {
  it('redacts unrevealed destinations and black transport modes', () => {
    const base = createGame({ role: 'detective', difficulty: 'hard', seed: 2 })
    const state: GameState = {
      ...base,
      travelLog: [
        {
          slot: 1,
          ticket: 'black',
          transport: 'water',
          destination: 157,
          revealed: false,
          blockedStations: base.detectives.map((detective) => detective.position),
        },
      ],
    }
    const view = createDetectiveView(state)
    const alternateView = createDetectiveView({
      ...state,
      travelLog: [{ ...state.travelLog[0], destination: 108 }],
    })
    expect(view.travelLog[0]).not.toHaveProperty('destination')
    expect(view.travelLog[0]).not.toHaveProperty('transport')
    expect(view).toEqual(alternateView)
  })
})
