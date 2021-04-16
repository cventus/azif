import { isGameEvent } from '../../game/resources'
import { inject } from '../../inject'
import { expressionNames, ttl } from '../ddb'
import { DocumentClient } from '../ddb/DocumentClient'
import { TableConfig } from '../ddb/TableConfig'
import { LoggerService } from '../logger/LoggerService'
import { EventsService } from './EventsService'

// 3 months in seconds
const EventTTL: number = 3 * 30 * 24 * 60 * 60
const ProjectionExpression = '#gameId, #clock, #playerId, #epoch, #action'
const ExpressionAttributeNames = expressionNames(
  'gameId',
  'clock',
  'playerId',
  'epoch',
  'action',
)

export const DDBEventsService = inject(
  { DocumentClient, TableConfig, LoggerService },
  ({ DocumentClient: client, TableConfig: config, LoggerService }) => {
    const logger = LoggerService.create('DDBEventsService')
    const TableName = config.tables.events

    const service: EventsService = LoggerService.traceMethods<EventsService>(
      logger,
      {
        async get(gameId, clock) {
          const { Item: item } = await client
            .get({
              ProjectionExpression,
              ExpressionAttributeNames,
              Key: { gameId, clock },
              TableName,
            })
            .promise()

          if (!isGameEvent(item)) {
            logger.error({ gameId, clock, item }, 'Not a GameEvent')
            return
          }
          return item
        },
        async list(gameId, options = {}) {
          const queryNames: Record<string, string> = {}
          const queryValues: Record<string, string | number> = {}
          const expressions: string[] = []

          if (typeof options.since === 'number') {
            queryNames['#clock'] = 'clock'
            queryValues[':since'] = options.since
            if (typeof options.until !== 'number') {
              expressions.push('#clock > :since')
            }
          }
          if (typeof options.until === 'number') {
            queryNames['#clock'] = 'clock'
            queryValues[':until'] = options.until
            if (typeof options.since === 'number') {
              expressions.push('#clock BETWEEN :since AND :until')
            } else {
              expressions.push('#clock <= :until')
            }
          }

          const { Items: items } = await client
            .query({
              TableName,
              ProjectionExpression,
              ConsistentRead: options.since === undefined,
              Limit: 20,
              KeyConditionExpression: [
                '#gameId = :gameId',
                ...expressions,
              ].join(' and '),
              ExpressionAttributeNames: {
                ...ExpressionAttributeNames,
                ...queryNames,
              },
              ExpressionAttributeValues: { ':gameId': gameId, ...queryValues },
              ScanIndexForward: false, // from most recent to older
            })
            .promise()

          if (!items) {
            return []
          }
          const mismatch = items.find((i) => !isGameEvent(i))
          if (mismatch) {
            logger.warn({ gameId, options, mismatch }, 'Not a GameEvent ')
          }

          return items.filter(isGameEvent)
        },
        async write(event) {
          await client
            .put({
              Item: { ...event, ttl: ttl(EventTTL) },
              TableName,
              ConditionExpression: 'attribute_not_exists(gameId)',
            })
            .promise()

          return event
        },
      },
    )

    return service
  },
)
