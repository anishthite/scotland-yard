import { useMemo, useState } from 'react'
import { LocateFixed, Minus, Plus } from 'lucide-react'
import { EDGES, STATION_BY_ID, STATIONS } from '../data/map'
import type { GameState } from '../game/types'

interface MapBoardProps {
  state: GameState
  legalDestinations: number[]
  candidateStations: number[]
  deductionVisible: boolean
  selectedStation: number | null
  replayStation?: number | null
  onSelectStation: (station: number) => void
}

const EDGE_ORDER = { taxi: 0, bus: 1, underground: 2, water: 3 }

export function MapBoard({
  state,
  legalDestinations,
  candidateStations,
  deductionVisible,
  selectedStation,
  replayStation,
  onSelectStation,
}: MapBoardProps) {
  const [zoom, setZoom] = useState(1)
  const legal = useMemo(() => new Set(legalDestinations), [legalDestinations])
  const candidates = useMemo(() => new Set(candidateStations), [candidateStations])
  const edges = useMemo(
    () => [...EDGES].sort((a, b) => EDGE_ORDER[a.transport] - EDGE_ORDER[b.transport]),
    [],
  )
  const visibleFugitive = state.role === 'fugitive' || state.fugitiveVisible || state.result

  return (
    <section className="map-card" aria-label="London transport board">
      <div className="map-toolbar">
        <div className="map-legend" aria-label="Route legend">
          <span><i className="legend-line taxi" /> Cab</span>
          <span><i className="legend-line bus" /> Bus</span>
          <span><i className="legend-line underground" /> Rail</span>
          <span><i className="legend-line water" /> Ferry</span>
        </div>
        <div className="zoom-controls" aria-label="Map zoom">
          <button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.8, value - 0.2))}>
            <Minus size={15} />
          </button>
          <button type="button" aria-label="Reset zoom" onClick={() => setZoom(1)}>
            <LocateFixed size={15} />
          </button>
          <button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(2, value + 0.2))}>
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div className="map-scroll">
        <svg
          className="game-map"
          style={{ width: `${zoom * 100}%` }}
          viewBox="0 0 1660 1260"
          role="img"
          aria-label="A stylized map with 199 numbered stations"
        >
          <defs>
            <pattern id="city-grid" width="42" height="42" patternUnits="userSpaceOnUse">
              <path d="M 42 0 L 0 0 0 42" fill="none" stroke="rgba(255,255,255,.025)" strokeWidth="1" />
            </pattern>
            <filter id="piece-shadow" x="-80%" y="-80%" width="260%" height="260%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity=".5" />
            </filter>
          </defs>

          <rect width="1660" height="1260" rx="28" className="map-ground" />
          <rect width="1660" height="1260" rx="28" fill="url(#city-grid)" />
          <g className="borough-shapes" aria-hidden="true">
            <path d="M90 72 510 42 622 270 408 428 74 352Z" />
            <path d="M650 40 1120 50 1242 284 982 410 638 290Z" />
            <path d="M1248 70 1584 64 1588 462 1324 438 1198 286Z" />
            <path d="M80 430 442 402 690 618 518 858 92 794Z" />
            <path d="M748 414 1192 390 1402 654 1198 862 702 794 602 602Z" />
            <path d="M104 874 552 838 782 1192 70 1202Z" />
            <path d="M850 886 1570 724 1590 1200 808 1204Z" />
          </g>
          <path
            className="thames-shadow"
            d="M-20 720 C230 620 354 724 520 730 C708 737 780 626 938 650 C1120 679 1167 840 1348 820 C1492 805 1570 722 1690 756"
          />
          <path
            className="thames"
            d="M-20 720 C230 620 354 724 520 730 C708 737 780 626 938 650 C1120 679 1167 840 1348 820 C1492 805 1570 722 1690 756"
          />
          <text x="62" y="692" className="river-label">THE THAMES</text>

          <g className="route-layer" aria-hidden="true">
            {edges.map((edge) => {
              const from = STATION_BY_ID.get(edge.from)
              const to = STATION_BY_ID.get(edge.to)
              if (!from || !to) return null
              return (
                <line
                  key={`${edge.from}-${edge.to}-${edge.transport}`}
                  x1={from.x + 30}
                  y1={from.y + 30}
                  x2={to.x + 30}
                  y2={to.y + 30}
                  className={`route ${edge.transport}`}
                />
              )
            })}
          </g>

          <g className="candidate-layer" aria-hidden="true">
            {deductionVisible &&
              STATIONS.filter((station) => candidates.has(station.id)).map((station) => (
                <circle
                  key={`candidate-${station.id}`}
                  cx={station.x + 30}
                  cy={station.y + 30}
                  r="17"
                  className="candidate-halo"
                />
              ))}
          </g>

          <g className="station-layer">
            {STATIONS.map((station) => {
              const isLegal = legal.has(station.id)
              const isSelected = selectedStation === station.id
              const isReplay = replayStation === station.id
              const classNames = [
                'station',
                station.transports.includes('underground') ? 'station-underground' : '',
                station.transports.includes('bus') ? 'station-bus' : '',
                isLegal ? 'is-legal' : '',
                isSelected ? 'is-selected' : '',
                isReplay ? 'is-replay' : '',
              ].filter(Boolean).join(' ')
              return (
                <g
                  key={station.id}
                  className={classNames}
                  transform={`translate(${station.x + 30} ${station.y + 30})`}
                  role={isLegal ? 'button' : undefined}
                  tabIndex={isLegal ? 0 : undefined}
                  aria-label={isLegal ? `Move to station ${station.id}` : undefined}
                  onClick={() => isLegal && onSelectStation(station.id)}
                  onKeyDown={(event) => {
                    if (isLegal && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault()
                      onSelectStation(station.id)
                    }
                  }}
                >
                  <title>
                    Station {station.id} · {station.transports.join(', ')}
                  </title>
                  <circle r="10.5" className="station-outer" />
                  <circle r="7.2" className="station-inner" />
                  <text y="3.25">{station.id}</text>
                </g>
              )
            })}
          </g>

          <g className="piece-layer" filter="url(#piece-shadow)" aria-hidden="true">
            {state.detectives.map((detective) => {
              const station = STATION_BY_ID.get(detective.position)
              if (!station) return null
              return (
                <g
                  className={`detective-piece ${detective.id === state.humanDetectiveId && state.role === 'detective' ? 'human-piece' : ''}`}
                  key={detective.id}
                  transform={`translate(${station.x + 30} ${station.y + 9})`}
                >
                  <path d="M-10-9 10-9 13 2 0 14-13 2Z" fill={detective.color} />
                  <circle cy="-2" r="4" fill="#fff9e8" />
                  <text y="1.5">{detective.id.slice(1)}</text>
                </g>
              )
            })}
            {visibleFugitive && (() => {
              const station = STATION_BY_ID.get(state.fugitive.position)
              if (!station) return null
              return (
                <g className="fugitive-piece" transform={`translate(${station.x + 30} ${station.y + 52})`}>
                  <circle r="14" />
                  <path d="M-8 1 0-9 8 1 0 10Z" />
                  <text y="4">X</text>
                </g>
              )
            })()}
          </g>
        </svg>
      </div>
      <div className="map-footnote">
        <span>{STATIONS.length} stations</span>
        <span>•</span>
        <span>{EDGES.length} routes</span>
        {deductionVisible && <span className="candidate-count">{candidateStations.length} possible hideouts</span>}
      </div>
    </section>
  )
}
