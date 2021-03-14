import { assemble } from '../../src/inject'

import { TestModule } from '../../src/server/ddb/TestClient'
import { LoggerService } from '../../src/server/logger/LoggerService'
import { TestLoggerConfig } from '../../src/server/logger/TestLoggerConfig'
import { EventsService } from '../../src/server/events/EventsService'
import { DDBEventsService } from '../../src/server/events/DDBEventsService'
import { GameEvent } from '../../src/game/resources'

describe('DDBEventsService', () => {
  let service: EventsService
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const assembly = await assemble({
      ...TestModule,
      LoggerConfig: TestLoggerConfig(),
      LoggerService,
      DDBEventsService,
    })
    service = assembly.get('DDBEventsService')
    cleanup = () => assembly.destroy()
  })

  afterEach(() => cleanup())

  const gameId = 'game:1'

  it('should create and retrieve events', async () => {
    const event: GameEvent = {
      gameId,
      clock: 0,
      epoch: 0,
      playerId: 'user:1',
      action: {
        type: 'chat',
        text: 'message 1',
      }
    }
    
    await service.write(event)

    const item = await service.get(gameId, 0)
    expect(item).toEqual(event)
  })

  describe('.list()', () => {
    it('.list() should retrieve events in reverse chronological order', async () => {
      const event0: GameEvent = {
        gameId,
        clock: 0,
        epoch: 0,
        playerId: 'user:1',
        action: {
          type: 'chat',
          text: 'message 1',
        }
      }

      const event1: GameEvent = {
        gameId,
        clock: 1,
        epoch: 1,
        playerId: 'user:2',
        action: {
          type: 'chat',
          text: 'message 2',
        }
      }
    
      await service.write(event0)
      await service.write(event1)

      const items = await service.list(gameId)
      expect(items).toEqual([event1, event0])
    })
  })
})
