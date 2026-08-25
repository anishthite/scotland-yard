import { describe, expect, it } from 'vitest'
import { chooseDetectiveMoveFromView } from './bots'
import { createDetectiveView, createGame, getDetectiveMoves } from './engine'
import type { GameState } from './types'

describe('detective bot fairness', () => {
  it('returns the same decision for identical public views with different hidden locations', () => {
    const base = createGame({ role: 'detective', difficulty: 'hard', seed: 737 })
    const first: GameState = { ...base, phase: 'detectives', fugitive: { ...base.fugitive, position: 35 } }
    const second: GameState = { ...first, fugitive: { ...first.fugitive, position: 172 } }
    const firstView = createDetectiveView(first, 'd1')
    const secondView = createDetectiveView(second, 'd1')
    expect(firstView).toEqual(secondView)
    const legal = getDetectiveMoves(first, 'd1')
    expect(chooseDetectiveMoveFromView(firstView, legal)).toEqual(
      chooseDetectiveMoveFromView(secondView, legal),
    )
  })

  it('always chooses from the supplied legal action set', () => {
    const state: GameState = {
      ...createGame({ role: 'detective', difficulty: 'medium', seed: 1001 }),
      phase: 'detectives',
    }
    const legal = getDetectiveMoves(state, 'd1')
    expect(legal).toContainEqual(chooseDetectiveMoveFromView(createDetectiveView(state, 'd1'), legal))
  })
})
