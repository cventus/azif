import DynamoDB from 'aws-sdk/clients/dynamodb'

import { inject } from '../../inject'
import { generateId } from '../generateId'
import {
  createTablesIfNotExists,
  DefaultTableConfig,
  deleteTablesIfExists,
  TableConfig,
} from './TableConfig'

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

export const TestTableConfig = inject<TableConfig>(DefaultTableConfig)

export const CreateTestTables = inject(
  { TestDynamoDB },
  async ({ TestDynamoDB: client }) => {
    await createTablesIfNotExists(DefaultTableConfig, client)
    return client
  },
  async (client) => {
    await deleteTablesIfExists(DefaultTableConfig, client)
  },
)

export const TestModule = {
  TestDynamoDB,
  TableConfig: TestTableConfig,
  DocumentClient: TestDocumentClient,
  CreateTestTables,
} as const
