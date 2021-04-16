import {
  ClientRequest,
  ServerGameNotification,
  isClientRequest,
  ServerMessage,
  ServerLoginResponse,
  ServerResponse,
  ServerFailureResponse,
  ServerSuccessResponse,
} from '../../game/protocol'
import { inject } from '../../inject'
import { validate } from '../../structure'

import { SessionsService, SocketSession } from '../sessions/SessionsService'
import { GameActionsHandler } from '../games/GameActionsHandler'
import {
  GamesService,
  makeGameState,
  PartialGameState,
} from '../games/GamesService'
import { LoggerService } from '../logger/LoggerService'
import { SocketsService } from '../sockets/SocketsService'
import { User } from '../users'
import { UsersService } from '../users/UsersService'
import { ContentSet, GameState } from '../../game/resources'
import { ContentService } from '../content/ContentService'
import { EventsService } from '../events/EventsService'

interface SocketConnectEvent {
  type: 'connect'
  socketId: string
}

interface SocketMessageEvent {
  type: 'message'
  socketId: string
  json: unknown
}

interface SocketDisconnectEvent {
  type: 'disconnect'
  socketId: string
}

type InputEvent =
  | SocketConnectEvent
  | SocketMessageEvent
  | SocketDisconnectEvent

type GameHandler = (event: InputEvent) => Promise<void>

const hasRequestId = validate({ requestId: String })

