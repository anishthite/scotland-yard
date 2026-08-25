import { useEffect, useMemo, useRef, useState } from 'react'
import { GameScreen } from './components/GameScreen'
import { HomeScreen } from './components/HomeScreen'
import { RulesModal } from './components/RulesModal'
import { chooseDetectiveBotMove, chooseFugitiveBotAction } from './game/bots'
import {
  createDetectiveView,
  createGame,
  declareFugitiveBlocked,
  getDetectiveMoves,
  getFugitiveMoves,
  moveDetective,
  moveFugitive,
  resignGame,
  skipDetective,
} from './game/engine'
import type {
  DetectiveMove,
  Difficulty,
  FugitiveMove,
  GameState,
  HumanRole,
} from './game/types'

const SAVE_KEY = 'london-pursuit:active-game:v1'
const SETTINGS_KEY = 'london-pursuit:settings:v1'

function readSavedGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GameState
    return parsed.schemaVersion === 1 && parsed.rulesVersion === 'london-pursuit-2023' ? parsed : null
  } catch {
    localStorage.removeItem(SAVE_KEY)
    return null
  }
}

function readSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as {
      muted?: boolean
      botSpeed?: number
      deductionVisible?: boolean
    }
    return {
      muted: parsed.muted ?? false,
      botSpeed: parsed.botSpeed ?? 180,
      deductionVisible: parsed.deductionVisible ?? true,
    }
  } catch {
    return { muted: false, botSpeed: 180, deductionVisible: true }
  }
}

