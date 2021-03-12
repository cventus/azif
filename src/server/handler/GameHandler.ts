import {
  ClientMessage,
  ServerGameNotification,
  isClientMessage,
  ServerMessage,
} from '../../game/protocol'
import { inject } from '../../inject'
import { validate } from '../../structure'

import { ConnectionsService } from '../connections/ConnectionsService'
import { GameActionsHandler } from '../games/GameActionsHandler'
import { makeGameState } from '../games/GamesService'
import { Logger } from '../logger'
import { SocketsService } from '../sockets/SocketsService'
import { User } from '../users'
import { UsersService } from '../users/UsersService'

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
    Logger,
    ConnectionsService,
    UsersService,
    SocketsService,
    GameActionsHandler,
  },
  ({
    Logger: logger,
    ConnectionsService: connections,
    UsersService: users,
    SocketsService: sockets,
    GameActionsHandler: game,
  }): GameHandler => {
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

    const broadcast = async (
      socketIds: string[],
      event: ServerGameNotification,
    ): Promise<void> => {
      await Promise.all(socketIds.map((socketId) => send(socketId, event)))
    }

    return async (event) => {
      const { socketId } = event
      switch (event.type) {
        case 'connect':
          logger.info({ socketId }, 'player connected')
          break

        case 'disconnect':
          logger.info({ socketId }, 'player disconnected')
          await connections.disconnect(socketId)
          break

        case 'message':
          const message = event.json
          const connection = await connections.getConnection(event.socketId)
          if (!isClientMessage(message)) {
            if (hasRequestId(message)) {
              // Return a generic failure caused by request
              logger.debug({ socketId }, 'bad request')
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
          } else if (!connection) {
            // User has not authenticated yet
            if (message.type !== 'login') {
              // No other message is allowed yet
              await sendFail(socketId, message, 'unauthenticated')
              return
            }

            // Authenticate user
            const { username, password } = message
            const user = await users.authenticate(username, password)
            if (!user) {
              // No other message is allowed
              await sendFail(socketId, message, 'bad-auth')
              return
            }

            // Associate socket with user
            await connections.setUser(socketId, user.id)
            await sendOk(socketId, message)
          } else {
            // User is authenticated
            switch (message.type) {
              case 'login':
                // Forbidden, must disconnect first
                await sendFail(socketId, message, 'already-authenticated')
                break

              case 'logout':
                await connections.disconnect(socketId)
                await sendOk(socketId, message)
                break

              case 'action':
                const gameId = connection.gameId
                if (!gameId) {
                  await sendFail(socketId, message, 'no-game')
                  return
                }

                const result = await game(
                  connection.userId,
                  gameId,
                  message.action,
                )
                if (result.type === 'failure') {
                  await sendFail(socketId, message, 'game-action-failed')
                  return
                }
                const playerConnections = await connections.getGameConnections(
                  gameId,
                )
                const playerNames = await Promise.all(
                  playerConnections.map(({ userId }) => users.get(userId)),
                )
                const gameState = makeGameState(
                  result.state,
                  playerNames.filter((x): x is User => Boolean(x)),
                )
                const notification: ServerGameNotification = {
                  type: 'game-event',
                  event: result.event,
                  game: gameState,
                }
                await broadcast(
                  playerConnections.map(({ socketId }) => socketId),
                  notification,
                )
                break
            }
          }
          break
      }
    }
  },
)