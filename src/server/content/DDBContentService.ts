import type { DynamoDB } from 'aws-sdk'

import { inject } from '../../inject'
import { DocumentClient } from '../ddb/DocumentClient'
import { TableConfig } from '../ddb/TableConfig'
import zlib from 'zlib'

import { ContentService } from './ContentService'
import { Dictionary, StructureType, validate } from '../../structure'
import { Card } from '../../game/rules'
import { LoggerService } from '../logger/LoggerService'
import { ContentSet } from '../../game/resources'

const ContentSetItem = {
  id: String,
  name: String,
  description: Array(String),
}

const ContentSetListItem = {
  id: String,
  sets: Array(ContentSetItem),
}

type ContentSetListItem = StructureType<typeof ContentSetListItem>

const isContentSetItem = validate(ContentSetItem)
const isContentSetListItem = validate(ContentSetListItem)
const isCardDict = validate(Dictionary(Card))

export interface DDBContentService extends ContentService {
  defineContent(sets: ContentSet[]): Promise<void>
}

export const DDBContentService = inject(
  { DocumentClient, TableConfig, LoggerService },
  ({
    DocumentClient: client,
    TableConfig: config,
    LoggerService,
  }): DDBContentService => {
    const TableName = config.tables.content
    const logger = LoggerService.create('DDBContentService')

    const listItemId = 'set:list'

    const service: DDBContentService = LoggerService.traceMethods(logger, {
      async get(setId) {
        // Sets are stored as meta-information and deflated JSON, containing an
        // array of Cards.
        const Key = { id: setId }
        const { Item: item } = await client.get({ TableName, Key }).promise()
        if (!item) {
          return undefined
        }
        const cards = item.content
        if (!Buffer.isBuffer(cards) || !isContentSetItem(item)) {
          logger.error({ setId }, 'Not a ContentSetItem')
          return undefined
        }
        try {
          const result = await new Promise<Buffer>((resolve, reject) => {
            zlib.inflate(cards, (err, result) => {
              if (err) reject(err)
              else resolve(result)
            })
          })
          const cardDict = JSON.parse(result.toString('utf-8'))
          if (!isCardDict(cardDict)) {
            logger.error({ setId }, 'Not a ContentSetItem')
            logger.debug({ cardList: cardDict })
            return undefined
          }

          return {
            id: setId,
            name: item.name,
            description: item.description,
            cards: cardDict,
          }
        } catch (e: unknown) {
          logger.error(`Not a ContentSetItem: ${Key.id}`, e)
          return undefined
        }
      },
      async list() {
        const Key = { id: listItemId }
        const { Item: item } = await client
          .get({
            TableName,
            Key,
            ConsistentRead: true,
          })
          .promise()
        if (!item) {
          return []
        }
        if (!isContentSetListItem(item)) {
          logger.error({ item }, 'Not a ContentSetListItem')
          return []
        }
        return item.sets
      },
      async defineContent(sets) {
        const newList: ContentSetListItem = {
          id: listItemId,
          sets: sets.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
          })),
        }

        const oldList = await service.list()
        const oldItemIds = oldList
          .map((s) => s.id)
          .filter((id) => !newList.sets.find((s) => s.id === id))

        const writeAll = async (
          items: DynamoDB.DocumentClient.BatchWriteItemRequestMap,
        ): Promise<void> => {
          let nextItems = items
          do {
            const { UnprocessedItems = {} } = await client
              .batchWrite({ RequestItems: nextItems })
              .promise()
            nextItems = UnprocessedItems
            if (Object.keys(UnprocessedItems).length > 0) {
              const unprocessedCount = UnprocessedItems[TableName].length
              logger.warn(
                { unprocessedCount },
                'Failed to write complete batch, retrying.',
              )
              continue
            } else {
              break
            }
          } while (true)
        }

        if (oldItemIds.length > 0) {
          logger.info({ oldItemIds }, 'Deleting abandoned content sets')
          await writeAll({
            [TableName]: oldItemIds.map((id) => ({
              DeleteRequest: { Key: { id } },
            })),
          })
        }

        const writes = await Promise.all(
          sets.map(async (s) => ({
            PutRequest: {
              Item: {
                id: s.id,
                name: s.name,
                description: s.description,
                content: await new Promise<Buffer>((resolve, reject) => {
                  const cards = JSON.stringify(s.cards)
                  zlib.deflate(Buffer.from(cards, 'utf-8'), (err, result) => {
                    if (err) reject(err)
                    else resolve(result)
                  })
                }),
              },
            },
          })),
        )

        const newItemIds = sets.map((s) => s.id)
        logger.info({ newItemIds }, 'Writing new content sets')
        await writeAll({
          [TableName]: [
            ...writes,
            {
              PutRequest: {
                Item: newList,
              },
            },
          ],
        })
        logger.info({ newItemIds }, 'Content sets written')
      },
    })

    return service
  },
)
