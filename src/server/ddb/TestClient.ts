import DynamoDB from 'aws-sdk/clients/dynamodb'

import { inject } from '../../inject'
import { generateId } from '../generateId'
import { TableConfig } from './TableConfig'

export const TestDynamoDB = inject({}, async () => {
  const testId = await generateId()
  const client = new DynamoDB({
    apiVersion: '2012-08-10',
    endpoint: 'http://localhost:8000',
    region: 'ddblocal',
    credentials: {
      // local dynamodb accepts any access key
      accessKeyId: `test-${testId}`,
      secretAccessKey: 'test',
    },
  })

  return client
})

export const TestDocumentClient = inject(
  { TestDynamoDB },
  ({ TestDynamoDB: service }) => {
    const client = new DynamoDB.DocumentClient({
      service,
      convertEmptyValues: true,
    })

    return client
  },
)

const TestTables: DynamoDB.CreateTableInput[] = [
  {
    TableName: 'items',
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
  },
  {
    TableName: 'game-sessions',
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

export const TestTableConfig = inject<TableConfig>({
  tables: {
    content: 'items',
    games: 'items',
    users: 'items',
    sessions: 'items',
    gameSessions: 'game-sessions',
  },
})

export const CreateTestTables = inject(
  { TestDynamoDB },
  async ({ TestDynamoDB: client }) => {
    for (const table of TestTables) {
      await client.createTable(table).promise()
    }
    for (const { TableName } of TestTables) {
      await client.waitFor('tableExists', { TableName }).promise()
    }
    return client
  },
  async (client) => {
    for (const { TableName } of TestTables) {
      await client.deleteTable({ TableName }).promise()
    }
  },
)

export const TestModule = {
  TestDynamoDB,
  TableConfig: TestTableConfig,
  DocumentClient: TestDocumentClient,
  CreateTestTables,
} as const