export const GameHandler = inject(
  {
    LoggerService,
    SessionsService,
    UsersService,
    SocketsService,
    GameActionsHandler,
    GamesService,
    EventsService,
    ContentService,
  },
  ({
    LoggerService,
    SessionsService: sessions,
    UsersService: users,
    SocketsService: sockets,
    GameActionsHandler: handleAction,
    GamesService: games,
    EventsService: events,
    ContentService: contents,
  }): GameHandler => {
    const logger = LoggerService.create('GameHandler')

    const send = async (socketId: string, response: ServerMessage) => {
      await sockets.send(socketId, response)
    }

    const failure = (
      message: { requestId: string },
      reason: string,
    ): ServerFailureResponse => {
      return {
        type: 'failure',
        requestId: message.requestId,
        message: reason,
      }
    }

    const success = (message: { requestId: string }): ServerSuccessResponse => {
      return { type: 'success', requestId: message.requestId }
    }

    const makeGame = async (game: PartialGameState): Promise<GameState> => {
      const playerNames = await Promise.all(
        Object.keys(game.players).map((userId) => users.get(userId)),
      )
      return makeGameState(
        game,
        playerNames.filter((x): x is User => Boolean(x)),
      )
    }

    const broadcastGameEvent = async (
      notification: ServerGameNotification,
    ): Promise<void> => {
      const playerSessions = await sessions.getGameSessions(
        notification.game.id,
      )
      const socketIds = playerSessions.map(({ socketId }) => socketId)
      await Promise.all(
        socketIds.map((socketId) => send(socketId, notification)),
      )
    }

    const onClientMessage = async (
      socketId: string,
      message: ClientRequest & { requestId: string },
      session: SocketSession,
    ): Promise<ServerResponse | [ServerResponse, ServerGameNotification]> => {
      switch (message.type) {
        case 'login': {
          // Forbidden, must disconnect first
          return failure(message, 'already-authenticated')
        }

        case 'logout': {
          await sessions.removeSession(socketId)
          return success(message)
        }

        case 'set-name': {
          const user = await users.get(session.userId)
          if (!user) {
            logger.error(
              { userId: session.userId },
              'Authenticated user not found',
            )
            return failure(message, 'system-inconsistency')
          }
          if (
            !(await users.authenticate(user.username, message.currentPassword))
          ) {
            return failure(message, 'bad-auth')
          }
          await users.setName(session.userId, message.newName)
          return success(message)
        }

        case 'set-password': {
          const user = await users.get(session.userId)
          if (!user) {
            logger.error(
              { userId: session.userId },
              'Authenticated user not found',
            )
            return failure(message, 'system-inconsistency')
          }
          if (
            !(await users.authenticate(user.username, message.currentPassword))
          ) {
            return failure(message, 'bad-auth')
          }
          await users.setPassword(session.userId, message.newPassword)
          return success(message)
        }

        case 'set-username': {
          const user = await users.get(session.userId)
          if (!user) {
            logger.error(
              { userId: session.userId },
              'Authenticated user not found',
            )
            return failure(message, 'system-inconsistency')
          }
          if (
            !(await users.authenticate(user.username, message.currentPassword))
          ) {
            return failure(message, 'bad-auth')
          }
          await users.setUsername(session.userId, message.newUsername)
          return success(message)
        }

        case 'create-game': {
          const { name, contentSets } = message
          const newGame = await games.createGame(name, contentSets)
          const game = await games.addPlayer(newGame.id, session.userId)
          if (game === 'failure') {
            return failure(message, 'sorry')
          }
          return {
            type: 'create-game',
            requestId: message.requestId,
            game: await makeGame(game),
          }
        }

        case 'join-game': {
          const { gameId } = message
          const user = await users.get(session.userId)

          if (!user) {
            logger.error(
              { userId: session.userId },
              'Authenticated user not found',
            )
            return failure(message, 'system-inconsistency')
          }

          const result = await games.addPlayer(gameId, session.userId)
          if (result === 'failure') {
            return failure(message, 'unable-to-add-player')
          }

          return [
            success(message),
            {
              type: 'game-event',
              event: {
                gameId: result.id,
                clock: result.clock,
                playerId: session.userId,
                epoch: new Date().valueOf(),
                action: {
                  type: 'add-player',
                  playerId: session.userId,
                  playerName: user?.name || 'Someone',
                },
              },
              game: await makeGame(result),
            },
          ]
        }

        case 'subscribe-to-game': {
          const { gameId } = message

          if (gameId === session.gameId) {
            return success(message)
          }

          const user = await users.get(session.userId)

          if (!user) {
            logger.error(
              { userId: session.userId },
              'Authenticated user not found',
            )
            return failure(message, 'system-inconsistency')
          }
          if (gameId && !user.gameIds.includes(gameId)) {
            return failure(message, 'members-only')
          }

          await sessions.subscribeToGame(socketId, gameId)
          return success(message)
        }

        case 'leave-game': {
          const { gameId } = message
          const user = await users.get(session.userId)
          if (!user) {
            logger.error(
              { userId: session.userId },
              'Authenticated user not found',
            )
            return failure(message, 'system-inconsistency')
          }
          if (!user.gameIds.includes(gameId)) {
            return failure(message, 'members-only')
          }
          const result = await games.removePlayer(gameId, session.userId)
          if (result === 'failure') {
            return failure(message, 'sorry')
          }
          if (session.gameId === gameId) {
            await sessions.subscribeToGame(socketId, null)
          }

          return [
            success(message),
            {
              type: 'game-event',
              event: {
                gameId: result.id,
                clock: result.clock,
                playerId: session.userId,
                epoch: new Date().valueOf(),
                action: {
                  type: 'remove-player',
                  playerId: session.userId,
                  playerName: user?.name || 'Someone',
                },
              },
              game: await makeGame(result),
            },
          ]
        }

        case 'get': {
          const { requestId } = message
          switch (message.resource) {
            case 'session': {
              const user = await users.get(session.userId)

              if (!user) {
                logger.error(
                  { userId: session.userId },
                  'Authenticated user not found',
                )
                return failure(message, 'system-inconsistency')
              }

              return {
                type: 'get',
                resource: message.resource,
                requestId,
                session: {
                  currentGameId: session.gameId,
                  ...user,
                },
              }
            }

            case 'content-list': {
              const list = await contents.list()
              return {
                type: 'get',
                resource: message.resource,
                requestId,
                list,
              }
            }

            case 'content-set': {
              const content: ContentSet | undefined = await contents.get(
                message.contentSetId,
              )
              if (!content) {
                return failure(message, 'not-found')
              }
              return {
                type: 'get',
                resource: message.resource,
                requestId,
                content,
              }
            }

            case 'game': {
              const user = await users.get(session.userId)

              if (!user) {
                logger.error(
                  { userId: session.userId },
                  'Authenticated user not found',
                )
                return failure(message, 'system-inconsistency')
              }
              const { gameId } = message

              if (!user.gameIds.includes(gameId)) {
                return failure(message, 'not-found')
              }

              const partialGame = await games.getGame(gameId)
              if (!partialGame) {
                return failure(message, 'not-found')
              }
              const game = await makeGame(partialGame)

              return {
                type: 'get',
                resource: message.resource,
                requestId: message.requestId,
                game,
              }
            }

            case 'events': {
              const user = await users.get(session.userId)

              if (!user) {
                logger.error(
                  { userId: session.userId },
                  'Authenticated user not found',
                )
                return failure(message, 'system-inconsistency')
              }
              const { gameId, since, until } = message

              if (!user.gameIds.includes(gameId)) {
                return failure(message, 'not-found')
              }

              const eventList = await events.list(gameId, { since, until })
              return {
                type: 'get',
                resource: 'events',
                requestId: message.requestId,
                gameId,
                events: eventList,
              }
            }

            default:
              return failure(message, 'bad-request')
          }
        }

        case 'action': {
          const gameId = session.gameId
          if (!gameId) {
            return failure(message, 'no-game')
          }
          const result = await handleAction(
            session.userId,
            gameId,
            message.action,
          )
          if (result.type === 'failure') {
            return failure(message, 'conflict')
          }
          return [
            {
              type: 'game-update',
              game: await makeGame(result.state),
              requestId: message.requestId,
            },
            {
              type: 'game-event',
              event: result.event,
              game: await makeGame(result.state),
            },
          ]
        }
      }
    }

    return LoggerService.traceFunction<GameHandler>(logger, async (event) => {
      const { socketId } = event
      switch (event.type) {
        case 'connect':
          logger.info({ socketId }, 'player connected')
          break

        case 'disconnect': {
          logger.info({ socketId }, 'player disconnected')
          await sessions.removeSession(socketId)
          break
        }

        case 'message': {
          const message = event.json
          const session = await sessions.getSession(event.socketId)
          if (!hasRequestId(message)) {
            // Request doesn't even follow basic protocol, terminate it.
            logger.error(
              { socketId },
              'unknown client message, terminating connection',
            )
            sockets.disconnect(socketId)
            return
          } else if (!isClientRequest(message)) {
            // Return a generic failure caused by request
            logger.error({ socketId, message }, 'bad request')
            send(socketId, failure(message, 'bad-request'))
            return
          } else if (!session) {
            // User has not authenticated yet
            if (message.type !== 'login') {
              // No other message is allowed yet
              return send(socketId, failure(message, 'unauthenticated'))
            }

            // Authenticate user
            const { username, password } = message
            const user = await users.authenticate(username, password)
            if (!user) {
              // No other message is allowed
              return send(socketId, failure(message, 'bad-auth'))
            }

            // Associate socket with user
            const newSession = await sessions.createSession(socketId, user.id)
            await send(socketId, {
              type: 'login',
              requestId: message.requestId,
              session: {
                name: user.name,
                currentGameId: null,
                gameIds: user.gameIds,
                username,
                ...(user.recentGame && {
                  gameId: user.recentGame.id,
                  timestamp: user.recentGame.timestamp.valueOf(),
                }),
              },
            } as ServerLoginResponse)
            logger.debug({ session: newSession }, 'Created session')
          } else {
            try {
              // User is authenticated, handle message
              const result = await onClientMessage(socketId, message, session)
              if (Array.isArray(result)) {
                const [response, event] = result
                await Promise.all([
                  send(socketId, response),
                  broadcastGameEvent(event),
                ])
              } else {
                await send(socketId, result)
              }
            } catch (err) {
              logger.error({ err, message, socketId }, 'onClientMessage error')
              send(socketId, failure(message, 'error'))
            }
          }
          break
        }
      }
    })
  },
)
