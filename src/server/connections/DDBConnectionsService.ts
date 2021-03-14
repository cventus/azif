import { inject } from '../../inject'
import { Optional, validate } from '../../structure'

import { DocumentClient } from '../ddb/DocumentClient'
import { TableConfig } from '../ddb/TableConfig'
import { LoggerService } from '../logger/LoggerService'
import { ConnectionsService } from './ConnectionsService'

const SocketItem = {
  id: String,
  userId: String,
  gameId: Optional(String),
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

export const DDBConnectionsService = inject(
  { DocumentClient, TableConfig, Logger: LoggerService },
  ({ DocumentClient: client, TableConfig, Logger }): ConnectionsService => {
    const logger = Logger.create('DDBConnectionsService')

    const ItemTableName = TableConfig.tables.connections
    const ListTableName = TableConfig.tables.gameConnections

    const ttl = () => {
      const epoch = Math.floor(new Date().valueOf() / 1000)
      // API Gateway sockets time-out after 2 hours
      const twoishHours = 2.25 * 60 * 60
      return epoch + twoishHours
    }

    return Logger.traceMethods(logger, {
      async removeConnection(socketId, gameId) {
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
      async getConnection(socketId) {
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
      async getGameConnections(gameId) {
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
      async setGame(socketId, gameId) {
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
        return { gameId, socketId, userId: oldItem.userId }
      },
      async createConnection(socketId, userId) {
        await client
          .put({
            Item: { id: `socket:${socketId}`, userId, ttl: ttl() },
            TableName: ItemTableName,
            ConditionExpression: 'attribute_not_exists(id)',
          })
          .promise()
        return { socketId, userId }
      },
    })
  },
)
