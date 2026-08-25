export type Transport = 'taxi' | 'bus' | 'underground' | 'water'
export type TravelTicket = Exclude<Transport, 'water'> | 'black'
export type HumanRole = 'fugitive' | 'detective'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type GamePhase = 'fugitive' | 'fugitive-bot' | 'detectives' | 'complete'

export interface Station {
  id: number
  x: number
  y: number
  transports: Exclude<Transport, 'water'>[]
}

export interface Edge {
  from: number
  to: number
  transport: Transport
}

export interface DetectiveTickets {
  taxi: number
  bus: number
  underground: number
}

export interface Detective {
  id: string
  name: string
  color: string
  position: number
  tickets: DetectiveTickets
}

export interface Fugitive {
  position: number
  blackTickets: number
  doubleTickets: number
}

export interface TravelEntry {
  slot: number
  ticket: TravelTicket
  transport: Transport
  destination: number
  revealed: boolean
  blockedStations: number[]
}

export type GameEventKind =
  | 'game-started'
  | 'fugitive-moved'
  | 'detective-moved'
  | 'detective-stranded'
  | 'fugitive-revealed'
  | 'game-ended'

export interface GameEvent {
  id: number
  kind: GameEventKind
  actor: string
  from?: number
  to?: number
  ticket?: TravelTicket
  slot?: number
  note: string
}

export interface GameResult {
  winner: 'fugitive' | 'detectives'
  reason: 'captured' | 'escaped' | 'fugitive-blocked' | 'detectives-stranded' | 'resigned'
  message: string
}

export interface GameState {
  schemaVersion: 1
  rulesVersion: 'london-pursuit-2023'
  seed: number
  role: HumanRole
  difficulty: Difficulty
  phase: GamePhase
  fugitive: Fugitive
  detectives: Detective[]
  humanDetectiveId: 'd1'
  travelLog: TravelEntry[]
  fugitiveVisible: boolean
  detectiveCursor: number
  doubleMoveActive: boolean
  result: GameResult | null
  events: GameEvent[]
  createdAt: string
}

export interface FugitiveMove {
  to: number
  transport: Transport
  ticket: TravelTicket
}

export interface DetectiveMove {
  detectiveId: string
  to: number
  transport: Exclude<Transport, 'water'>
}

export interface DetectiveView {
  seed: number
  difficulty: Difficulty
  detective: Detective
  detectives: Detective[]
  travelLog: Array<
    Omit<TravelEntry, 'destination' | 'transport'> & {
      destination?: number
      transport?: Transport
    }
  >
  candidateStations: number[]
  slot: number
}

export interface NewGameOptions {
  role: HumanRole
  difficulty: Difficulty
  seed?: number
}
