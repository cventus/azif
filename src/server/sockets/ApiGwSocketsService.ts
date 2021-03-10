import AWS from 'aws-sdk'

import { inject } from '../../inject'
import { SocketsService } from './SocketsService'

export const ApiGwSocketsService = inject({}, () => {
  const api = new AWS.ApiGatewayManagementApi({ apiVersion: '2018-11-29' })
  const service: SocketsService = {
    async disconnect(socketId) {
      await api
        .deleteConnection({
          ConnectionId: socketId,
        })
        .promise()
    },
    async send(socketId, json) {
      await api
        .postToConnection({
          ConnectionId: socketId,
          Data: JSON.stringify(json),
        })
        .promise()
    },
  }
  return service
})