export default function App() {
  const [savedGame, setSavedGame] = useState<GameState | null>(() => readSavedGame())
  const [state, setState] = useState<GameState | null>(null)
  const [screen, setScreen] = useState<'home' | 'game'>('home')
  const [role, setRole] = useState<HumanRole>('fugitive')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [seed, setSeed] = useState('')
  const [rulesOpen, setRulesOpen] = useState(false)
  const [selectedStation, setSelectedStation] = useState<number | null>(null)
  const [plannedDouble, setPlannedDouble] = useState(false)
  const [botThinking, setBotThinking] = useState(false)
  const initialSettings = useRef(readSettings())
  const [muted, setMuted] = useState(initialSettings.current.muted)
  const [botSpeed, setBotSpeed] = useState(initialSettings.current.botSpeed)
  const [deductionVisible, setDeductionVisible] = useState(initialSettings.current.deductionVisible)
  const lastSoundEvent = useRef(0)

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ muted, botSpeed, deductionVisible }))
  }, [botSpeed, deductionVisible, muted])

  useEffect(() => {
    if (!state) return
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
    setSavedGame(state)
  }, [state])

  useEffect(() => {
    if (!state || muted || state.events.length <= lastSoundEvent.current) {
      if (state) lastSoundEvent.current = state.events.length
      return
    }
    const latest = state.events.at(-1)
    lastSoundEvent.current = state.events.length
    const AudioContextClass = window.AudioContext
    if (!latest || !AudioContextClass) return
    try {
      const context = new AudioContextClass()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = latest.kind === 'game-ended' ? 'triangle' : 'sine'
      oscillator.frequency.value =
        latest.kind === 'fugitive-revealed' ? 620 : latest.kind === 'game-ended' ? 330 : 240
      gain.gain.setValueAtTime(0.0001, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.13)
      oscillator.addEventListener('ended', () => void context.close())
    } catch {
      // Audio feedback is optional; game flow must never depend on browser audio support.
    }
  }, [muted, state])

  useEffect(() => {
    setSelectedStation(null)
    if (!state?.doubleMoveActive) setPlannedDouble(false)
  }, [state?.detectiveCursor, state?.doubleMoveActive, state?.phase, state?.travelLog.length])

  useEffect(() => {
    if (!state || state.result) {
      setBotThinking(false)
      return
    }

    if (
      state.phase === 'fugitive' &&
      state.role === 'fugitive' &&
      getFugitiveMoves(state).length === 0
    ) {
      setState(declareFugitiveBlocked(state))
      return
    }

    const currentDetective = state.detectives[state.detectiveCursor]
    const botDetectiveTurn =
      state.phase === 'detectives' &&
      currentDetective &&
      (state.role === 'fugitive' || currentDetective.id !== state.humanDetectiveId)
    const botFugitiveTurn = state.phase === 'fugitive-bot'
    if (!botDetectiveTurn && !botFugitiveTurn) {
      setBotThinking(false)
      return
    }

    setBotThinking(true)
    const timeout = window.setTimeout(() => {
      setState((current) => {
        if (!current || current.result) return current
        if (current.phase === 'fugitive-bot') {
          const action = chooseFugitiveBotAction(current)
          return action.move
            ? moveFugitive(current, action.move, action.useDouble)
            : declareFugitiveBlocked(current)
        }
        if (current.phase === 'detectives') {
          const move = chooseDetectiveBotMove(current)
          return move ? moveDetective(current, move) : skipDetective(current)
        }
        return current
      })
    }, botSpeed)
    return () => window.clearTimeout(timeout)
  }, [botSpeed, state])

  const legalMoves = useMemo(() => {
    if (!state || state.result) return []
    if (state.role === 'fugitive' && state.phase === 'fugitive') return getFugitiveMoves(state)
    const current = state.detectives[state.detectiveCursor]
    if (
      state.role === 'detective' &&
      state.phase === 'detectives' &&
      current?.id === state.humanDetectiveId
    ) {
      return getDetectiveMoves(state, current.id)
    }
    return []
  }, [state])

  const candidateStations = useMemo(
    () => (state ? createDetectiveView(state, state.humanDetectiveId).candidateStations : []),
    [state],
  )

  function startGame(gameSeed?: number) {
    const next = createGame({
      role,
      difficulty,
      seed: gameSeed ?? (seed ? Number(seed) : undefined),
    })
    setState(next)
    setSavedGame(next)
    setScreen('game')
    setSelectedStation(null)
  }

  function continueGame() {
    if (!savedGame) return
    setState(savedGame)
    setRole(savedGame.role)
    setDifficulty(savedGame.difficulty)
    setScreen('game')
  }

  function confirmMove(move: FugitiveMove | DetectiveMove) {
    setState((current) => {
      if (!current) return current
      if ('ticket' in move) return moveFugitive(current, move, current.doubleMoveActive ? false : plannedDouble)
      return moveDetective(current, move)
    })
    setPlannedDouble(false)
    setSelectedStation(null)
  }

  function home() {
    setScreen('home')
    setBotThinking(false)
  }

  function newGameFromResult(sameSeed: boolean) {
    if (!state) return
    const next = createGame({
      role: state.role,
      difficulty: state.difficulty,
      seed: sameSeed ? state.seed : undefined,
    })
    setState(next)
    setSavedGame(next)
    setScreen('game')
  }

  return (
    <>
      {screen === 'home' ? (
        <HomeScreen
          savedGame={savedGame}
          role={role}
          difficulty={difficulty}
          seed={seed}
          onRoleChange={setRole}
          onDifficultyChange={setDifficulty}
          onSeedChange={setSeed}
          onStart={() => startGame()}
          onContinue={continueGame}
          onOpenRules={() => setRulesOpen(true)}
        />
      ) : state ? (
        <GameScreen
          state={state}
          botThinking={botThinking}
          legalMoves={legalMoves}
          candidateStations={candidateStations}
          selectedStation={selectedStation}
          plannedDouble={plannedDouble}
          deductionVisible={deductionVisible}
          muted={muted}
          botSpeed={botSpeed}
          onSelectStation={setSelectedStation}
          onConfirmMove={confirmMove}
          onPlannedDoubleChange={setPlannedDouble}
          onDeductionChange={setDeductionVisible}
          onMutedChange={setMuted}
          onBotSpeedChange={setBotSpeed}
          onSkip={() => setState((current) => (current ? skipDetective(current) : current))}
          onHome={home}
          onRules={() => setRulesOpen(true)}
          onResign={() => setState((current) => (current ? resignGame(current) : current))}
          onNewGame={newGameFromResult}
        />
      ) : null}
      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
    </>
  )
}
