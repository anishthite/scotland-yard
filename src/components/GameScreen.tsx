import {
  ArrowLeft,
  Bot,
  BusFront,
  CarFront,
  ChevronRight,
  CircleHelp,
  Eye,
  EyeOff,
  FastForward,
  Fingerprint,
  Flag,
  Gauge,
  MapPinned,
  RotateCcw,
  Settings2,
  Shield,
  ShipWheel,
  TrainFront,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { MAX_TRAVEL_SLOTS, REVEAL_SLOTS, TRANSPORT_LABELS } from '../data/map'
import {
  canUseDoubleMove,
  currentActorLabel,
  difficultyLabel,
  roleLabel,
} from '../game/engine'
import type {
  DetectiveMove,
  FugitiveMove,
  GameEvent,
  GameState,
  Transport,
  TravelTicket,
} from '../game/types'
import { MapBoard } from './MapBoard'
import { TravelLog } from './TravelLog'

type MoveChoice = FugitiveMove | DetectiveMove

interface GameScreenProps {
  state: GameState
  botThinking: boolean
  legalMoves: MoveChoice[]
  candidateStations: number[]
  selectedStation: number | null
  plannedDouble: boolean
  deductionVisible: boolean
  muted: boolean
  botSpeed: number
  onSelectStation: (station: number) => void
  onConfirmMove: (move: MoveChoice) => void
  onPlannedDoubleChange: (armed: boolean) => void
  onDeductionChange: (visible: boolean) => void
  onMutedChange: (muted: boolean) => void
  onBotSpeedChange: (speed: number) => void
  onSkip: () => void
  onHome: () => void
  onRules: () => void
  onResign: () => void
  onNewGame: (sameSeed: boolean) => void
}

const TRANSPORT_ICONS = {
  taxi: CarFront,
  bus: BusFront,
  underground: TrainFront,
  water: ShipWheel,
}

function publicEvent(event: GameEvent, state: GameState) {
  if (event.kind === 'fugitive-moved' && state.role === 'detective') {
    const entry = state.travelLog.find((item) => item.slot === event.slot)
    if (!entry?.revealed) return `Move ${event.slot}: fugitive used ${event.ticket === 'black' ? 'a secret ticket' : `the ${event.ticket}`}`
  }
  if (event.kind === 'game-started') return `Case opened · seed ${state.seed}`
  return event.note
}

function TicketPill({ type, count }: { type: TravelTicket | 'double'; count: number }) {
  const label = type === 'taxi' ? 'Cab' : type === 'underground' ? 'Rail' : type === 'double' ? '2×' : type === 'black' ? 'Secret' : 'Bus'
  return <span className={`ticket-pill ${type}`}><b>{count}</b><small>{label}</small></span>
}

export function GameScreen({
  state,
  botThinking,
  legalMoves,
  candidateStations,
  selectedStation,
  plannedDouble,
  deductionVisible,
  muted,
  botSpeed,
  onSelectStation,
  onConfirmMove,
  onPlannedDoubleChange,
  onDeductionChange,
  onMutedChange,
  onBotSpeedChange,
  onSkip,
  onHome,
  onRules,
  onResign,
  onNewGame,
}: GameScreenProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [replayIndex, setReplayIndex] = useState(state.travelLog.length)
  const selectedMoves = legalMoves.filter((move) => move.to === selectedStation)
  const currentDetective = state.detectives[state.detectiveCursor]
  const isHumanFugitive = state.role === 'fugitive' && state.phase === 'fugitive'
  const isHumanDetective =
    state.role === 'detective' && state.phase === 'detectives' && currentDetective?.id === state.humanDetectiveId
  const nextReveal = REVEAL_SLOTS.find((slot) => slot > state.travelLog.length)
  const recentEvents = state.events.slice(-5).reverse()
  const legalDestinations = [...new Set(legalMoves.map((move) => move.to))]
  const replayStation = state.result && replayIndex > 0 ? state.travelLog[replayIndex - 1]?.destination : null
  const playerDetective = state.detectives.find((detective) => detective.id === state.humanDetectiveId)!
  const heading = state.result
    ? state.result.winner === state.role || (state.result.winner === 'detectives' && state.role === 'detective')
      ? 'Operation successful'
      : 'Target lost'
    : currentActorLabel(state)

  const statusDetail = useMemo(() => {
    if (state.result) return state.result.message
    if (botThinking) return 'The opposition is calculating its next route…'
    if (state.doubleMoveActive) return 'Complete the second leg before detectives can respond.'
    if (isHumanFugitive) return 'Choose any connected, unoccupied station.'
    if (isHumanDetective) return legalMoves.length ? 'Select a highlighted station to move.' : 'No usable route remains for your detective.'
    return 'Field units are repositioning around the city.'
  }, [botThinking, isHumanDetective, isHumanFugitive, legalMoves.length, state.doubleMoveActive, state.result])

  return (
    <main className="game-shell">
      <header className="game-header">
        <button type="button" className="brand game-brand" onClick={onHome}>
          <span className="brand-mark"><Fingerprint size={19} /></span>
          <span>LONDON <b>PURSUIT</b></span>
        </button>
        <div className="phase-readout" aria-live="polite">
          <span className={`status-light ${botThinking ? 'thinking' : ''}`} />
          <div><small>Current phase</small><strong>{heading}</strong></div>
          <ChevronRight size={16} />
          <div><small>Next sighting</small><strong>{nextReveal ? `Move ${nextReveal}` : 'No more'}</strong></div>
        </div>
        <div className="header-actions">
          <button type="button" onClick={onRules}><CircleHelp size={18} /><span>Rules</span></button>
          <button type="button" onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen}><Settings2 size={18} /><span>Settings</span></button>
          <button type="button" className="exit-button" onClick={onHome}><ArrowLeft size={18} /><span>Save & exit</span></button>
        </div>
        {settingsOpen && (
          <div className="settings-popover">
            <label>
              <span>Sound cues</span>
              <button type="button" className="toggle-icon" onClick={() => onMutedChange(!muted)}>
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />} {muted ? 'Muted' : 'On'}
              </button>
            </label>
            {state.role === 'detective' && (
              <label>
                <span>Deduction overlay</span>
                <button type="button" className={`toggle ${deductionVisible ? 'on' : ''}`} onClick={() => onDeductionChange(!deductionVisible)} aria-pressed={deductionVisible}><i /></button>
              </label>
            )}
            <label>
              <span>Bot pace</span>
              <select value={botSpeed} onChange={(event) => onBotSpeedChange(Number(event.target.value))}>
                <option value={0}>Instant</option>
                <option value={180}>Quick</option>
                <option value={450}>Cinematic</option>
              </select>
            </label>
          </div>
        )}
      </header>

      <div className="game-status-banner">
        <span className="status-role-icon">{state.phase.startsWith('fugitive') ? <EyeOff /> : <Shield />}</span>
        <div><span className="eyebrow">{roleLabel(state.role)} · {difficultyLabel(state.difficulty)}</span><strong>{statusDetail}</strong></div>
        {botThinking && <span className="thinking-dots"><i /><i /><i /></span>}
        {!state.result && <span className="move-progress">Move <b>{Math.min(state.travelLog.length + 1, MAX_TRAVEL_SLOTS)}</b> of {MAX_TRAVEL_SLOTS}</span>}
      </div>

      <div className="game-layout">
        <MapBoard
          state={state}
          legalDestinations={legalDestinations}
          candidateStations={candidateStations}
          deductionVisible={state.role === 'detective' && deductionVisible}
          selectedStation={selectedStation}
          replayStation={replayStation}
          onSelectStation={onSelectStation}
        />

        <aside className="dossier">
          <TravelLog state={state} />

          <section className="dossier-section inventory-section">
            <div className="section-heading">
              <div><span className="eyebrow">Resources</span><h2>Your tickets</h2></div>
            </div>
            <div className="ticket-row">
              {state.role === 'fugitive' ? (
                <>
                  <TicketPill type="black" count={state.fugitive.blackTickets} />
                  <TicketPill type="double" count={state.fugitive.doubleTickets} />
                  <span className="ordinary-pass">∞<small>Public transit</small></span>
                </>
              ) : (
                <>
                  <TicketPill type="taxi" count={playerDetective.tickets.taxi} />
                  <TicketPill type="bus" count={playerDetective.tickets.bus} />
                  <TicketPill type="underground" count={playerDetective.tickets.underground} />
                </>
              )}
            </div>
          </section>

          {state.role === 'detective' && (
            <section className="dossier-section team-section">
              <div className="section-heading"><div><span className="eyebrow">Cordon</span><h2>Field team</h2></div><Bot size={18} /></div>
              <div className="team-list">
                {state.detectives.map((detective) => (
                  <div className={`team-member ${currentDetective?.id === detective.id ? 'active' : ''}`} key={detective.id}>
                    <i style={{ backgroundColor: detective.color }} />
                    <span><strong>{detective.id === state.humanDetectiveId ? 'You · ' : ''}{detective.name}</strong><small>Station {detective.position}</small></span>
                    <em>{detective.tickets.taxi + detective.tickets.bus + detective.tickets.underground}</em>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="dossier-section activity-section">
            <div className="section-heading"><div><span className="eyebrow">Dispatch</span><h2>Latest activity</h2></div></div>
            <ol className="activity-list">
              {recentEvents.map((event) => (
                <li key={event.id}><i /><span>{publicEvent(event, state)}</span></li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      {(isHumanFugitive || isHumanDetective) && !state.result && (
        <section className={`move-drawer ${selectedStation ? 'open' : ''}`} aria-live="polite">
          <div className="move-drawer-copy">
            <span className="eyebrow">Your decision</span>
            <strong>{selectedStation ? `Station ${selectedStation} selected` : 'Choose a highlighted station'}</strong>
            <small>{selectedStation ? 'Confirm the route and ticket below.' : `${legalDestinations.length} destinations are currently legal.`}</small>
          </div>
          {isHumanFugitive && !state.doubleMoveActive && (
            <button
              type="button"
              className={`double-toggle ${plannedDouble ? 'armed' : ''}`}
              disabled={!canUseDoubleMove(state)}
              onClick={() => onPlannedDoubleChange(!plannedDouble)}
              aria-pressed={plannedDouble}
            >
              <FastForward size={19} /><span><strong>{plannedDouble ? 'Double armed' : 'Use double move'}</strong><small>{state.fugitive.doubleTickets} remaining</small></span>
            </button>
          )}
          {state.doubleMoveActive && <div className="double-active"><FastForward /> Second leg required</div>}
          <div className="move-options">
            {selectedMoves.map((move, index) => {
              const transport = move.transport as Transport
              const Icon = TRANSPORT_ICONS[transport]
              const ticket = 'ticket' in move ? move.ticket : move.transport
              return (
                <button
                  type="button"
                  className={`move-option ${ticket}`}
                  key={`${move.to}-${move.transport}-${'ticket' in move ? move.ticket : index}`}
                  onClick={() => onConfirmMove(move)}
                >
                  {ticket === 'black' ? <EyeOff size={18} /> : <Icon size={18} />}
                  <span><strong>{ticket === 'black' ? 'Secret ticket' : TRANSPORT_LABELS[transport]}</strong><small>to station {move.to}</small></span>
                  <ChevronRight size={16} />
                </button>
              )
            })}
            {!selectedStation && legalMoves.length === 0 && (
              <button type="button" className="move-option stranded" onClick={onSkip}>Acknowledge: no legal route</button>
            )}
          </div>
        </section>
      )}

      {state.result && (
        <div className="result-backdrop">
          <section className={`result-card ${state.result.winner}`} role="dialog" aria-modal="true" aria-labelledby="result-title">
            <span className="result-icon">{state.result.winner === 'detectives' ? <Fingerprint /> : <EyeOff />}</span>
            <span className="eyebrow">Case closed · Move {state.travelLog.length}</span>
            <h2 id="result-title">
              {state.result.winner === 'detectives' ? 'The net closes.' : 'Gone without a trace.'}
            </h2>
            <p>{state.result.message}</p>
            <div className="result-stats">
              <span><strong>{state.travelLog.length}</strong><small>moves</small></span>
              <span><strong>{state.travelLog.filter((entry) => entry.ticket === 'black').length}</strong><small>secrets used</small></span>
              <span><strong>{state.seed}</strong><small>case seed</small></span>
            </div>
            <div className="route-reveal">
              <div><MapPinned size={18} /><strong>Declassified route</strong><span>Station {replayStation ?? '—'}</span></div>
              <input
                type="range"
                min="0"
                max={state.travelLog.length}
                value={replayIndex}
                onChange={(event) => setReplayIndex(Number(event.target.value))}
                aria-label="Replay fugitive route"
              />
              <div className="route-chips">
                {state.travelLog.map((entry) => (
                  <button type="button" key={entry.slot} className={replayIndex === entry.slot ? 'active' : ''} onClick={() => setReplayIndex(entry.slot)}>
                    <small>{entry.slot}</small><strong>{entry.destination}</strong>
                  </button>
                ))}
              </div>
            </div>
            <div className="result-actions">
              <button type="button" className="secondary-cta" onClick={() => onNewGame(true)}><RotateCcw size={18} /> Replay seed</button>
              <button type="button" className="primary-cta" onClick={() => onNewGame(false)}>New operation <ChevronRight size={18} /></button>
            </div>
            <button type="button" className="text-button resign-result" onClick={onHome}><X size={15} /> Return to briefing</button>
          </section>
        </div>
      )}

      {!state.result && (
        <button type="button" className="resign-fab" onClick={onResign} title="Resign operation"><Flag size={16} /> Resign</button>
      )}
    </main>
  )
}
