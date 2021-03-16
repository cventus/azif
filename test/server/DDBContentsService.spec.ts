import { assemble } from '../../src/inject'

import { TestModule } from '../../src/server/ddb/TestClient'
import { LoggerService } from '../../src/server/logger/LoggerService'
import { TestLoggerConfig } from '../../src/server/logger/TestLoggerConfig'
import { DDBContentService } from '../../src/server/content/DDBContentService'
import { ContentSet } from '../../src/game/resources'

const set1: ContentSet = {
  id: 'set:1',
  name: 'Set 1',
  description: ['The first set'],
  cards: {
    'card-1': {
      id: 'card-1',
      type: 'condition',
      condition: 'hungry',
      name: 'Hungry',
      description: ['You should probably have a snack'],
      set: 'set:1',
    },
  },
}

const set2: ContentSet = {
  id: 'set:2',
  name: 'Set 2',
  description: ['The second set'],
  cards: {
    'card-2': {
      id: 'card-2',
      type: 'condition',
      condition: 'sleepy',
      name: 'Sleepy',
      description: ['You should probably take a nap'],
      set: 'set:2',
    },
  },
}

describe('DDBContentService', () => {
  let service: DDBContentService
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const assembly = await assemble({
      ...TestModule,
      LoggerConfig: TestLoggerConfig(),
      LoggerService,
      DDBContentService,
    })
    service = assembly.get('DDBContentService')
    cleanup = () => assembly.destroy()
  })

  afterEach(() => cleanup())

  it('should define, list and retrieve content', async () => {
    const sets = [set1, set2]

    await service.defineContent(sets)

    const setList = await service.list()
    const getSet1 = await service.get('set:1')
    const getSet2 = await service.get('set:2')

    expect(setList).toEqual(
      expect.arrayContaining([
        {
          id: 'set:1',
          name: 'Set 1',
          description: ['The first set'],
        },
        {
          id: 'set:2',
          name: 'Set 2',
          description: ['The second set'],
        },
      ]),
    )
    expect(getSet1).toEqual(set1)
    expect(getSet2).toEqual(set2)
  })

  describe('.defineContent()', () => {
    it('should remove and replace existing content sets', async () => {
      const updatedSet2: ContentSet = {
        id: 'set:2',
        name: 'Set 2',
        description: ['The second set (updated)'],
        cards: {
          'card-2': {
            id: 'card-2',
            type: 'condition',
            condition: 'sleepy',
            name: 'Sleepy',
            description: ['You should get more sleep'],
            set: 'set:2',
          },
        },
      }

      const set3: ContentSet = {
        id: 'set:3',
        name: 'Set 3',
        description: ['The third set'],
        cards: {
          'card-2': {
            id: 'card-2',
            type: 'condition',
            condition: 'sleepy',
            name: 'Sleepy',
            description: ['You should get more sleep'],
            set: 'set:2',
          },
        },
      }

      await service.defineContent([set1, set2])
      await service.defineContent([updatedSet2, set3])

      const setList = await service.list()
      const getSet1 = await service.get('set:1')
      const getSet2 = await service.get('set:2')
      const getSet3 = await service.get('set:3')

      expect(setList).toEqual(
        expect.arrayContaining([
          {
            id: 'set:2',
            name: 'Set 2',
            description: ['The second set (updated)'],
          },
          {
            id: 'set:3',
            name: 'Set 3',
            description: ['The third set'],
          },
        ]),
      )
      expect(getSet1).toEqual(undefined)
      expect(getSet2).toEqual(updatedSet2)
      expect(getSet3).toEqual(set3)
    })
  })
})
