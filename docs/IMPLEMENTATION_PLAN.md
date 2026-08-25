# London Pursuit: Implementation Plan

Status: Proposed  
Date: 2026-08-25  
Companion document: [PRD](./PRD.md)

## 1. Delivery strategy

Build the game from the rules engine outward. The first playable milestone should use an intentionally plain board and simple bots, but already enforce hidden information correctly. Visual polish and stronger search come only after the game can simulate thousands of valid matches.

The project is greenfield. The recommended v1 stack is:

- React, TypeScript, and Vite for the browser application.
- SVG for the board and route rendering.
- A pure TypeScript game engine driven by a reducer/state machine.
- Vitest plus property-based tests for rules and graph invariants.
- Playwright for end-to-end role, save/resume, and accessibility flows.
- A Web Worker for expensive Hard bot searches.
- Browser storage behind a versioned persistence adapter.
- ESLint, Prettier, and strict TypeScript checks in CI.

No backend is required.

## 2. Proposed architecture

```text
src/
  app/                  routing, application shell, providers
  game/
    engine/             phases, legal moves, transitions, outcomes
    model/              authoritative state and action types
    views/              FugitiveView and DetectiveView projections
    rulesets/           versioned ticket/reveal/setup configuration
    replay/             action log and deterministic reconstruction
  data/
    map/                 reviewed station, edge, and render-coordinate data
    validation/          graph/start-pool validation
  ai/
    shared/              scoring, pathfinding, seeded tie-breaking
    detective/           belief tracking and team planning
    fugitive/            evasion policies and lookahead
    worker/              bounded search protocol and fallbacks
    simulation/          batch runner and benchmark fixtures
  ui/
    board/               SVG map, pieces, highlights, pan/zoom
    panels/              travel log, tickets, phase, rules, settings
    flows/               setup, tutorial, results, replay
    accessibility/       move list and announcements
  persistence/           save schema, migrations, preferences
  test/                  fixtures, builders, shared assertions
```

The authoritative state is never passed directly to detective UI or AI. Both consume a projection created in `game/views`. That separation is an architectural acceptance criterion, not a later refactor.

## 3. Milestones

Estimates are indicative engineering effort after the PRD is approved. Map transcription/review and Hard bot tuning carry the most uncertainty.

### Milestone 0 — Project and data preflight

Indicative effort: 0.5–1 day

Deliverables:

- Confirm the 2023 full ruleset and document any unresolved edge cases as fixtures.
- Establish brand-neutral working title and original-art boundary.
- Identify and independently verify the canonical station graph and start pools.
- Scaffold React/TypeScript/Vite, tests, linting, formatting, and CI.
- Add a minimal app shell and test command.

Exit gate:

- CI runs typecheck, unit tests, lint, and a production build.
- Map data provenance and review approach are recorded.
- No copied commercial artwork is present.

### Milestone 1 — Map model and deterministic rules engine

Indicative effort: 2–3 days

Deliverables:

- Typed station and transport-edge data.
- Graph validation and precomputed adjacency/pathfinding helpers.
- Seeded setup with separate detective and fugitive start pools.
- Ticket inventories, occupied-station constraints, normal moves, black moves, ferries, and double moves.
- A precise phase machine for fugitive moves, detective responses, reveal timing, and terminal results.
- Role-filtered `FugitiveView` and `DetectiveView` projections.
- Serializable action history and deterministic replay.

Critical tests:

- Golden fixtures for every reveal and end-game boundary.
- Double moves that enter, cross, or end adjacent to reveal slots.
- Capture on hidden moves and both double-move legs.
- No-move and depleted-ticket outcomes.
- Property tests: every generated legal action is accepted; rejected actions never mutate state; replay equals original state.
- Graph invariants: valid endpoints, route symmetry where required, no duplicates, correct ferry restrictions, expected station/start counts.

Exit gate:

- A headless full game can be driven entirely through legal actions.
- The same seed and actions always produce the same state.
- Detective projections contain no hidden destination or true candidate weighting derived from it.

### Milestone 2 — First complete playable UI

Indicative effort: 2–3 days

Deliverables:

- New-game flow with role and initial difficulty choice.
- Original SVG board with station labels, route styles, pieces, and pan/zoom.
- Legal move selection, preview, confirmation, black-ticket choice, and double-move two-step flow.
- Travel log, tickets, current actor, next reveal, and result screen.
- Simple legal Easy bots for both sides.
- Responsive desktop/tablet layout and reduced-motion foundation.
- Rules panel and contextual first-game prompts.

Exit gate:

- A human can finish a valid game as either role without developer tools.
- Playwright covers both happy paths plus capture and final escape.
- Hidden fugitive data is absent from the detective-rendered DOM and accessibility tree.

### Milestone 3 — Coordinated, non-cheating bots

Indicative effort: 2–4 days

Deliverables:

- Public-information belief-state tracker for detective AI.
- Medium detective joint planner using candidate coverage, path distance, ticket cost, and collision avoidance.
- Medium fugitive evaluator using distance, mobility, ambiguity, reveal timing, and ticket conservation.
- Hard time-bounded beam/adversarial or Monte Carlo search in a Web Worker.
- Deterministic legal fallback for every bot policy.
- Batch simulation command and benchmark report by role/difficulty.
- Optional candidate overlay powered by the same public belief model.

Exit gate:

