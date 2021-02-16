import {
  validate,
  Literal,
  Union,
  Intersection,
  StructureType,
} from '../structure'
import { DieRoll } from './dice'

const EpochMs = Number

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
  epoch: EpochMs,
}
type PlayerEvent = StructureType<typeof PlayerEvent>

const GameEvent = Intersection(PlayerEvent, PlayerAction)

export type GameEvent = StructureType<typeof GameEvent>
export const isGameEvent = validate(GameEvent)

const ResourceType = Union(
  Literal('game'),
  Literal('profile'),
  Literal('content'),
)

const Profile = {
  id: String,
  name: String,
  gameIds: Array(String),
  recentGameId: String,
  recentGameTime: EpochMs,
}
export type Profile = StructureType<typeof Profile>

const GameState = Union(
  Literal('starting'),
  Literal('on-going'),
  Literal('over'),
)

const Player = {
  id: String,
  name: String,
  characterId: String,
}

const CharacterInventory = {
  characterId: String,
  items: Array(String),
  damages: Array(String),
  horros: Array(String),
  clues: Number,
}

const Game = {
  id: String,
  name: String,
  state: GameState,
  contentSets: Array(String),
  players: Array(Player),
  inventories: Array(CharacterInventory),
  flippedCards: Array(String),
}

const Card = {

}

const Content = {
  id: String,
  cards: Array(Card),
}

const PlayerActionMessage = {
  type: Literal('player-action'),
  action: PlayerAction,
}
type PlayerActionMessage = StructureType<typeof PlayerActionMessage>

const PlayerGetRequest = {
  type: Literal('player-get-request'),
  resource: ResourceType,
  requestId: String,
  resourceId: String,
}
type PlayerGetRequest = StructureType<typeof PlayerActionMessage>

const ClientMessage = Union(
  PlayerActionMessage,
  PlayerGetRequest,
)
export type ClientMessage = StructureType<typeof ClientMessage>
export const isClientMessage = validate(ClientMessage)

const GameEventMessage = {
  type: Literal('server-game-event'),
  event: GameEvent,
}
export type GameEventMessage = StructureType<typeof GameEventMessage>

const ServerGetGameResponse = {
  type: Literal('server-get-response'),
  resource: Literal('game'),
  requestId: String,
  resourceId: String,
  game: Game,
}

const ServerGetProfileResponse = {
  type: Literal('server-get-response'),
  resource: Literal('profile'),
  requestId: String,
  resourceId: String,
  profile: Profile,
}

const ServerGetContentResponse = {
  type: Literal('server-get-response'),
  resource: Literal('content'),
  requestId: String,
  resourceId: String,
  content: Content,
}

const ServerMessage = Union(
  GameEventMessage,
  ServerGetGameResponse,
  ServerGetProfileResponse,
  ServerGetContentResponse,
)
export type ServerMessage = StructureType<typeof ServerMessage>
export const isServerMessage = validate(ServerMessage)
