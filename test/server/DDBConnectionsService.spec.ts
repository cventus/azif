import { assemble } from '../../src/inject'

import { TestModule } from '../../src/server/ddb/TestClient'
import { ConnectionsService } from '../../src/server/connections/ConnectionsService'
import { DDBConnectionsService } from '../../src/server/connections/DDBConnectionsService'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { LoggerService } from '../../src/server/logger/LoggerService'
import { TestLoggerConfig } from '../../src/server/logger/TestLoggerConfig'

describe('DDBConnectionsService', () => {
  let service: ConnectionsService
  let client: DocumentClient
  let table: string
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const assembly = await assemble({
      ...TestModule,
      LoggerConfig: TestLoggerConfig(),
      Logger: LoggerService,
      DDBConnectionsService,
    })
    service = assembly.get('DDBConnectionsService')
    client = assembly.get('DocumentClient')
    table = assembly.get('TableConfig').tables.connections
    cleanup = () => assembly.destroy()
  })

  afterEach(() => cleanup())

  describe('.setUser()', () => {
    it('creates a mapping from socket to user', async () => {
      const before = await service.getConnection('S_1')
      await service.createConnection('S_1', 'user:1')
      const after = await service.getConnection('S_1')

      expect(before).toEqual(undefined)
      expect(after).toEqual({
        socketId: 'S_1',
        userId: 'user:1',
      })
    })

    it('should throw an exception if called with the same socket ID twice', async () => {
      await service.createConnection('S_1', 'user:1')

      await expect(service.createConnection('S_1', 'user:1')).rejects.toThrow()
      await expect(service.createConnection('S_1', 'user:2')).rejects.toThrow()
    })
  })

  describe('.setGame()', () => {
    it('should associate a game with a socket', async () => {
      await service.createConnection('S_1', 'user:1')
      await service.setGame('S_1', 'game:1')
      const connection = await service.getConnection('S_1')

      expect(connection).toEqual({
        socketId: 'S_1',
        userId: 'user:1',
        gameId: 'game:1',
      })
    })

    it('should throw an exception if the socket isn\'t tied to a user', async () => {
      await expect(service.setGame('S_1', 'game:1')).rejects.toThrow()
    })

    it('should associate players with a game', async () => {
      await service.createConnection('S_1', 'user:1')
      await service.setGame('S_1', 'game:1')

      await service.createConnection('S_2', 'user:2')
      await service.setGame('S_2', 'game:1')

      const connections = await service.getGameConnections('game:1')

      expect(connections).toEqual(
        expect.arrayContaining([{
          socketId: 'S_1',
          userId: 'user:1',
          gameId: 'game:1',
        },
        {
          socketId: 'S_2',
          userId: 'user:2',
          gameId: 'game:1',
        }
      ])
      )

    })

    it('should associate another game with a socket', async () => {
      await service.createConnection('S_1', 'user:1')
      await service.setGame('S_1', 'game:1')
      await service.setGame('S_1', 'game:2')

      const connection = await service.getConnection('S_1')
      const game1 = await service.getGameConnections('game:1')
      const game2 = await service.getGameConnections('game:2')

      expect(game1).toEqual([])
      expect(game2).toEqual([{
        socketId: 'S_1',
        userId: 'user:1',
        gameId: 'game:2',
      }])
      expect(connection).toEqual({
        socketId: 'S_1',
        userId: 'user:1',
        gameId: 'game:2',
      })
    })
  })

  describe('.removeConnection()', () => {
    it('should remove existing connections', async () => {
      await service.createConnection('S_1', 'user:1')
      await service.removeConnection('S_1')

      const connection = await service.getConnection('S_1')
      expect(connection).toBe(undefined)
    })

    it('should silently fail if the connection doesn\'t exist', async () => {
      await expect(service.removeConnection('S_1')).resolves.toBe(undefined)
    })

    it('should remove game sockets', async () => {
      await service.createConnection('S_1', 'user:1')
      await service.setGame('S_1', 'game:1')
      await service.removeConnection('S_1')

      const connections = await service.getGameConnections('game:1')

      expect(connections).toEqual([])
    })

    it('should remove left-over game sockets', async () => {
      await service.createConnection('S_1', 'user:1')
      await service.setGame('S_1', 'game:1')

      // connection row got deleted while game connection remained somehow
      await client.delete({ Key: { id: 'socket:S_1' }, TableName: table }).promise()

      // delete with game ID specified
      await service.removeConnection('S_1', 'game:1')

      const connections = await service.getGameConnections('game:1')

      expect(connections).toEqual([])
    })
  })
})
