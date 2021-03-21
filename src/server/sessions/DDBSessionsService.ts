import { inject } from '../../inject'
import { Literal, Union, validate } from '../../structure'

import { DocumentClient } from '../ddb/DocumentClient'
import { TableConfig } from '../ddb/TableConfig'
import { LoggerService } from '../logger/LoggerService'
import { SessionsService } from './SessionsService'

const SocketItem = {
  id: String,
  userId: String,
  gameId: Union(String, Literal(null)),
  ttl: Number,
}
const isSocketItem = validate(SocketItem)

const SocketListItem = {
  gameId: String,
  socketId: String,
  userId: String,
  ttl: Number,
}
const isSocketListItem = validate(SocketListItem)

export const DDBSessionsService = inject(
  { DocumentClient, TableConfig, LoggerService },
  ({ DocumentClient: client, TableConfig, LoggerService }): SessionsService => {
    const logger = LoggerService.create('DDBSessionsService')

    const ItemTableName = TableConfig.tables.sessions
    const ListTableName = TableConfig.tables.gameSessions

    const ttl = () => {
      const epoch = Math.floor(new Date().valueOf() / 1000)
      // API Gateway sockets time-out after 2 hours
      const twoishHours = 2.25 * 60 * 60
      return epoch + twoishHours
    }

    return LoggerService.traceMethods(logger, {
      async removeSession(socketId, gameId) {
        const { Attributes: item } = await client
          .delete({
            Key: { id: `socket:${socketId}` },
            TableName: ItemTableName,
            ReturnValues: 'ALL_OLD',
          })
          .promise()

        if (item) {
          if (!isSocketItem(item)) {
            logger.warn({ item }, 'Deleted item is not a SocketItem')
          } else if (item.gameId) {
            await client
              .delete({
                Key: { gameId: item.gameId, socketId },
                TableName: ListTableName,
              })
              .promise()
          }
        } else if (gameId) {
          // Try to delete accidental left-over, by game-id
          await client
            .delete({
              Key: { gameId: gameId, socketId },
              TableName: ListTableName,
            })
            .promise()
        }
      },
      async getSession(socketId) {
        const { Item: item } = await client
          .get({
            Key: { id: `socket:${socketId}` },
            TableName: ItemTableName,
            ConsistentRead: true,
          })
          .promise()
        if (!item) {
          return
        }
        if (!isSocketItem(item)) {
          const error: Error & Partial<Record<'item', unknown>> = new Error(
            'Not a SocketItem',
          )
          error.item = item
          throw error
        }
        return {
          socketId: item.id.substr('socket:'.length),
          userId: item.userId,
          gameId: item.gameId,
        }
      },
      async getGameSessions(gameId) {
        const { Items: items } = await client
          .query({
            TableName: ListTableName,
            ConsistentRead: true,
            Limit: 20,
            KeyConditionExpression: '#gameId = :gameId',
            ExpressionAttributeNames: { '#gameId': 'gameId' },
            ExpressionAttributeValues: { ':gameId': gameId },
          })
          .promise()
        if (!items) {
          return []
        }
        const mismatch = items.find((i) => !isSocketListItem(i))
        if (mismatch) {
          const error: Error & Partial<Record<'item', unknown>> = new Error(
            'Not a SocketListItem',
          )
          error.item = mismatch
          throw error
        }
        return items.filter(isSocketListItem).map((i) => ({
          socketId: i.socketId,
          gameId: i.gameId,
          userId: i.userId,
        }))
      },
      async subscribeToGame(socketId, gameId) {
        // Update socket entry
        const { Attributes: oldItem } = await client
          .update({
            Key: { id: `socket:${socketId}` },
            TableName: ItemTableName,
            UpdateExpression: 'SET #gameId = :gameId',
            ExpressionAttributeNames: { '#gameId': 'gameId' },
            ExpressionAttributeValues: { ':gameId': gameId },
            ConditionExpression:
              'attribute_exists(id) and attribute_exists(userId)',
            ReturnValues: 'ALL_OLD',
          })
          .promise()

        if (!isSocketItem(oldItem)) {
          const error: Error & Partial<Record<'item', unknown>> = new Error(
            'Not a SocketItem',
          )
          error.item = oldItem
          throw error
        }

        // Remove old mapping
        if (oldItem.gameId) {
          await client
            .delete({
              Key: { gameId: oldItem.gameId, socketId },
              TableName: ListTableName,
            })
            .promise()
        }

        // Add socket id to list
        if (gameId !== null) {
          await client
            .put({
              Item: {
                gameId,
                socketId,
                userId: oldItem.userId,
                ttl: oldItem.ttl,
              },
              TableName: ListTableName,
            })
            .promise()
        }
        return { gameId: gameId, socketId, userId: oldItem.userId }
      },
      async createSession(socketId, userId) {
        await client
          .put({
            Item: { id: `socket:${socketId}`, userId, gameId: null, ttl: ttl() },
            TableName: ItemTableName,
            ConditionExpression: 'attribute_not_exists(id)',
          })
          .promise()
        return { socketId, userId, gameId: null }
      },
    })
  },
)
