import { DynamoDB } from 'aws-sdk'
import { inject } from '../../inject'

export interface TableConfig {
  tables: {
    content: string
    events: string
    games: string
    gameSessions: string
    sessions: string
    users: string
  }
}

export const DefaultTableConfig: TableConfig = {
  tables: {
    content: 'items',
    events: 'events',
    games: 'items',
    gameSessions: 'sessions',
    sessions: 'items',
    users: 'items',
  },
}

export const TableConfig = inject<TableConfig>()

const uniq = (names: string[]): string[] => {
  const uniqueNames: Set<string> = new Set(names)
  return Array.from(uniqueNames.values())
}

export const configureTableDefinitions = (
  config: TableConfig,
): DynamoDB.CreateTableInput[] => [
  ...uniq([
    config.tables.content,
    config.tables.games,
    config.tables.sessions,
    config.tables.users,
  ]).map(
    (TableName): DynamoDB.CreateTableInput => ({
      TableName,
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH',
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: 'S',
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
    }),
  ),
  {
    TableName: config.tables.events,
    KeySchema: [
      {
        AttributeName: 'gameId',
        KeyType: 'HASH',
      },
      {
        AttributeName: 'clock',
        KeyType: 'RANGE',
      },
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'gameId',
        AttributeType: 'S',
      },
      {
        AttributeName: 'clock',
        AttributeType: 'N',
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1,
    },
  },
  {
    TableName: config.tables.gameSessions,
    KeySchema: [
      {
        AttributeName: 'gameId',
        KeyType: 'HASH',
      },
      {
        AttributeName: 'socketId',
        KeyType: 'RANGE',
      },
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'gameId',
        AttributeType: 'S',
      },
      {
        AttributeName: 'socketId',
        AttributeType: 'S',
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1,
    },
  },
]

export const createTablesIfNotExists = async (
  config: TableConfig,
  client: DynamoDB,
): Promise<void> => {
  const definitions = configureTableDefinitions(config)

  for (const table of definitions) {
    await client.createTable(table).promise()
  }
  for (const { TableName } of definitions) {
    await client.waitFor('tableExists', { TableName }).promise()
  }
}

export const deleteTablesIfExists = async (
  config: TableConfig,
  client: DynamoDB,
): Promise<void> => {
  for (const TableName of uniq(Object.values(config.tables))) {
    try {
      await client.deleteTable({ TableName }).promise()
    } catch (err) {
      // OK
    }
  }
}
