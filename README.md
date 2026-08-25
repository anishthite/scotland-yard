# London Pursuit

London Pursuit is a complete single-player hidden-movement strategy game for the browser. Play as the fugitive against five AI detectives, or lead one detective while four AI partners pursue an AI fugitive.

**Play now:** [london-pursuit.pages.dev](https://london-pursuit.pages.dev)

## Features

- Complete 199-station, 468-route transport graph.
- Full 22-move rules with cab, bus, rail, ferry, secret, and double-move tickets.
- Scheduled fugitive sightings on moves 3, 8, 13, and 18.
- Easy, Medium, and Hard deterministic bots.
- Public-information-only detective AI and optional deduction overlay.
- Autosave, exact resume, case seeds, and post-game route declassification.
- Responsive original SVG board with keyboard-accessible moves.
- No account or backend required.

## Run locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm test
npm run build
npm run test:e2e
```

The test suite includes 10,000 complete seeded bot simulations, rules fixtures, hidden-information checks, and real Chromium flows for both roles.

## Documentation

- [Product requirements document](./docs/PRD.md)
- [Implementation plan](./docs/IMPLEMENTATION_PLAN.md)
- [Data attribution](./NOTICE.md)

The game uses original branding and visual assets while preserving the pursuit, ticket, reveal, and double-move mechanics described in the PRD.
