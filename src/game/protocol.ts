import {
  validate,
  Literal,
  Union,
  Intersection,
  StructureType,
} from '../structure'
import { DieRoll } from './dice'

export type CardFacing = 'face-up' | 'face-down'

const dieRoll = Union(
  Literal('success'),
  Literal('investigation'),
  Literal('failure'),
)
export const isDieRoll: (value: unknown) => value is DieRoll = validate(dieRoll)

const ChatAction = {
  type: Literal('chat'),
  text: String,
}
export type ChatAction = StructureType<typeof ChatAction>

const DiceAction = {
  type: Literal('dice'),
  dice: Array(dieRoll),
}
export type DiceAction = StructureType<typeof DiceAction>

const SetConditionAction = {
  type: Literal('set-condition'),
  character: String,
  condition: String,
}
export type SetConditionAction = StructureType<typeof SetConditionAction>

const RemoveConditionAction = {
  type: Literal('remove-condition'),
  character: String,
  card: String,
}
export type RemoveConditionAction = StructureType<typeof RemoveConditionAction>

const DrawCardAction = {
  type: Literal('draw-card'),
  card: String,
  character: String,
}
export type DrawCardAction = StructureType<typeof DrawCardAction>

const Facing = Union(Literal('face-up'), Literal('face-down'))
export type Facing = StructureType<typeof Facing>

const FlipCardAction = {
  type: Literal('card-flip'),
  card: String,
  facing: Facing,
}
export type FlipCardAction = StructureType<typeof FlipCardAction>

const DropCardAction = {
  type: Literal('drop-card'),
  card: String,
}
export type DropCardAction = StructureType<typeof DropCardAction>

const DiscardCardAction = {
  type: Literal('discard-card'),
  card: String,
}
export type DiscardCardAction = StructureType<typeof DiscardCardAction>

const PlayerAction = Union(
  ChatAction,
  DiceAction,
  DrawCardAction,
  SetConditionAction,
  RemoveConditionAction,
  FlipCardAction,
  DropCardAction,
  DiscardCardAction,
)

export type PlayerAction = StructureType<typeof PlayerAction>
export const isPlayerAction = validate(PlayerAction)

const PlayerEvent = {
  gameId: String,
  eventId: Number,
  playerId: String,
  epoch: Number,
}
type PlayerEvent = StructureType<typeof PlayerEvent>

const isPlayerEvent = validate(PlayerEvent)

const GameEvent = Intersection(PlayerEvent, PlayerAction)

export type GameEvent = StructureType<typeof GameEvent>
export function isGameEvent(value: unknown): value is GameEvent {
  return isPlayerAction(value) && isPlayerEvent(value)
}

const PlayerActionMessage = {
  type: Literal('player-action'),
  action: PlayerAction,
}
type PlayerActionMessage = StructureType<typeof PlayerActionMessage>

const ClientMessage = Union(PlayerActionMessage)
export type ClientMessage = StructureType<typeof ClientMessage>
export const isClientMessage = validate(ClientMessage)

const GameEventMessage = {
  type: Literal('game-event'),
  event: GameEvent,
}
export type GameEventMessage = StructureType<typeof GameEventMessage>

const ServerMessage = Union(GameEventMessage)
export type ServerMessage = StructureType<typeof ServerMessage>
export const isServerMessage = validate(ServerMessage)
