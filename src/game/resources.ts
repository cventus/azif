import {
  validate,
  Literal,
  Union,
  StructureType,
  Dictionary,
  Optional,
} from '../structure'
import { GameAction } from './actions'
import { Card } from './rules'

const EpochMs = Number

export const ContentSetPreview = {
  id: String,
  name: String,
  description: Array(String),
}
export type ContentSetPreview = StructureType<typeof ContentSetPreview>

export const ContentSet = {
  ...ContentSetPreview,
  cards: Dictionary(Card),
}
export type ContentSet = StructureType<typeof ContentSet>
export const isContentSet = validate(ContentSet)

export const GameEvent = {
  gameId: String,
  clock: Number,
  playerId: String,
  epoch: EpochMs,
  action: GameAction,
}
export type GameEvent = StructureType<typeof GameEvent>
export const isGameEvent = validate(GameEvent)

export const PlayerState = {
  name: String,
  characterId: Optional(String),
}
export type PlayerState = StructureType<typeof PlayerState>

export const CharacterState = {
  cardIds: Array(String),
  conditions: Array(String),
  clues: Number,
}
export type CharacterState = StructureType<typeof CharacterState>

export const GamePhase = Union(
  Literal('starting'),
  Literal('ongoing'),
  Literal('over'),
)
export type GamePhase = StructureType<typeof GamePhase>

export const GameState = {
  id: String,
  clock: Number,
  name: String,
  phase: GamePhase,
  createdAt: Number,
  contentSetIds: Array(String),
  players: Dictionary(PlayerState),
  characters: Dictionary(CharacterState),
  flippedCardIds: Array(String),
}
export type GameState = StructureType<typeof GameState>

export const SessionState = {
  name: String,
  username: String,
  gameIds: Array(String),
  currentGameId: Union(String, Literal(null)),
  recentGame: Optional({
    id: String,
    timestamp: EpochMs,
  }),
}
export type SessionState = StructureType<typeof SessionState>
