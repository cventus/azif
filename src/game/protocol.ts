import { validate, Literal, Union, StructureType, Tuple } from '../structure'
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
import { SessionState, ContentSet, GameEvent, GameState, ContentSetPreview } from './resources'

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

const ResourceId = Union(
  Tuple(Literal('session')),
  Tuple(Literal('games'), String),
  Tuple(Literal('contents'), String),
  Tuple(Literal('contents')),
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

const PlayerCreateGameRequest = {
  type: Literal('create-game'),
  requestId: String,
  name: String,
  contentSets: Array(String),
}
export type PlayerCreateGameRequest = StructureType<typeof PlayerCreateGameRequest>

const PlayerJoinGameRequest = {
  type: Literal('join-game'),
  requestId: String,
  gameId: String,
}
export type PlayerJoinGameRequest = StructureType<typeof PlayerJoinGameRequest>

const PlayerLeaveGameRequest = {
  type: Literal('leave-game'),
  requestId: String,
  gameId: String,
}
export type PlayerLeaveGameRequest = StructureType<typeof PlayerLeaveGameRequest>

const PlayerSubscribeToGameRequest = {
  type: Literal('subscribe-to-game'),
  requestId: String,
  gameId: String,
}
export type PlayerSubscribeToGameRequest = StructureType<typeof PlayerSubscribeToGameRequest>

const PlayerActionRequest = {
  type: Literal('action'),
  requestId: String,
  action: PlayerAction,
}
export type PlayerActionRequest = StructureType<typeof PlayerActionRequest>

const PlayerGetRequest = {
  type: Literal('get'),
  resource: ResourceId,
  requestId: String,
}
export type PlayerGetRequest = StructureType<typeof PlayerGetRequest>

const ClientMessage = Union(
  PlayerLoginRequest,
  PlayerLogoutRequest,
  PlayerCreateGameRequest,
  PlayerJoinGameRequest,
  PlayerLeaveGameRequest,
  PlayerSubscribeToGameRequest,
  PlayerActionRequest,
  PlayerGetRequest,
)
export type ClientMessage = StructureType<typeof ClientMessage>
export const isClientMessage = validate(ClientMessage)

export const ServerGameNotification = {
  type: Literal('game-event'),
  event: GameEvent,
  game: GameState,
}
export type ServerGameNotification = StructureType<
  typeof ServerGameNotification
>
export const isServerGameNotification = validate(ServerGameNotification)

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

const ServerLoginResponse = {
  type: Literal('login'),
  requestId: String,
  session: SessionState,
}
export type ServerLoginResponse = StructureType<typeof ServerLoginResponse>
export const isServerLoginResponse = validate(ServerLoginResponse)

const ServerCreateGameResponse = {
  type: Literal('create-game'),
  requestId: String,
  game: GameState,
}
export type ServerCreateGameResponse = StructureType<typeof ServerCreateGameResponse>

const ServerGetGameResponse = {
  type: Literal('get'),
  resource: Tuple(Literal('games'), String),
  requestId: String,
  game: GameState,
}

const ServerGetProfileResponse = {
  type: Literal('get'),
  resource: Tuple(Literal('session')),
  requestId: String,
  session: SessionState,
}

const ServerGetContentResponse = {
  type: Literal('get'),
  resource: Tuple(Literal('contents'), String),
  requestId: String,
  content: ContentSet,
}

const ServerGetContentListResponse = {
  type: Literal('get'),
  resource: Tuple(Literal('contents')),
  requestId: String,
  list: Array(ContentSetPreview),
}
export type ServerGetContentListResponse = StructureType<typeof ServerGetContentListResponse>

const ServerResponse = Union(
  ServerSuccessResponse,
  ServerFailureResponse,
  ServerLoginResponse,
  ServerCreateGameResponse,
  ServerGetGameResponse,
  ServerGetProfileResponse,
  ServerGetContentResponse,
  ServerGetContentListResponse,
)
export type ServerResponse = StructureType<typeof ServerMessage>
export const isServerResponse = validate(ServerResponse)

const ServerMessage = Union(
  ServerResponse,
  ServerGameNotification,
)
export type ServerMessage = StructureType<typeof ServerMessage>
export const isServerMessage = validate(ServerMessage)
