import { validate, Literal, Union, StructureType } from '../structure'
import { DieRoll } from './dice'

export const Facing = Union(Literal('face-up'), Literal('face-down'))
export type Facing = StructureType<typeof Facing>

export const ChatAction = {
  type: Literal('chat'),
  text: String,
}
export type ChatAction = StructureType<typeof ChatAction>

export const DiceAction = {
  type: Literal('dice'),
  dice: Array(DieRoll),
}
export type DiceAction = StructureType<typeof DiceAction>

export const AddPlayerAction = {
  type: Literal('add-player'),
  playerId: String,
  playerName: String,
}
export type AddPlayerAction = StructureType<typeof AddPlayerAction>

export const RemovePlayerAction = {
  type: Literal('remove-player'),
  playerId: String,
  playerName: String,
}
export type RemovePlayerAction = StructureType<typeof RemovePlayerAction>

export const SwitchCharacterAction = {
  type: Literal('switch-character'),
  playerId: String,
  newCharacter: String,
  oldCharacter: Union(String, Literal(null)),
}
export type SwitchCharacterAction = StructureType<typeof SwitchCharacterAction>

export const SetConditionAction = {
  type: Literal('set-condition'),
  character: String,
  condition: String,
}
export type SetConditionAction = StructureType<typeof SetConditionAction>

export const RemoveConditionAction = {
  type: Literal('remove-condition'),
  character: String,
  condition: String,
}
export type RemoveConditionAction = StructureType<typeof RemoveConditionAction>

export const DrawCardAction = {
  type: Literal('draw-card'),
  card: String,
  character: String,
}
export type DrawCardAction = StructureType<typeof DrawCardAction>

export const FlipCardAction = {
  type: Literal('flip-card'),
  card: String,
  facing: Facing,
}
export type FlipCardAction = StructureType<typeof FlipCardAction>

export const TradeCardAction = {
  type: Literal('trade-card'),
  card: String,
  fromCharacter: String,
  toCharacter: String,
}
export type TradeCardAction = StructureType<typeof TradeCardAction>

export const DropCardAction = {
  type: Literal('drop-card'),
  card: String,
}
export type DropCardAction = StructureType<typeof DropCardAction>

export const DiscardCardAction = {
  type: Literal('discard-card'),
  card: String,
}
export type DiscardCardAction = StructureType<typeof DiscardCardAction>

export const GameAction = Union(
  ChatAction,
  DiceAction,
  AddPlayerAction,
  RemovePlayerAction,
  SwitchCharacterAction,
  DrawCardAction,
  SetConditionAction,
  RemoveConditionAction,
  FlipCardAction,
  TradeCardAction,
  DropCardAction,
  DiscardCardAction,
)

export type GameAction = StructureType<typeof GameAction>
export const isGameAction = validate(GameAction)
