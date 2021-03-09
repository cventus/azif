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

export const ContentSet = {
  id: String,
  cards: Dictionary(Card),
}
export type ContentSet = StructureType<typeof ContentSet>

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

export const ConnectionState = {
  id: String,
  name: String,
  username: String,
  gameIds: Array(String),
  currentGameId: String,
  recent: Optional({
    gameId: String,
    timestamp: EpochMs,
  }),
}
export type ConnectionState = StructureType<typeof ConnectionState>
