# Product Requirements Document: London Pursuit

Status: Implemented
Version: 1.0
Date: 2026-08-25

## 1. Product summary

London Pursuit is a browser-based, single-player hidden-movement board game inspired by the full rules of Scotland Yard. The player chooses either side:

- **Fugitive:** evade five AI detectives across London.
- **Detective:** control one detective while an AI fugitive and four AI teammates play the other roles.

The first release is a mechanically faithful solo adaptation of the current full tabletop rules. It includes the complete transport graph, hidden travel log, constrained detective tickets, secret tickets, double moves, scheduled reveals, win/loss detection, save/resume, three bot difficulty levels, and a post-game route review.

The product will use original branding, copy, map rendering, icons, sound, and visual design. “Scotland Yard” and “Mister X” are used only in planning documents to describe rules compatibility; public-facing assets should remain brand-neutral unless the project obtains permission from the rights holder.

## 2. Problem and opportunity

The physical game depends on several people, concealed information, manual bookkeeping, and a player willing to run the fugitive. A solo digital version can preserve the deduction and pursuit while removing those barriers.

The essential experience is not merely moving pieces around a map. It is:

1. Forming and updating a belief about an unseen opponent.
2. Spending limited transport options at the right time.
3. Coordinating a net of detectives without giving the bots hidden information.
4. Creating tense reveal moments in which the search either closes in or falls apart.

## 3. Goals

### P0 goals

- Let a player complete a full legal game as either the fugitive or a detective.
- Make every bot role competent enough to produce a coherent chase.
- Guarantee that detective bots use only information a human detective could know.
- Implement the canonical full-game map topology and rules accurately.
- Make legal moves, ticket costs, the travel log, turn order, and reveal timing easy to understand.
- Run entirely in a modern browser with no account or server required.
- Save an in-progress game automatically and restore it exactly.

### P1 goals

- Offer Easy, Medium, and Hard AI presets.
- Include an interactive tutorial and contextual rules help.
- Provide an optional detective deduction overlay derived solely from public information.
- Let players adjust bot animation/thinking speed.
- Show a complete route and decision replay after the game.

### Non-goals for v1

- Online or local pass-and-play multiplayer.
- Accounts, leaderboards, matchmaking, cloud saves, or purchases.
- A level editor, alternate cities, custom maps, or house-rule editor.
- The simplified 13-round beginner rules.
- Perfect or tournament-grade AI.
- Direct copies of the commercial board, box, illustrations, rules prose, logo, or character designs.

## 4. Target users

### Returning board-game player

Already understands the tabletop game and wants a quick, faithful solo match. Values correct rules, a legible board, and bots that do not cheat.

### New deduction-game player

Needs the interface to teach why a move is legal, what each ticket means, when the fugitive will surface, and how to read the travel log.

### Strategy-focused player

Wants a challenging bot, reproducible games, a post-game route reveal, and enough information to understand why a match was won or lost.

## 5. Product principles

- **Information is part of the rules.** Hidden state must be protected at the software boundary, not merely hidden by CSS.
- **The board is the primary interface.** Status panels support the map rather than compete with it.
- **No surprise illegality.** Only legal destinations are actionable, and the cost of a move is visible before confirmation.
- **Fast by default, inspectable by choice.** Routine bot moves should be quick, while history and reasoning aids remain available.
- **Deterministic core.** A game seed plus an action log must reproduce the exact setup and outcome.

## 6. Canonical game specification

This PRD targets the current full rules represented by Ravensburger’s 2023 rulebook, not the beginner version or older 24-move editions.

### 6.1 Pieces and setup

- One fugitive and five detectives are in play.
- If the human chooses Fugitive, all five detectives are bots.
- If the human chooses Detective, the human controls one detective, four detectives are bots, and the fugitive is a bot.
- Each detective starts with:
  - 11 taxi tickets.
  - 8 bus tickets.
  - 4 underground tickets.
- The fugitive starts with:
  - 5 black tickets.
  - 2 double-move tickets.
  - Access to ordinary transport tickets from the general supply.
- Starting positions are drawn using separate fugitive and detective start pools from the canonical edition.
- No two detectives may occupy the same starting station.
- The fugitive’s start is hidden from the detective side.
- Setup randomness comes from a stored seed.

### 6.2 Board and transport

- The board is a graph of numbered London stations and typed, bidirectional edges.
- Edge types are taxi, bus, underground, and ferry.
- A move follows exactly one connected edge to its next station.
- A detective may use taxi, bus, or underground only while holding the corresponding ticket.
- Only the fugitive may use ferry routes, and only by spending a black ticket.
- A black ticket may also replace any ordinary transport ticket and conceals the transport type from detectives.
- A piece cannot end a normal move at a station occupied by another detective.
- The fugitive may never enter a detective-occupied station, including either leg of a double move.
- A detective entering the fugitive’s current station captures the fugitive even while the fugitive is hidden.

