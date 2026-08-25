import { describe, expect, it } from 'vitest'
import { chooseDetectiveBotMove, chooseFugitiveBotAction } from './bots'
import {
  createGame,
  declareFugitiveBlocked,
  moveDetective,
  moveFugitive,
  skipDetective,
} from './engine'
import type { Difficulty, GameState } from './types'

function simulate(seed: number, difficulty: Difficulty) {
  let state: GameState = createGame({ role: 'detective', difficulty, seed })
  let actions = 0
  while (!state.result && actions < 180) {
    if (state.phase === 'fugitive-bot' || state.phase === 'fugitive') {
      const action = chooseFugitiveBotAction(state)
      state = action.move
        ? moveFugitive(state, action.move, action.useDouble)
        : declareFugitiveBlocked(state)
    } else if (state.phase === 'detectives') {
      const move = chooseDetectiveBotMove(state)
      state = move ? moveDetective(state, move) : skipDetective(state)
    }
    actions += 1
  }
  return { state, actions }
}

describe('seeded full-game simulation', () => {
  it('finishes 10,000 games without an illegal or stuck state', () => {
    for (let seed = 1; seed <= 10_000; seed += 1) {
      const difficulty: Difficulty = seed % 3 === 0 ? 'hard' : seed % 2 === 0 ? 'medium' : 'easy'
      const { state, actions } = simulate(seed, difficulty)
      expect(state.result, `seed ${seed} did not finish after ${actions} actions`).not.toBeNull()
      expect(state.travelLog.length).toBeLessThanOrEqual(22)
      for (const detective of state.detectives) {
        expect(detective.tickets.taxi).toBeGreaterThanOrEqual(0)
        expect(detective.tickets.bus).toBeGreaterThanOrEqual(0)
        expect(detective.tickets.underground).toBeGreaterThanOrEqual(0)
      }
      expect(state.fugitive.blackTickets).toBeGreaterThanOrEqual(0)
      expect(state.fugitive.doubleTickets).toBeGreaterThanOrEqual(0)
    }
  }, 120_000)
})