- 10,000 simulated games produce no illegal move or unrecoverable state.
- No-cheat equivalence tests pass.
- Bot latency stays within the PRD targets on a representative laptop.
- Medium outperforms Easy over the fixed benchmark suite; Hard shows a measurable improvement or the difference is documented and retuned.

### Milestone 4 — Persistence, replay, accessibility, and polish

Indicative effort: 1.5–2.5 days

Deliverables:

- Versioned autosave and exact resume at stable decision points.
- Post-game full-route replay with a timeline scrubber.
- Seed copy/replay and new-game shortcuts.
- Keyboard-complete move list alternative to the map.
- Screen-reader status announcements that preserve hidden information.
- Sound, mute, reduced motion, animation speed, route legend, and contrast polish.
- Empty/error/corrupt-save recovery states.

Exit gate:

- Save round-trip and migration fixtures pass.
- Automated accessibility checks pass, followed by a manual keyboard and screen-reader smoke test.
- Current Chrome, Safari, Firefox, and Edge complete the core flows.

### Milestone 5 — Release hardening

Indicative effort: 1–2 days

Deliverables:

- Cross-check of every map edge and start position by a second method or reviewer.
- Performance profiling of map rendering, load size, save size, and bot worker behavior.
- Rules regression matrix and final simulation run.
- Original asset/license inventory.
- Production build and deployment notes.
- Known limitations and deferred backlog.

Exit gate:

- Every P0 requirement and PRD acceptance scenario passes.
- No P0/P1 severity bug remains open.
- Production build works without a server dependency after initial load.

## 4. Recommended build order within milestones

1. Encode the graph and write validators before drawing the final map.
2. Implement `legalActions(state, actor)` before any click interaction.
3. Implement `applyAction` and terminal checks before bots.
4. Create role-filtered views before any hidden-state UI.
5. Add a random legal policy and run simulations before visual polish.
6. Build the SVG board against the same graph IDs used by the engine.
7. Add belief tracking, then team scoring, then bounded lookahead.
8. Add persistence only after the action/state schema stabilizes.
9. Add replay from the existing action log rather than recording UI animations.
10. Finish with asset, browser, accessibility, and rules audits.

## 5. Testing plan

### Unit and fixture tests

- Graph adjacency and transport type.
- Ticket use and return-to-supply behavior.
- Occupancy and capture rules.
- Reveal/hide transitions.
- Double-move slot accounting.
- Permanent versus temporary inability to move.
- Player-view redaction.
- Belief-set expansion and collapse.
- Save schema round trips.

### Property and simulation tests

- Random legal action sequences never violate invariants.
- Every non-terminal required actor has either a legal action or a rules-defined skip/outcome.
- Ticket counts never become negative.
- Detectives never share a station.
- Fugitive never survives on a detective station.
- Public replay prefixes never disclose a future or hidden station.
- Seeded games are reproducible across runs.

### End-to-end tests

- Start and complete a game in each human role.
- Use black and double tickets through map interaction.
- Capture a hidden fugitive.
- Reach and survive the final slot.
- Save, reload, and continue.
- Complete a move without pointer input.
- Verify reduced-motion and mute settings.
- Recover from a malformed saved game.

### Manual playtest focus

- Can a new player understand the travel log after one explanation?
- Can a returning player spot any mismatch with the tabletop rules?
- Does the map remain readable while zoomed out and while routes overlap?
- Do bot moves look coordinated rather than merely individually plausible?
- Does Hard feel smarter without feeling as if it knows the hidden location?
- Is the reveal cadence dramatic but fast enough for repeat play?

## 6. CI quality gates

Every pull request should run:

1. Formatting check.
2. ESLint.
3. Strict TypeScript check.
4. Unit and property tests.
5. Production build.
6. A short seeded simulation suite.
7. Playwright smoke tests at desktop and tablet sizes.
8. Automated accessibility scan of setup and game screens.

The longer simulation matrix and browser matrix can run nightly or before release.

## 7. Key implementation decisions

### Pure engine over UI-owned state

Rules live in pure functions, not React components. This supports simulation, deterministic replay, save migration, bot search, and reliable tests from one implementation.

### SVG over a geographic map SDK

The game uses a stylized transport network, not real-world navigation. SVG gives exact station placement, crisp scaling, keyboard targets, route styling, and no third-party tile dependency.

### Sanitized views over developer discipline

Detective UI and AI receive a structurally redacted state type. This makes accidental hidden-information use harder and testable.

### Time-bounded search over fixed depth alone

Bot branching changes significantly by position. Iterative search with a deadline and a known legal fallback gives stable interaction latency.

### Action-log replay over state snapshots alone

Store periodic state plus the canonical action log. This enables exact resume, debugging, and post-game playback while keeping schema migrations manageable.

## 8. Deferred backlog

- Beginner 13-round rules.
- Variable detective counts and official bobby behavior.
- Local pass-and-play and private online rooms.
- Daily challenges and local statistics.
- Separate opposing-side difficulty sliders.
- Alternate original maps and themes.
- Installable/offline PWA packaging.
- Bot explanation panel and opening-book experiments.

## 9. Approval checkpoint

Before implementation begins, confirm these product choices:

- The current 22-slot full rules are the target, rather than an older 24-move edition.
- One human plus enough bots to keep five detectives in play is the intended v1 format.
- A mechanically faithful but visually original, brand-neutral presentation is acceptable.
- Desktop/tablet browser play is the primary launch target; online multiplayer is deferred.

If these defaults are accepted, Milestone 0 can begin without further product discovery.
