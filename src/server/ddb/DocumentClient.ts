import { inject } from '../../inject'
import AWSDynamoDB from 'aws-sdk/clients/dynamodb'

export const DynamoDB = inject(
  {},
  () => new AWSDynamoDB({ apiVersion: '2012-08-10' }),
)

export const DocumentClient = inject(
  { DynamoDB },
  ({ DynamoDB: service }): AWSDynamoDB.DocumentClient => {
    return new AWSDynamoDB.DocumentClient({
      service,
      convertEmptyValues: true,
    })
  },
)
