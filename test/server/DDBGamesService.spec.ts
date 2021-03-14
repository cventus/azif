import { assemble } from '../../src/inject'

import {
  GamesService,
  PartialGameState,
} from '../../src/server/games/GamesService'
import { TestModule } from '../../src/server/ddb/TestClient'
import { LoggerService } from '../../src/server/logger/LoggerService'

import { DDBGamesService } from '../../src/server/games/DDBGamesService'
import { DDBUsersService } from '../../src/server/users/DDBUsersService'
import { User } from '../../src/server/users'
import { TestLoggerConfig } from '../../src/server/logger/TestLoggerConfig'

describe('GamesService', () => {
  let service: GamesService
  let users: DDBUsersService
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const assembly = await assemble({
      ...TestModule,
      LoggerConfig: TestLoggerConfig(),
      LoggerService,
      DDBGamesService,
      DDBUsersService,
    })
    service = assembly.get('DDBGamesService')
    users = assembly.get('DDBUsersService')
    cleanup = () => assembly.destroy()
  })

  afterEach(() => cleanup())

  it('.createGame() should create new games', async () => {
    const game = await service.createGame('My new game', [
      'alpha',
      'beta',
      'gamma',
    ])

    expect(game).toEqual(
      expect.objectContaining({
        clock: 0,
        name: 'My new game',
        phase: 'starting',
        characters: {},
        contentSetIds: expect.arrayContaining(['alpha', 'beta', 'gamma']),
        flippedCardIds: [],
        players: {},
      }),
    )
  })

  describe('when a game has started', () => {
    let game: PartialGameState
    let alice: User
    let bob: User

    beforeEach(async () => {
      game = await service.createGame('My new game', ['alpha', 'beta', 'gamma'])
      alice = await users.createUser('Alice', {
        username: 'alice',
        password: 'password',
      })
      bob = await users.createUser('Bob', {
        username: 'bob',
        password: 'password',
      })
    })

    it('.startGame() should move the game into the "ongoing" phase', async () => {
      const updatedGame = await service.startGame(game.id)

      expect(updatedGame).toEqual(
        expect.objectContaining({
          clock: 1,
          phase: 'ongoing',
        }),
      )
    })

    it('.endGame() should move the game into the "over" phase', async () => {
      const endedGame = await service.endGame(game.id)

      expect(endedGame).toEqual(
        expect.objectContaining({
          clock: 1,
          phase: 'over',
        }),
      )
    })

    it('.addPlayer() should add players to the game', async () => {
      const updatedState = await service.addPlayer(game.id, alice.id)
      const finalState = await service.addPlayer(game.id, bob.id)

      expect(updatedState).toEqual(
        expect.objectContaining({
          clock: 1,
          players: {
            [alice.id]: {},
          },
        }),
      )
      expect(finalState).toEqual(
        expect.objectContaining({
          clock: 2,
          players: {
            [alice.id]: {},
            [bob.id]: {},
          },
        }),
      )
    })

    it('.removePlayer() should remove players from the game', async () => {
      await service.addPlayer(game.id, alice.id)
      await service.addPlayer(game.id, bob.id)
      const firstState = await service.removePlayer(game.id, bob.id)
      const secondState = await service.removePlayer(game.id, alice.id)

      expect(firstState).toEqual(
        expect.objectContaining({
          clock: 3,
          players: {
            [alice.id]: {},
          },
        }),
      )
      expect(secondState).toEqual(
        expect.objectContaining({
          clock: 4,
          players: {},
        }),
      )
    })

    it('.addPlayer() should add players to the game', async () => {
      const updatedState = await service.addPlayer(game.id, alice.id)
      const finalState = await service.addPlayer(game.id, bob.id)

      expect(updatedState).toEqual(
        expect.objectContaining({
          clock: 1,
          players: {
            [alice.id]: {},
          },
        }),
      )
      expect(finalState).toEqual(
        expect.objectContaining({
          clock: 2,
          players: {
            [alice.id]: {},
            [bob.id]: {},
          },
        }),
      )
    })

    describe('.switchCharacter()', () => {
      beforeEach(async () => {
        await service.addPlayer(game.id, alice.id)
        const g = await service.addPlayer(game.id, bob.id)
        expect(g).toEqual(
          expect.objectContaining({
            players: {
              [alice.id]: {},
              [bob.id]: {},
            },
          }),
        )
      })

      it('should set the initial character for a player', async () => {
        const update1 = await service.switchCharacter(
          game.id,
          alice.id,
          null,
          'angus',
        )
        const update2 = await service.switchCharacter(
          game.id,
          bob.id,
          null,
          'bianca',
        )

        expect(update1).toEqual(
          expect.objectContaining({
            players: {
              [alice.id]: {
                characterId: 'angus',
              },
              [bob.id]: {},
            },
          }),
        )

        expect(update2).toEqual(
          expect.objectContaining({
            players: {
              [alice.id]: {
                characterId: 'angus',
              },
              [bob.id]: {
                characterId: 'bianca',
              },
            },
          }),
        )
      })

      it("should replace a player's current character with another", async () => {
        const update1 = await service.switchCharacter(
          game.id,
          alice.id,
          null,
          'angus',
        )
        const update2 = await service.switchCharacter(
          game.id,
          alice.id,
          null,
          'bianca',
        )

        expect(update1).toEqual(
          expect.objectContaining({
            players: {
              [alice.id]: {
                characterId: 'angus',
              },
              [bob.id]: {},
            },
          }),
        )
        expect(update2).toEqual(
          expect.objectContaining({
            players: {
              [alice.id]: {
                characterId: 'bianca',
              },
              [bob.id]: {},
            },
          }),
        )
      })

      it('should fail if a character is in use', async () => {
        const update1 = await service.switchCharacter(
          game.id,
          alice.id,
          null,
          'angus',
        )
        const update2 = await service.switchCharacter(
          game.id,
          bob.id,
          null,
          'angus',
        )
        const update3 = await service.switchCharacter(
          game.id,
          bob.id,
          null,
          'bianca',
        )
        const update4 = await service.switchCharacter(
          game.id,
          alice.id,
          'angus',
          'bianca',
        )

        expect(update1).toEqual(
          expect.objectContaining({
            players: {
              [alice.id]: {
                characterId: 'angus',
              },
              [bob.id]: {},
            },
          }),
        )
        expect(update2).toEqual('failure')
        expect(update3).toEqual(
          expect.objectContaining({
            players: {
              [alice.id]: {
                characterId: 'angus',
              },
              [bob.id]: {
                characterId: 'bianca',
              },
            },
          }),
        )
        expect(update4).toEqual('failure')
      })

      it('should fail if attempting to switch from the wrong character', async () => {
        const update1 = await service.switchCharacter(
          game.id,
          alice.id,
          null,
          'angus',
        )
        const update2 = await service.switchCharacter(
          game.id,
          bob.id,
          'angus',
          'bianca',
        )
        const update3 = await service.switchCharacter(
          game.id,
          bob.id,
          'bruce',
          'bianca',
        )

        expect(update1).toEqual(
          expect.objectContaining({
            players: {
              [alice.id]: {
                characterId: 'angus',
              },
              [bob.id]: {},
            },
          }),
        )
        expect(update2).toEqual('failure')
        expect(update3).toEqual('failure')
      })
    })

    it('.tick() should increment the clock', async () => {
      const updatedGame = await service.tick(game.id)

      expect(updatedGame).toEqual({ ...game, clock: game.clock + 1 })
    })
  })

  describe('when a game is ongoing', () => {
    let game: PartialGameState
    let alice: User
    let bob: User

    beforeEach(async () => {
      game = await service.createGame('My new game', ['alpha', 'beta', 'gamma'])
      alice = await users.createUser('Alice', {
        username: 'alice',
        password: 'password',
      })
      bob = await users.createUser('Bob', {
        username: 'bob',
        password: 'password',
      })

      await service.addPlayer(game.id, alice.id)
      await service.addPlayer(game.id, bob.id)
      await service.switchCharacter(game.id, alice.id, null, 'angus')
      await service.switchCharacter(game.id, bob.id, null, 'bianca')
      const start = await service.startGame(game.id)
      if (start === 'failure') {
        throw new Error('Test failed')
      }
      game = start
    })

    it('.switchCharacter() should fail', async () => {
      const update = await service.switchCharacter(
        game.id,
        alice.id,
        'angus',
        'angela',
      )
      expect(update).toEqual('failure')
    })

    describe('.addCard()', () => {
      it("should add a card to a character's inventory", async () => {
        const update = await service.addCard(game.id, 'angus', 'card-1')
        expect(update).toEqual(
          expect.objectContaining({
            clock: game.clock + 1,
            characters: {
              angus: expect.objectContaining({
                cardIds: ['card-1'],
              }),
              bianca: expect.objectContaining({
                cardIds: [],
              }),
            },
          }),
        )
      })

      it('should add cards to inventories', async () => {
        await service.addCard(game.id, 'angus', 'card-1')
        await service.addCard(game.id, 'angus', 'card-2')
        await service.addCard(game.id, 'angus', 'card-3')
        await service.addCard(game.id, 'bianca', 'card-4')
        const update = await service.addCard(game.id, 'bianca', 'card-5')

        expect(update).toEqual(
          expect.objectContaining({
            characters: {
              angus: expect.objectContaining({
                cardIds: expect.arrayContaining(['card-1', 'card-2', 'card-3']),
              }),
              bianca: expect.objectContaining({
                cardIds: expect.arrayContaining(['card-4', 'card-5']),
              }),
            },
          }),
        )
      })

      it("should fail if the card is already in somebody' inventory", async () => {
        await service.addCard(game.id, 'angus', 'card-1')
        const update = await service.addCard(game.id, 'bianca', 'card-1')
        expect(update).toEqual('failure')
      })
    })

    describe('.moveCard()', () => {
      it("should move a card from one to another character's inventory", async () => {
        await service.addCard(game.id, 'angus', 'card-1')
        const update = await service.moveCard(
          game.id,
          'angus',
          'bianca',
          'card-1',
        )
        expect(update).toEqual(
          expect.objectContaining({
            clock: game.clock + 2,
            characters: {
              angus: expect.objectContaining({
                cardIds: [],
              }),
              bianca: expect.objectContaining({
                cardIds: ['card-1'],
              }),
            },
          }),
        )
      })
    })

    describe('.removeCard()', () => {
      beforeEach(async () => {
        await service.addCard(game.id, 'angus', 'card-1')
        await service.addCard(game.id, 'angus', 'card-2')
        await service.addCard(game.id, 'angus', 'card-3')
        await service.addCard(game.id, 'bianca', 'card-4')
        const update = await service.addCard(game.id, 'bianca', 'card-5')
        if (update !== 'failure') {
          game = update
        }
      })

      it("should remove a card from a character's inventory", async () => {
        const update = await service.removeCard(game.id, 'card-2')
        expect(update).toEqual(
          expect.objectContaining({
            clock: game.clock + 1,
            characters: {
              angus: expect.objectContaining({
                cardIds: expect.arrayContaining(['card-1', 'card-3']),
              }),
              bianca: expect.objectContaining({
                cardIds: expect.arrayContaining(['card-4', 'card-5']),
              }),
            },
          }),
        )
      })

      it("should remove many cards from a character's inventory", async () => {
        const update1 = await service.removeCard(game.id, 'card-4')
        const update2 = await service.removeCard(game.id, 'card-5')
        expect(update1).toEqual(
          expect.objectContaining({
            characters: {
              angus: expect.objectContaining({
                cardIds: expect.arrayContaining(['card-1', 'card-2', 'card-3']),
              }),
              bianca: expect.objectContaining({
                cardIds: ['card-5'],
              }),
            },
          }),
        )
        expect(update2).toEqual(
          expect.objectContaining({
            characters: {
              angus: expect.objectContaining({
                cardIds: expect.arrayContaining(['card-1', 'card-2', 'card-3']),
              }),
              bianca: expect.objectContaining({
                cardIds: [],
              }),
            },
          }),
        )
      })

      it('should fail if the card is not in play', async () => {
        const update = await service.removeCard(game.id, 'unknown-card')
        expect(update).toEqual('failure')
      })
    })

    describe('.addClues()', () => {
      it('should add clues to characters', async () => {
        const update = await service.addClues(game.id, 'angus', 1)

        expect(update).toEqual(
          expect.objectContaining({
            clock: game.clock + 1,
            characters: expect.objectContaining({
              angus: expect.objectContaining({
                clues: game.characters['angus'].clues + 1,
              }),
            }),
          }),
        )
      })

      it('should remove clues from characters', async () => {
        const update = await service.addClues(game.id, 'angus', -1)

        expect(update).toEqual(
          expect.objectContaining({
            clock: game.clock + 1,
            characters: expect.objectContaining({
              angus: expect.objectContaining({
                clues: game.characters['angus'].clues - 1,
              }),
            }),
          }),
        )
      })
    })

    describe('.setCardFacing()', () => {
      it('should flip cards face-down', async () => {
        const update = await service.setCardFacing(
          game.id,
          'my-card',
          'face-down',
        )

        expect(update).toEqual(
          expect.objectContaining({
            clock: game.clock + 1,
            flippedCardIds: ['my-card'],
          }),
        )
      })

      it('should flip down-facing cards up', async () => {
        await service.setCardFacing(game.id, 'my-card', 'face-down')
        const update = await service.setCardFacing(
          game.id,
          'my-card',
          'face-up',
        )

        expect(update).toEqual(
          expect.objectContaining({
            clock: game.clock + 2,
            flippedCardIds: [],
          }),
        )
      })

      it('should fail if a card is not in the opposite phase', async () => {
        await service.setCardFacing(game.id, 'my-card', 'face-down')
        const update1 = await service.setCardFacing(
          game.id,
          'my-card',
          'face-down',
        )
        const update2 = await service.setCardFacing(
          game.id,
          'my-other-card',
          'face-up',
        )

        expect(update1).toEqual('failure')
        expect(update2).toEqual('failure')
      })
    })

    it('.tick() should increment the clock', async () => {
      const updatedGame = await service.tick(game.id)

      expect(updatedGame).toEqual({ ...game, clock: game.clock + 1 })
    })
  })
})
