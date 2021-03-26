import {
  ClientMessage,
  ServerGameNotification,
  isClientMessage,
  ServerMessage,
  ServerLoginResponse,
} from '../../game/protocol'
import { inject } from '../../inject'
import { validate } from '../../structure'

import { SessionsService, SocketSession } from '../sessions/SessionsService'
import { GameActionsHandler } from '../games/GameActionsHandler'
import { GamesService, makeGameState, PartialGameState } from '../games/GamesService'
import { LoggerService } from '../logger/LoggerService'
import { SocketsService } from '../sockets/SocketsService'
import { User } from '../users'
import { UsersService } from '../users/UsersService'
import { ContentSet, GameEvent, GameState } from '../../game/resources'
import { ContentService } from '../content/ContentService'

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
    ContentService,
  },
  ({
    LoggerService,
    SessionsService: sessions,
    UsersService: users,
    SocketsService: sockets,
    GameActionsHandler: handleAction,
    GamesService: games,
    ContentService: contents,
  }): GameHandler => {
    const logger = LoggerService.create('GameHandler')

    const send = async (socketId: string, response: ServerMessage) => {
      await sockets.send(socketId, response)
    }

    const sendOk = (socketId: string, message: ClientMessage) => {
      return send(socketId, { type: 'success', requestId: message.requestId })
    }

    const sendFail = (
      socketId: string,
      message: ClientMessage,
      reason: string,
    ) => {
      return send(socketId, {
        type: 'failure',
        requestId: message.requestId,
        message: reason,
      })
    }

    const makeGame = async (game: PartialGameState): Promise<GameState> => {
      const playerSessions = await sessions.getGameSessions(game.id)
      const playerNames = await Promise.all(
        playerSessions.map(({ userId }) => users.get(userId)),
      )
      return makeGameState(
        game,
        playerNames.filter((x): x is User => Boolean(x)),
      )
    }

    const broadcast = async (
      game: PartialGameState,
      event: GameEvent,
    ): Promise<void> => {
      const playerSessions = await sessions.getGameSessions(game.id)
      const gameState = await makeGame(game)
      const notification: ServerGameNotification = {
        type: 'game-event',
        event: event,
        game: gameState,
      }
      const socketIds = playerSessions.map(({ socketId }) => socketId)
      await Promise.all(socketIds.map((socketId) => send(socketId, notification)))
    }

    const onClientMessage = async (
      socketId: string,
      message: ClientMessage,
      session: SocketSession,
    ) => {
      switch (message.type) {
        case 'login': {
          // Forbidden, must disconnect first
          await sendFail(socketId, message, 'already-authenticated')
          break
        }

        case 'logout': {
          await sessions.removeSession(socketId)
          await sendOk(socketId, message)
          break
        }

        case 'create-game': {
          const { name, contentSets } = message
          const newGame = await games.createGame(name, contentSets)
          await games.addPlayer(newGame.id, session.userId)
          await sendOk(socketId, message)
          break;
        }

        case 'join-game': {
          const { gameId } = message
          const user = await users.get(session.userId)

          if (!user) {
            logger.error({ userId: session.userId }, 'Authenticated user not found')
            return sendFail(socketId, message, 'system-inconsistency')
          }

          const result = await games.addPlayer(gameId, session.userId)
          if (result === 'failure') {
            return sendFail(socketId, message, 'too-bad')
          }
          await Promise.all([
            sendOk(socketId, message),
            broadcast(
              result,
              {
                gameId: result.id,
                clock: result.clock,
                playerId: session.userId,
                epoch: new Date().valueOf(),
                action: {
                  type: 'add-player',
                  playerId: session.userId,
                  playerName: user?.name || 'Someone',
                },
            })
          ])
          break
        }

        case 'subscribe-to-game': {
          const { gameId } = message

          if (gameId === session.gameId) {
            return
          }

          const user = await users.get(session.userId)

          if (!user) {
            logger.error({ userId: session.userId }, 'Authenticated user not found')
            return sendFail(socketId, message, 'system-inconsistency')
          }

          if (!user.gameIds.includes(gameId)) {
            return sendFail(socketId, message, 'join-first')
          }

          await sessions.subscribeToGame(socketId, gameId)
          await sendOk(socketId, message)
          break
        }

        case 'leave-game': {
          const { gameId } = message
          const user = await users.get(session.userId)
          if (!user) {
            logger.error({ userId: session.userId }, 'Authenticated user not found')
            return sendFail(socketId, message, 'system-inconsistency')
          }
          if (!user.gameIds.includes(gameId)) {
            return sendFail(socketId, message, 'not-your-game')
          }
          const result = await games.removePlayer(gameId, session.userId)
          if (result === 'failure') {
            return sendFail(socketId, message, 'too-bad')
          }
          if (session.gameId === gameId) {
            await sessions.subscribeToGame(socketId, null)
          }
          await Promise.all([
            sendOk(socketId, message),
            broadcast(
              result,
              {
                gameId: result.id,
                clock: result.clock,
                playerId: session.userId,
                epoch: new Date().valueOf(),
                action: {
                  type: 'remove-player',
                  playerId: session.userId,
                  playerName: user?.name || 'Someone',
                },
            })
          ])
          break
        }

        case 'get': {
          const { requestId, resource } = message
          switch (resource[0]) {
            case 'session': {
              const user = await users.get(session.userId)

              if (!user) {
                logger.error({ userId: session.userId }, 'Authenticated user not found')
                return sendFail(socketId, message, 'system-inconsistency')
              }

              send(socketId, {
                type: 'get',
                resource,
                requestId,
                session: {
                  currentGameId: session.gameId,
                  ...user,
                }
              })
              return
            }

            case 'contents': {
              if (resource.length === 1) {
                const list = await contents.list()
                send(socketId, {
                  type: 'get',
                  resource,
                  requestId,
                  list,
                })
              } else {
                const content: ContentSet | undefined = await contents.get(resource[1])
                if (!content) {
                  await sendFail(socketId, message, 'not-found')
                  return
                }
                send(socketId, {
                  type: 'get',
                  resource,
                  requestId,
                  content,
                })
              }
              return
            }

            case 'games': {
              const user = await users.get(session.userId)

              if (!user) {
                logger.error({ userId: session.userId }, 'Authenticated user not found')
                return sendFail(socketId, message, 'system-inconsistency')
              }
              const gameId = resource[1]

              if (!user.gameIds.includes(gameId)) {
                await sendFail(socketId, message, 'not-found')
                return
              }

              const partialGame = await games.getGame(gameId)
              if (!partialGame) {
                await sendFail(socketId, message, 'not-found')
                return
              }
              const game = await makeGame(partialGame)

              await send(socketId, {
                type: 'get',
                resource,
                requestId: message.requestId,
                game,
              })
              return;
            }
          }
        }

        case 'action': {
          const gameId = session.gameId
          if (!gameId) {
            await sendFail(socketId, message, 'no-game')
            return
          }
          const result = await handleAction(
            session.userId,
            gameId,
            message.action,
          )
          if (result.type === 'failure') {
            return sendFail(socketId, message, 'game-action-failed')
          }
          return Promise.all([
            sendOk(socketId, message),
            broadcast(result.state, result.event),
          ])
        }
      }
    }

    return LoggerService.traceFunction<GameHandler>(logger, async (event) => {
      const { socketId } = event
      switch (event.type) {
        case 'connect':
          logger.info({ socketId }, 'player connected')
          break

        case 'disconnect':
          logger.info({ socketId }, 'player disconnected')
          await sessions.removeSession(socketId)
          break

        case 'message':
          const message = event.json
          const session = await sessions.getSession(event.socketId)
          if (!isClientMessage(message)) {
            if (hasRequestId(message)) {
              // Return a generic failure caused by request
              logger.error({ socketId, message }, 'bad request')
              send(socketId, {
                type: 'failure',
                requestId: message.requestId,
                message: 'bad-request',
              })
              return
            } else {
              // Request doesn't even follow basic protocol, terminate it.
              logger.error(
                { socketId },
                'unknown client message, terminating connection',
              )
              sockets.disconnect(socketId)
              return
            }
          } else if (!session) {
            // User has not authenticated yet
            if (message.type !== 'login') {
              // No other message is allowed yet
              return sendFail(socketId, message, 'unauthenticated')
            }

            // Authenticate user
            const { username, password } = message
            const user = await users.authenticate(username, password)
            if (!user) {
              // No other message is allowed
              return sendFail(socketId, message, 'bad-auth')
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
                })
              }
            } as ServerLoginResponse)
            logger.debug({ session: newSession }, 'Created session')
          } else {
            // User is authenticated
            await onClientMessage(socketId, message, session)
          }
          break
      }
    })
  },
)
