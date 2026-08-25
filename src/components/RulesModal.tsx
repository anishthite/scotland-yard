import { BusFront, CarFront, Eye, Fingerprint, ShipWheel, TrainFront, X } from 'lucide-react'

export function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="rules-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close rules"><X /></button>
        <span className="eyebrow">Field manual</span>
        <h2 id="rules-title">How the pursuit works</h2>
        <p className="rules-lede">
          The fugitive moves first and stays hidden. Detectives see each transport ticket, then move once
          each to narrow the search.
        </p>
        <div className="rules-grid">
          <article>
            <span className="rule-number">01</span>
            <Fingerprint />
            <h3>Catch or escape</h3>
            <p>A detective wins for the whole team by landing on the fugitive’s station. The fugitive wins after surviving the final detective response.</p>
          </article>
          <article>
            <span className="rule-number">02</span>
            <Eye />
            <h3>Scheduled sightings</h3>
            <p>The fugitive’s exact location is revealed after moves 3, 8, 13 and 18, then hidden again on the next move.</p>
          </article>
          <article>
            <span className="rule-number">03</span>
            <ShipWheel />
            <h3>Secret tickets</h3>
            <p>Five black tickets conceal the mode of travel and are the only way to cross ferry routes. Two double tickets allow consecutive moves.</p>
          </article>
          <article>
            <span className="rule-number">04</span>
            <TrainFront />
            <h3>Limited resources</h3>
            <p>Each detective has 11 cab, 8 bus and 4 rail tickets. A stranded detective cannot move, so long routes must be used deliberately.</p>
          </article>
        </div>
        <div className="transport-key">
          <span><CarFront /> Cab <em>short, plentiful</em></span>
          <span><BusFront /> Bus <em>medium range</em></span>
          <span><TrainFront /> Rail <em>fast, scarce</em></span>
          <span><ShipWheel /> Ferry <em>black ticket only</em></span>
        </div>
        <button type="button" className="primary-cta full" onClick={onClose}>Ready for briefing</button>
      </section>
    </div>
  )
}
