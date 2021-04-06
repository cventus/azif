import { validate, Literal, Union, StructureType, Tuple } from '../structure'
import {
  ChatAction,
  DiscardCardAction,
  DrawCardAction,
  DropCardAction,
  FlipCardAction,
  RemoveConditionAction,
  SetConditionAction,
  SwitchCharacterAction,
  TradeCardAction,
} from './actions'
import { DieRoll } from './dice'
import { SessionState, ContentSet, GameEvent, GameState, ContentSetPreview } from './resources'

const PlayerDiceAction = {
  type: Literal('dice'),
  roll: Array(Union(DieRoll, Literal(null))),
}
export type PlayerDiceAction = StructureType<typeof PlayerDiceAction>

const PlayerAction = Union(
  ChatAction,
  PlayerDiceAction,
  SwitchCharacterAction,
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

const ClientLoginRequest = {
  type: Literal('login'),
  username: String,
  password: String,
}
export type ClientLoginRequest = StructureType<typeof ClientLoginRequest>

const ClientLogoutRequest = {
  type: Literal('logout'),
}
export type ClientLogoutMessage = StructureType<typeof ClientLogoutRequest>

const ClientCreateGameRequest = {
  type: Literal('create-game'),
  name: String,
  contentSets: Array(String),
}
export type ClientCreateGameRequest = StructureType<typeof ClientCreateGameRequest>

const ClientJoinGameRequest = {
  type: Literal('join-game'),
  gameId: String,
}
export type ClientJoinGameRequest = StructureType<typeof ClientJoinGameRequest>

const ClientLeaveGameRequest = {
  type: Literal('leave-game'),
  gameId: String,
}
export type ClientLeaveGameRequest = StructureType<typeof ClientLeaveGameRequest>

const ClientSubscribeToGameRequest = {
  type: Literal('subscribe-to-game'),
  gameId: Union(String, Literal(null)),
}
export type ClientSubscribeToGameRequest = StructureType<typeof ClientSubscribeToGameRequest>

const ClientActionRequest = {
  type: Literal('action'),
  action: PlayerAction,
}
export type ClientActionRequest = StructureType<typeof ClientActionRequest>

const ClientGetRequest = {
  type: Literal('get'),
  resource: ResourceId,
}
export type ClientGetRequest = StructureType<typeof ClientGetRequest>

const ClientSetUsernameRequest = {
  type: Literal('set-username'),
  newUsername: String,
  currentPassword: String,
}
export type ClientSetUsernameRequest = StructureType<typeof ClientSetUsernameRequest>

const ClientSetPasswordRequest = {
  type: Literal('set-password'),
  currentPassword: String,
  newPassword: String,
}
export type ClientSetPasswordRequest = StructureType<typeof ClientSetPasswordRequest>

const ClientSetNameRequest = {
  type: Literal('set-name'),
  currentPassword: String,
  newName: String,
}
export type ClientSetNameRequest = StructureType<typeof ClientSetNameRequest>

export const ClientRequest = Union(
  ClientSetUsernameRequest,
  ClientSetPasswordRequest,
  ClientSetNameRequest,
  ClientLoginRequest,
  ClientLogoutRequest,
  ClientCreateGameRequest,
  ClientJoinGameRequest,
  ClientLeaveGameRequest,
  ClientSubscribeToGameRequest,
  ClientActionRequest,
  ClientGetRequest,
)
export type ClientRequest = StructureType<typeof ClientRequest>
export const isClientRequest = validate(ClientRequest)

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

const ServerGameUpdateResponse = {
  type: Literal('game-update'),
  requestId: String,
  game: GameState,
}
export type ServerGameUpdateResponse = StructureType<typeof ServerGameUpdateResponse>

const ServerGetGameResponse = {
  type: Literal('get'),
  resource: Tuple(Literal('games'), String),
  requestId: String,
  game: GameState,
}

const ServerGetSessionResponse = {
  type: Literal('get'),
  resource: Tuple(Literal('session')),
  requestId: String,
  session: SessionState,
}
export type ServerGetSessionResponse = StructureType<typeof ServerGetSessionResponse>

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
  ServerGameUpdateResponse,
  ServerGetGameResponse,
  ServerGetSessionResponse,
  ServerGetContentResponse,
  ServerGetContentListResponse,
)
export type ServerResponse = StructureType<typeof ServerResponse>
export const isServerResponse = validate(ServerResponse)

const ServerMessage = Union(
  ServerResponse,
  ServerGameNotification,
)
export type ServerMessage = StructureType<typeof ServerMessage>
export const isServerMessage = validate(ServerMessage)
