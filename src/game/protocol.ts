import { validate, Literal, Union, StructureType } from '../structure'
import {
  ChatAction,
  DiscardCardAction,
  DrawCardAction,
  DropCardAction,
  FlipCardAction,
  RemoveConditionAction,
  SetConditionAction,
  TradeCardAction,
} from './actions'
import { DieRoll } from './dice'
import { ConnectionState, ContentSet, GameEvent, GameState } from './resources'

const DicePlayerAction = {
  type: Literal('dice'),
  roll: Array(Union(DieRoll, Literal(null))),
}
export type DicePlayerAction = StructureType<typeof DicePlayerAction>

const PlayerAction = Union(
  ChatAction,
  DicePlayerAction,
  DrawCardAction,
  SetConditionAction,
  RemoveConditionAction,
  FlipCardAction,
  TradeCardAction,
  DropCardAction,
  DiscardCardAction,
)
export type PlayerAction = StructureType<typeof PlayerAction>

const ResourceType = Union(
  Literal('game'),
  Literal('connection'),
  Literal('content'),
)

const PlayerLoginRequest = {
  type: Literal('login'),
  requestId: String,
  username: String,
  password: String,
}
export type PlayerLoginRequest = StructureType<typeof PlayerLoginRequest>

const PlayerLogoutRequest = {
  type: Literal('logout'),
  requestId: String,
}
export type PlayerLogoutMessage = StructureType<typeof PlayerLogoutRequest>

const PlayerActionRequest = {
  type: Literal('action'),
  requestId: String,
  action: PlayerAction,
}
export type PlayerActionRequest = StructureType<typeof PlayerActionRequest>

const PlayerGetRequest = {
  type: Literal('get'),
  resource: ResourceType,
  requestId: String,
  resourceId: String,
}
export type PlayerGetRequest = StructureType<typeof PlayerGetRequest>

const ClientMessage = Union(
  PlayerLoginRequest,
  PlayerLogoutRequest,
  PlayerActionRequest,
  PlayerGetRequest,
)
export type ClientMessage = StructureType<typeof ClientMessage>
export const isClientMessage = validate(ClientMessage)

const ClientMessageType = Union(...ClientMessage.structures.map((x) => x.type))

const GameEventMessage = {
  type: Literal('server-game-event'),
  event: GameEvent,
}
export type GameEventMessage = StructureType<typeof GameEventMessage>

const ServerSuccessResponse = {
  type: Literal('success'),
  requestId: String,
}
export type ServerSuccessResponse = StructureType<typeof ServerSuccessResponse>

const ServerFailureResponse = {
  type: Literal('failure'),
  requestId: String,
  message: String,
}
export type ServerFailureResponse = StructureType<typeof ServerFailureResponse>

const ServerGetGameResponse = {
  type: Literal('get'),
  resource: Literal('game'),
  requestId: String,
  resourceId: String,
  game: GameState,
}

const ServerGetProfileResponse = {
  type: Literal('get'),
  resource: Literal('connection'),
  requestId: String,
  resourceId: String,
  connection: ConnectionState,
}

const ServerGetContentResponse = {
  type: Literal('get'),
  resource: Literal('content'),
  requestId: String,
  resourceId: String,
  content: ContentSet,
}

const ServerMessage = Union(
  ServerSuccessResponse,
  ServerFailureResponse,
  GameEventMessage,
  ServerGetGameResponse,
  ServerGetProfileResponse,
  ServerGetContentResponse,
)
export type ServerMessage = StructureType<typeof ServerMessage>
export const isServerMessage = validate(ServerMessage)