### 6.3 Turn and travel-log model

The engine distinguishes a **travel-log move** from a **detective response phase** so double moves cannot create off-by-one rule errors.

1. The fugitive makes one legal move and adds its transport ticket to the next travel-log slot.
2. If a double-move ticket was declared, the fugitive immediately makes a second legal move and fills a second slot.
3. The detective team then moves each detective once, in sequence, if that piece has a legal move.
4. Capture and terminal conditions are checked after every atomic move.

Additional requirements:

- The full travel log has 22 slots.
- The fugitive reveals the current station after filling slots 3, 8, 13, and 18.
- At the start of the fugitive’s next move, the revealed piece becomes hidden again.
- During a double move, a reveal is applied exactly when the relevant slot is filled. If a second leg follows, the fugitive can disappear again before detectives respond.
- A double move consumes one double-move ticket and two travel-log slots.
- A double move is illegal when fewer than two travel-log slots remain.
- Ordinary fugitive tickets disclose the used mode but not the destination.
- Black tickets disclose neither the mode nor destination.
- Used detective tickets return to the general supply.
- A player who has at least one legal move must move; passing is not allowed.
- A detective with no legal move sits out that detective phase.

### 6.4 Detective order in solo play

- The human-controlled detective moves first during each detective phase.
- The four bot detectives then move in a stable, visible order.
- Bot plans are recalculated after the human move so they coordinate around the player rather than reserve or block destinations unexpectedly.
- In fugitive mode, the five detective bots jointly plan and then execute a conflict-free order.

This fixed ordering is one valid ordering under the tabletop rule that detectives may move in any order. It also keeps the solo interaction predictable.

### 6.5 Win and loss conditions

The detective team wins immediately when:

- Any detective occupies the fugitive’s current station; or
- The fugitive has no legal destination at the start of a required move, including the second leg of a committed double move.

The fugitive wins when:

- The final detective response after travel-log slot 22 completes without capture; or
- Every detective is permanently unable to move because its usable tickets are exhausted.

Temporary blockage by occupied stations does not by itself end the game.

## 7. User experience

### 7.1 Primary flow

1. Open the title screen.
2. Choose **Play as Fugitive** or **Play as Detective**.
3. Choose Easy, Medium, or Hard.
4. Optionally change color, tutorial prompts, deduction overlay, animation speed, or seed.
5. Review a concise role briefing.
6. Play the generated game.
7. See the result and key statistics.
8. Reveal and scrub through the full route, replay the same seed, or start a new game.

An unfinished game is offered as **Continue** on the title screen.

### 7.2 Game screen

The game screen contains:

- A pan-and-zoom vector map occupying most of the viewport.
- Clearly differentiated station and route types using color plus shape/pattern.
- Detective pieces, and the fugitive piece only when the current player is the fugitive or a reveal is public.
- Legal destination highlights after selecting a piece or transport type.
- A move preview showing destination, ticket cost, and any reveal/double-move consequence.
- A travel log showing filled slots, used transport, reveal slots, and remaining spaces.
- Ticket inventories for the human and relevant public bot information.
- Current phase, current actor, remaining bot actions, and next reveal.
- Controls for rules, settings, save/exit, restart, and resign.

### 7.3 Detective-specific aids

- Public travel history is always visible.
- The optional deduction overlay shows stations at which the fugitive could legally be, based only on public information and known occupancy.
- Selecting a candidate station explains which public path(s) keep it possible.
- The overlay updates after every public move and reveal.
- The overlay never uses the true hidden position.

### 7.4 Feedback and pacing

- Moves animate along their route but remain skippable.
- A reveal gets a brief, distinct visual and audio cue.
- Capture, escape, illegal-action prevention, ticket depletion, black tickets, and double moves each have unambiguous feedback.
- Easy and Medium bot turns should feel effectively immediate.
- Hard bot turns may show a short “planning” state and can be accelerated in settings.
- The UI never exposes a hidden bot destination through focus order, DOM labels, logs, animation origins, or persisted public state.

### 7.5 Undo policy

- The player may cancel a move preview before confirmation.
- There is no undo after a confirmed move if any hidden information was revealed or any bot action was computed.
- Restarting or replaying the same seed is always available.

## 8. Bot requirements

### 8.1 Shared constraints

- Bots must always return a legal action within a configured time budget.
- A deterministic fallback policy must handle timeouts or AI errors.
- Tie-breaking uses the game’s seeded pseudo-random generator.
- Bot computation should run outside the render path; Hard AI should use a Web Worker if needed.
- Each detective bot receives only a sanitized `DetectiveView`, never the authoritative hidden game state.
- Tests must demonstrate that changing the hidden fugitive position between two states with identical public information does not change a detective bot decision for the same seed.

