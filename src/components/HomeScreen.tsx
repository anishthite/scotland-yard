import { ArrowRight, Bot, EyeOff, Fingerprint, Map, Route, ShieldCheck, Ticket } from 'lucide-react'
import { difficultyLabel, roleLabel } from '../game/engine'
import type { Difficulty, GameState, HumanRole } from '../game/types'

interface HomeScreenProps {
  savedGame: GameState | null
  role: HumanRole
  difficulty: Difficulty
  seed: string
  onRoleChange: (role: HumanRole) => void
  onDifficultyChange: (difficulty: Difficulty) => void
  onSeedChange: (seed: string) => void
  onStart: () => void
  onContinue: () => void
  onOpenRules: () => void
}

export function HomeScreen({
  savedGame,
  role,
  difficulty,
  seed,
  onRoleChange,
  onDifficultyChange,
  onSeedChange,
  onStart,
  onContinue,
  onOpenRules,
}: HomeScreenProps) {
  return (
    <main className="home-shell">
      <nav className="home-nav">
        <a className="brand" href="#top" aria-label="London Pursuit home">
          <span className="brand-mark"><Fingerprint size={22} /></span>
          <span>LONDON <b>PURSUIT</b></span>
        </a>
        <button type="button" className="text-button" onClick={onOpenRules}>How to play</button>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="kicker"><span /> A hidden-movement strategy game</span>
          <h1>The city is a maze.<br /><em>Choose your side.</em></h1>
          <p>
            One fugitive. Five detectives. Twenty-two moves through a transport web where every ticket
            leaves a trace—and every decision tightens the net.
          </p>
          <div className="hero-proof">
            <span><Map size={17} /> 199 stations</span>
            <span><Bot size={17} /> Adaptive opponents</span>
            <span><ShieldCheck size={17} /> Fair-play AI</span>
          </div>
        </div>
        <div className="radar-art" aria-hidden="true">
          <div className="radar-ring ring-one" />
          <div className="radar-ring ring-two" />
          <div className="radar-ring ring-three" />
          <div className="radar-sweep" />
          <span className="radar-node node-one" />
          <span className="radar-node node-two" />
          <span className="radar-node node-three" />
          <div className="radar-center"><EyeOff size={34} /></div>
          <span className="coordinate top">51.5074° N</span>
          <span className="coordinate bottom">0.1278° W</span>
        </div>
      </section>

      <section className="operation-panel" aria-labelledby="operation-title">
        <div className="operation-heading">
          <span className="eyebrow">New operation</span>
          <h2 id="operation-title">Choose your assignment</h2>
        </div>

        {savedGame && !savedGame.result && (
          <button type="button" className="continue-card" onClick={onContinue}>
            <span className="continue-icon"><Route size={24} /></span>
            <span>
              <small>Case in progress</small>
              <strong>Continue as {roleLabel(savedGame.role)}</strong>
              <em>Move {savedGame.travelLog.length + 1} · Seed {savedGame.seed}</em>
            </span>
            <ArrowRight size={22} />
          </button>
        )}

        <div className="role-grid">
          <button
            type="button"
            className={`role-card fugitive-role ${role === 'fugitive' ? 'selected' : ''}`}
            onClick={() => onRoleChange('fugitive')}
            aria-pressed={role === 'fugitive'}
          >
            <span className="role-index">01</span>
            <span className="role-icon"><EyeOff size={29} /></span>
            <span className="role-content">
              <small>Evade the cordon</small>
              <strong>The Fugitive</strong>
              <span>Stay hidden, disguise your route and survive all 22 moves.</span>
            </span>
            <span className="selection-dot" />
          </button>
          <button
            type="button"
            className={`role-card detective-role ${role === 'detective' ? 'selected' : ''}`}
            onClick={() => onRoleChange('detective')}
            aria-pressed={role === 'detective'}
          >
            <span className="role-index">02</span>
            <span className="role-icon"><Fingerprint size={29} /></span>
            <span className="role-content">
              <small>Close the net</small>
              <strong>Lead Detective</strong>
              <span>Read the ticket trail and coordinate with four AI partners.</span>
            </span>
            <span className="selection-dot" />
          </button>
        </div>

        <div className="setup-row">
          <div className="field-group">
            <label>Opposition</label>
            <div className="segmented-control">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={difficulty === value ? 'active' : ''}
                  onClick={() => onDifficultyChange(value)}
                >
                  {difficultyLabel(value)}
                </button>
              ))}
            </div>
          </div>
          <div className="field-group seed-field">
            <label htmlFor="seed">Case seed <span>optional</span></label>
            <input
              id="seed"
              inputMode="numeric"
              value={seed}
              onChange={(event) => onSeedChange(event.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="Random"
            />
          </div>
          <button type="button" className="primary-cta" onClick={onStart}>
            Begin pursuit <ArrowRight size={19} />
          </button>
        </div>
      </section>

      <section className="feature-strip">
        <div><EyeOff /><span><strong>Hidden information</strong>Track transport clues, not coordinates.</span></div>
        <div><Ticket /><span><strong>Every ticket matters</strong>Spend limited routes with intent.</span></div>
        <div><Bot /><span><strong>Three AI levels</strong>From a loose chase to a closing net.</span></div>
      </section>
      <footer className="home-footer">An original browser strategy game · No account required · Saves locally</footer>
    </main>
  )
}
