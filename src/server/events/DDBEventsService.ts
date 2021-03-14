import { isGameEvent } from '../../game/resources'
import { inject } from '../../inject'
import { DocumentClient } from '../ddb/DocumentClient'
import { TableConfig } from '../ddb/TableConfig'
import { LoggerService } from '../logger/LoggerService'
import { EventsService } from './EventsService'

export const DDBEventsService = inject(
  { DocumentClient, TableConfig, LoggerService },
  ({ DocumentClient: client, TableConfig: config, LoggerService }) => {
    const logger = LoggerService.create('DDBEventsService')
    const TableName = config.tables.events

    const service: EventsService = LoggerService.traceMethods<EventsService>(logger, {
      async get(gameId, clock) {
        const { Item: item } = await client.get({
          Key: { gameId, clock },
          TableName,
        }).promise()

        if (!isGameEvent(item)) {
          logger.error({ gameId, clock, item }, 'Not a GameEvent')
          return
        }
        return item
      },
      async list(gameId, options = {}) {
        let queryNames: Record<string, string> = {}
        let queryValues: Record<string, string | number> = {}
        const expressions: string[] = []

        if (typeof options.since === 'number') {
          queryNames['#clock'] = 'clock'
          queryValues[':since'] = options.since
          expressions.push('#clock > :since')
        }
        if (typeof options.until === 'number') {
          queryNames['#clock'] = 'clock'
          queryValues[':until'] = options.until
          expressions.push('#clock <= :until')
        }

        const { Items: items } = await client
          .query({
            TableName,
            ConsistentRead: options.since === undefined,
            Limit: 20,
            KeyConditionExpression: [
              '#gameId = :gameId',
              ...expressions,
            ].join(' and '),
            ExpressionAttributeNames: { '#gameId': 'gameId', ...queryNames },
            ExpressionAttributeValues: { ':gameId': gameId, ...queryValues },
            ScanIndexForward: false, // from most recent to older
          })
          .promise()

        if (!items) {
          return []
        }
        const mismatch = items.find(i => !isGameEvent(i))
        if (mismatch) {
          logger.warn({ gameId, options, mismatch }, 'Not a GameEvent ')
        }

        return items.filter(isGameEvent)
      },
      async write(event) {
        await client
          .put({
            Item: event,
            TableName,
            ConditionExpression: 'attribute_not_exists(gameId)'
          })
          .promise()

        return event
      }
    })

    return service
  },
)