### 8.2 Detective belief model

The detective AI maintains a set or weighted distribution of possible fugitive stations:

1. Initialize from legal hidden start cards.
2. Expand candidates through edges matching each disclosed transport ticket.
3. For a black ticket, expand through all modes including ferry.
4. Remove stations occupied by detectives at the time of the fugitive move.
5. Collapse the set to the revealed station on reveal slots.
6. Preserve historical snapshots for explanations and post-game review.

### 8.3 Difficulty profiles

#### Easy

- Chooses legal moves with a mild preference for approaching the last revealed position.
- Does little joint coverage planning.
- Fugitive favors mobility and distance but accepts obvious risks.
- Target decision time: under 100 ms.

#### Medium

- Detective team uses the public candidate set, shortest-path distance by available tickets, station coverage, and collision-aware joint assignment.
- Preserves scarce underground tickets unless they materially improve coverage.
- Fugitive scores distance from detectives, onward mobility, ticket ambiguity, reveal timing, and escape from likely interception.
- Uses shallow lookahead or beam search.
- Target decision time: under 500 ms for a team phase.

#### Hard

- Detective team maintains weighted hypotheses and searches coordinated move combinations to reduce candidate entropy, cover transport hubs, and minimize worst-case distance.
- Fugitive uses depth-limited adversarial search or bounded Monte Carlo search over likely detective responses.
- Search remains strictly time-bounded and deterministic for a given seed and time-budget configuration.
- Target decision time: under 2 seconds for a team phase on a representative laptop.

### 8.4 Bot quality evaluation

- Run seeded batches with each role and difficulty.
- Confirm zero illegal actions and zero hidden-information accesses.
- Check that increasing difficulty improves win rate over a statistically meaningful batch, while accepting that asymmetric roles may not reach 50/50.
- Track average decision latency, branching factor, candidate-set size, ticket usage, capture slot, and timeout rate.
- Tune against fixed benchmark seeds so improvements are comparable.

## 9. Functional requirements

### P0

- New game setup for either role.
- Canonical full map and start pools.
- Complete legal-move generation and validation.
- All normal, black, ferry, and double-move rules.
- Accurate hidden/public views and reveal schedule.
- Human interaction for both roles.
- Five total detectives, with bots filling every non-human role.
- At least one competent bot policy for each side.
- Win/loss detection and result screen.
- Automatic local save and exact resume.
- Rules reference and first-game guidance.
- Responsive desktop and tablet layout.
- Keyboard-operable core game controls.

### P1

- Three distinct difficulty levels.
- Deduction overlay.
- Post-game replay and route reveal.
- Reduced-motion and sound controls.
- Seed entry/copy and “play again” actions.
- Bot batch-simulation harness.

### P2

- Beginner rules.
- Daily seeded challenge.
- In-game bot rationale summaries derived from public scoring features.
- Installable Progressive Web App behavior.
- Match statistics stored locally.

## 10. Data and state model

The authoritative model should be serializable and independent of React.

Core concepts:

- `Station`: id, render coordinates, supported transport types.
- `Edge`: origin, destination, transport type.
- `Actor`: fugitive or detective, controller, position, ticket inventory.
- `TravelEntry`: slot, ticket shown, hidden destination, reveal status.
- `GameState`: seed, rules version, phase, actors, travel log, result, action history.
- `PlayerView`: a role-filtered projection of `GameState`.
- `Action`: start game, select/confirm move, declare double, bot move, resign, change setting.
- `Ruleset`: ticket counts, reveal slots, log length, start pools, enabled transport modes.

The map data is validated at build/test time for duplicate edges, invalid endpoints, asymmetric ordinary routes, ferry definitions, station coverage, and expected counts. Hidden fields must not be serialized into detective-facing debug output or accessibility text.

## 11. Non-functional requirements

### Correctness

- The rules engine is a pure, deterministic module with exhaustive tests around turn boundaries.
- Every action is validated by the engine even if the UI already filtered it.
- Saved games carry a schema and rules version and fail safely if incompatible.

### Performance

- Initial interactive load target: under 2.5 seconds on a typical broadband laptop after compression.
- Map pan/zoom target: 60 fps under normal use.
- No bot computation may freeze interaction or animation for more than one frame budget.
- Serialized saves should remain below 500 KB per active game.

### Accessibility

- Target WCAG 2.2 AA for the core flow.
- All routes and tickets have non-color indicators.
- All core actions are keyboard accessible with visible focus.
- The map has a list-based station/move alternative for screen-reader and keyboard users.
- Reduced motion and mute are available.
- Hidden information is excluded from assistive-technology output.

