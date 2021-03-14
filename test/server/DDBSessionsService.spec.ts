import { assemble } from '../../src/inject'

import { TestModule } from '../../src/server/ddb/TestClient'
import { SessionsService } from '../../src/server/sessions/SessionsService'
import { DDBSessionsService } from '../../src/server/sessions/DDBSessionsService'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { LoggerService } from '../../src/server/logger/LoggerService'
import { TestLoggerConfig } from '../../src/server/logger/TestLoggerConfig'

describe('DDBSessionsService', () => {
  let service: SessionsService
  let client: DocumentClient
  let table: string
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const assembly = await assemble({
      ...TestModule,
      LoggerConfig: TestLoggerConfig(),
      Logger: LoggerService,
      DDBSessionsService,
    })
    service = assembly.get('DDBSessionsService')
    client = assembly.get('DocumentClient')
    table = assembly.get('TableConfig').tables.sessions
    cleanup = () => assembly.destroy()
  })

  afterEach(() => cleanup())

  describe('.setUser()', () => {
    it('creates a mapping from socket to user', async () => {
      const before = await service.getSession('S_1')
      await service.createSession('S_1', 'user:1')
      const after = await service.getSession('S_1')

      expect(before).toEqual(undefined)
      expect(after).toEqual({
        socketId: 'S_1',
        userId: 'user:1',
      })
    })

    it('should throw an exception if called with the same socket ID twice', async () => {
      await service.createSession('S_1', 'user:1')

      await expect(service.createSession('S_1', 'user:1')).rejects.toThrow()
      await expect(service.createSession('S_1', 'user:2')).rejects.toThrow()
    })
  })

  describe('.setGame()', () => {
    it('should associate a game with a socket', async () => {
      await service.createSession('S_1', 'user:1')
      await service.subscribeToGame('S_1', 'game:1')
      const session = await service.getSession('S_1')

      expect(session).toEqual({
        socketId: 'S_1',
        userId: 'user:1',
        gameId: 'game:1',
      })
    })

    it("should throw an exception if the socket isn't tied to a user", async () => {
      await expect(service.subscribeToGame('S_1', 'game:1')).rejects.toThrow()
    })

    it('should associate players with a game', async () => {
      await service.createSession('S_1', 'user:1')
      await service.subscribeToGame('S_1', 'game:1')

      await service.createSession('S_2', 'user:2')
      await service.subscribeToGame('S_2', 'game:1')

      const sessions = await service.getGameSessions('game:1')

      expect(sessions).toEqual(
        expect.arrayContaining([
          {
            socketId: 'S_1',
            userId: 'user:1',
            gameId: 'game:1',
          },
          {
            socketId: 'S_2',
            userId: 'user:2',
            gameId: 'game:1',
          },
        ]),
      )
    })

    it('should associate another game with a socket', async () => {
      await service.createSession('S_1', 'user:1')
      await service.subscribeToGame('S_1', 'game:1')
      await service.subscribeToGame('S_1', 'game:2')

      const session = await service.getSession('S_1')
      const game1 = await service.getGameSessions('game:1')
      const game2 = await service.getGameSessions('game:2')

      expect(game1).toEqual([])
      expect(game2).toEqual([
        {
          socketId: 'S_1',
          userId: 'user:1',
          gameId: 'game:2',
        },
      ])
      expect(session).toEqual({
        socketId: 'S_1',
        userId: 'user:1',
        gameId: 'game:2',
      })
    })
  })

  describe('.removeSession()', () => {
    it('should remove existing sessions', async () => {
      await service.createSession('S_1', 'user:1')
      await service.removeSession('S_1')

      const session = await service.getSession('S_1')
      expect(session).toBe(undefined)
    })

    it("should silently fail if the session doesn't exist", async () => {
      await expect(service.removeSession('S_1')).resolves.toBe(undefined)
    })

    it('should remove game sockets', async () => {
      await service.createSession('S_1', 'user:1')
      await service.subscribeToGame('S_1', 'game:1')
      await service.removeSession('S_1')

      const sessions = await service.getGameSessions('game:1')

      expect(sessions).toEqual([])
    })

    it('should remove left-over game sockets', async () => {
      await service.createSession('S_1', 'user:1')
      await service.subscribeToGame('S_1', 'game:1')

      // session row got deleted while game connection remained somehow
      await client
        .delete({ Key: { id: 'socket:S_1' }, TableName: table })
        .promise()

      // delete with game ID specified
      await service.removeSession('S_1', 'game:1')

      const sessions = await service.getGameSessions('game:1')

      expect(sessions).toEqual([])
    })
  })
})
