import { inject } from '../../inject'
import { DocumentClient } from '../ddb/DocumentClient'
import { TableConfig } from '../ddb/TableConfig'
import zlib from 'zlib'

import { ContentService } from './ContentService'
import { Dictionary, validate } from '../../structure'
import { Card } from '../../game/rules'

const ContentSetItem = {
  id: String,
  name: String,
  description: String,
}
const isContentSetItem = validate(ContentSetItem)
const isCardDict = validate(Dictionary(Card))

export const DDBContentService = inject(
  { DocumentClient, TableConfig },
  ({ DocumentClient: client, TableConfig: config }) => {
    const TableName = config.tables.content

    const service: ContentService = {
      async get(setId) {
        // Sets are stored as meta-information and deflated JSON, containing an
        // array of Cards.
        const Key = { type: 'set', id: setId  }
        const { Item } = await client.get({ TableName, Key }).promise()
        if (!Item) {
          return undefined
        }
        const cards = Item.content
        if (!Buffer.isBuffer(cards)) {
          console.error(`Not a ContentSetItem: ${Key.id}`)
          return undefined
        }
        if (!isContentSetItem(Item)) {
          console.error(`Not a ContentSetItem: ${Key.id}`)
          return undefined
        }
        try {
          const result = await new Promise<Buffer>((resolve, reject) => {
            zlib.inflate(cards, (err, result) => {
              if (err) reject(err)
              else resolve(result)
            })
          })
          const cardList = result.toJSON()
          if (!isCardDict(cardList)) {
            return undefined
          }

          return {
            id: setId,
            name: Item.name,
            description: Item.description,
            cards: cardList,
          }
        } catch (e: unknown) {
          console.error(`Not a ContentSetItem: ${Key.id}`, e)
          return undefined
        }
      },
      async list() {
        // TODO
        const { Items } = await client.scan({ TableName }).promise()
        
        return []
      },
    }

    return service
  },
)