### Browser and layout support

- Latest two major versions of Chrome, Safari, Firefox, and Edge.
- Primary layouts: desktop at 1280 px and above; tablet at 768–1279 px.
- Phone layouts below 768 px are usable for basic play but are not a v1 optimization target.

### Privacy and security

- No account, tracking, or network call is required after loading the application.
- Game state and preferences remain on the device.
- Any future analytics must be opt-in and must not include full move histories by default.

## 12. Acceptance scenarios

1. **Hidden setup:** Starting a detective game never exposes the fugitive’s start in visible UI, DOM accessibility output, public logs, or the detective bot input.
2. **Ordinary move:** Selecting a detective shows only adjacent, unoccupied destinations affordable with that detective’s tickets, and confirmation consumes exactly one matching ticket.
3. **Black move:** A black fugitive move consumes one black ticket, can traverse any valid transport edge including ferry, and exposes only “black” to the detective view.
4. **Double move:** A double move consumes its special ticket, fills two consecutive log slots, validates both legs, triggers intermediate capture/reveal checks, and gives detectives no move between legs.
5. **Reveal:** Filling slot 3, 8, 13, or 18 exposes the fugitive’s exact station until the fugitive begins the next move.
6. **Hidden capture:** A detective moving onto the true hidden fugitive station immediately ends the game without requiring a reveal slot.
7. **Blocked fugitive:** If every destination is detective-occupied, the detective team wins before another move is requested.
8. **Ticket exhaustion:** A detective with no usable legal ticket sits out; the fugitive wins early only if every detective is permanently unable to move.
9. **Final escape:** Filling slot 22 does not immediately declare victory; the fugitive wins only after the final detective response finishes without capture.
10. **Save/resume:** Reloading during any stable decision phase restores the same board, hidden state, travel log, inventories, seed, and next actor.
11. **No-cheat AI:** Two authoritative states with identical `DetectiveView` values produce identical detective bot choices under the same seed.
12. **Replay:** After the result, replay exposes the initial fugitive position and every move, including the path through black and double tickets.

## 13. Success criteria

The first release is successful when:

- 100% of canonical rule fixtures pass.
- A 10,000-game automated simulation completes with zero illegal moves or unrecoverable states.
- Saved-game round trips reproduce the same state and deterministic continuation.
- Easy and Medium bot decisions meet their latency targets at the 95th percentile; Hard meets its target at the 90th percentile.
- External playtesters can start and finish a first game without developer assistance.
- Playtesters can correctly explain why the fugitive was visible or hidden and why a selected move was or was not legal.
- No commercial board artwork, logo, rules text, or branded character asset ships in the product.

## 14. Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Incorrect map topology | Makes the clone strategically or mechanically wrong | Store the graph as reviewed data, cross-check it independently, and test representative routes and counts |
| Detective bots accidentally cheat | Invalidates the core experience | Enforce role-filtered state types, worker message schemas, invariant tests, and decision-equivalence tests |
| Joint detective search explodes | Hard mode feels slow | Prune dominated moves, cap beam width/depth, cache distances, use a worker, and keep a legal fallback |
| Map is hard to read on smaller screens | Blocks basic play | Use scalable vector rendering, pan/zoom, focus mode, route filters, and a move list alternative |
| Rule-edition ambiguity | Creates inconsistent expectations | Version the ruleset and document the 2023 full-rule baseline in the UI |
| Trademark/copyright concerns | Prevents safe distribution | Use original branding and assets; obtain legal review or a license before any commercial release |
| AI win rates are poorly balanced | One role stops being fun | Batch-test both roles, tune by difficulty, and expose difficulty separately per opposing side later if needed |

## 15. Product decisions recorded for v1

- Platform: browser-first, local-only.
- Human players: exactly one.
- Detective count: five total.
- Rules baseline: current 22-slot full game with reveals at 3/8/13/18.
- Human detective turn order: human first, bots afterward.
- Visual direction: original, brand-neutral stylized London transit map.
- Rules accuracy takes priority over older-edition compatibility.
- Multiplayer, accounts, and backend services are deferred.

## 16. Definition of done

Version 1 is done when all P0 requirements and acceptance scenarios pass; both roles can complete a saved and resumed game; the no-cheat AI boundary is verified; the full map data has been independently checked; automated simulation finds no illegal state; and the original visual/audio asset set has completed an IP review.

## 17. Rule references

- [Ravensburger product page and current full-game downloads](https://www.ravensburger.us/en-US/products/games/board-games/scotland-yard-27514)
- [Ravensburger current full rules PDF](https://product-files.ravensburger.cloud/manuals/706853.pdf)
