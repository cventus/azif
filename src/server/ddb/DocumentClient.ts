import { inject } from '../../inject'
import DynamoDB from 'aws-sdk/clients/dynamodb'

export type TransactWriteItem = DynamoDB.DocumentClient.TransactWriteItem
export type Put = DynamoDB.DocumentClient.Put
export type Get = DynamoDB.DocumentClient.Get
export type Update = DynamoDB.DocumentClient.Update
export type Delete = DynamoDB.DocumentClient.Delete
export type DynamoDbSet = DynamoDB.DocumentClient.DynamoDbSet

export const DocumentClient = inject(
  {},
  ({}): DynamoDB.DocumentClient => {
    const service = new DynamoDB({ apiVersion: '2012-08-10' })
    return new DynamoDB.DocumentClient({
      service,
      convertEmptyValues: true,
    })
  },
)
