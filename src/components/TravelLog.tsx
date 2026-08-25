import { Eye, LockKeyhole } from 'lucide-react'
import { MAX_TRAVEL_SLOTS, REVEAL_SLOTS, TRANSPORT_SHORT } from '../data/map'
import type { GameState } from '../game/types'

export function TravelLog({ state }: { state: GameState }) {
  return (
    <section className="dossier-section" aria-labelledby="travel-log-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Evidence</span>
          <h2 id="travel-log-title">Travel log</h2>
        </div>
        <span className="counter">{state.travelLog.length} / {MAX_TRAVEL_SLOTS}</span>
      </div>
      <div className="travel-log" aria-label="Fugitive travel history">
        {Array.from({ length: MAX_TRAVEL_SLOTS }, (_, index) => {
          const slot = index + 1
          const entry = state.travelLog[index]
          const reveal = REVEAL_SLOTS.includes(slot)
          return (
            <div
              className={`travel-slot ${entry ? `filled ${entry.ticket}` : ''} ${reveal ? 'reveal-slot' : ''}`}
              key={slot}
              title={entry ? `Move ${slot}: ${entry.ticket}${entry.revealed ? `, station ${entry.destination}` : ''}` : `Move ${slot}`}
            >
              <span className="slot-number">{slot}</span>
              {entry ? (
                <strong>{TRANSPORT_SHORT[entry.ticket]}</strong>
              ) : reveal ? (
                <Eye size={13} />
              ) : (
                <LockKeyhole size={10} />
              )}
              {entry?.revealed && <small>{entry.destination}</small>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
