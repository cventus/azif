import { inject } from '../../inject'
import { DocumentClient, DynamoDbSet, Put, Update } from '../ddb/DocumentClient'
import { TableConfig } from '../ddb/TableConfig'
import { Logger } from '../logger'

import {
  GamesService,
  GameState,
  PlayerState,
} from './GamesService'
import {
  Dictionary,
  Literal,
  Optional,
  StructureType,
  Union,
  validate,
} from '../../structure'
import { UsersTableActions } from '../users/DDBUsersService'
import {
  expressionNames,
  isFailedConditionalCheck,
  isTransactionCanceled,
} from '../ddb'
import { generateId } from '../generateId'
import DynamoDB from 'aws-sdk/clients/dynamodb'
import { CharacterState } from '../../game/resources'

const MaxPlayers = 5
const DefaultClues = 3

const GameId = String

const Phases = {
  Starting: 'starting',
  Ongoing: 'ongoing',
  Over: 'over',
} as const

const GameItem = {
  id: GameId,
  name: String,
  phase: Union(Literal('starting'), Literal('ongoing'), Literal('over')),
  sets: {
    values: Array(String),
  },
  clock: Number,
  createdAt: Number,
  // Map from userId to characterId
  players: Dictionary(Union(String, Literal(null))),
  // Map from characterId to clue count
  clues: Dictionary(Number),
  // Map from cardId to characterId that holds it
  cards: Dictionary(String),
  flips: Optional({
    values: Array(String),
  }),
}
type GameItem = StructureType<typeof GameItem>
const isGameItem = validate(GameItem)

const itemToGameState = (item: GameItem): GameState => {
  const { cards, clues } = item

  const cardsByCharacter = Object.keys(cards).reduce((result, cardId) => {
    const characterId = cards[cardId]
    const charCards = [...(result[characterId] || []), cardId]
    return { ...result, [characterId]: charCards }
  }, {} as Record<string, string[]>)

  const characters = Object.keys(clues).reduce((result, characterId) => {
    return {
      ...result,
      [characterId]: {
        cardIds: cardsByCharacter[characterId] || [],
        clues: clues[characterId],
      } as CharacterState,
    }
  }, {} as Record<string, CharacterState>)

  const players = Object.keys(item.players).reduce((result, playerId) => {
    const characterId = item.players[playerId]
    const playerState: PlayerState = characterId ? { characterId } : {}
    return {
      ...result,
      [playerId]: playerState,
    }
  }, {} as Record<string, PlayerState>)

  return {
    id: item.id,
    name: item.name,
    phase: item.phase,
    createdAt: item.createdAt,
    contentSetIds: item.sets.values,
    clock: item.clock,
    flippedCardIds: item.flips ? item.flips.values : [],
    characters,
    players,
  }
}

const maybeToGameState = (
  item: DynamoDB.DocumentClient.AttributeMap | undefined,
): GameState | undefined => {
  if (isGameItem(item)) {
    return itemToGameState(item)
  }
}

const toGameState = (
  item: DynamoDB.DocumentClient.AttributeMap | undefined,
): GameState => {
  if (!isGameItem(item)) {
    throw new Error('Not a valid GameItem')
  }
  return itemToGameState(item)
}

const gameKey = (gameId: string) => ({ id: gameId })
const and = (...conditions: string[]): string => conditions.join(' and ')

export const GameTableActions = (TableName: string) => ({
  createGame(gameId: string, name: string, sets: DynamoDbSet): Put {
    return {
      TableName,
      Item: {
        id: gameId,
        name,
        phase: Phases.Starting,
        sets,
        clock: 0,
        createdAt: new Date().valueOf(),
        players: {},
        clues: {},
        cards: {},
      },
      ConditionExpression: 'attribute_not_exists(id)', // very unlikely ID clash
    }
  },
  startGame(gameId: string): Update {
    return {
      TableName,
      Key: gameKey(gameId),
      UpdateExpression: 'SET #phase = :ongoing ADD #clock :1',
      ExpressionAttributeNames: expressionNames('id', 'phase', 'clock'),
      ExpressionAttributeValues: {
        ':1': 1,
        ':starting': Phases.Starting,
        ':ongoing': Phases.Ongoing,
      },
      ConditionExpression: and('attribute_exists(#id)', '#phase = :starting'),
    }
  },
  endGame(gameId: string): Update {
    return {
      TableName,
      Key: gameKey(gameId),
      UpdateExpression: 'SET #phase = :over ADD #clock :1',
      ExpressionAttributeNames: expressionNames('id', 'phase', 'clock'),
      ExpressionAttributeValues: { ':1': 1, ':over': Phases.Over },
      ConditionExpression: and('attribute_exists(#id)', '#phase <> :over'),
    }
  },
  addCard(gameId: string, characterId: string, cardId: string): Update {
    return {
      TableName,
      Key: gameKey(gameId),
      UpdateExpression: 'SET #cards.#card = :char ADD #clock :1',
      ExpressionAttributeNames: {
        '#card': cardId,
        ...expressionNames('id', 'phase', 'cards', 'clock'),
      },
      ExpressionAttributeValues: {
        ':char': characterId,
        ':ongoing': Phases.Ongoing,
        ':1': 1,
      },
      ConditionExpression: and(
        'attribute_exists(#id)',
        'attribute_not_exists(#cards.#card)',
        '#phase = :ongoing',
      ),
    }
  },
  swapCard(
    gameId: string,
    fromCharacterId: string,
    toCharacterId: string,
    cardId: string,
  ): Update {
    return {
      TableName,
      Key: gameKey(gameId),
      UpdateExpression: 'SET #cards.#card = :to ADD #clock :1',
      ExpressionAttributeNames: {
        '#card': cardId,
        ...expressionNames('id', 'phase', 'cards', 'clock'),
      },
      ExpressionAttributeValues: {
        ':to': toCharacterId,
        ':from': fromCharacterId,
        ':ongoing': Phases.Ongoing,
        ':1': 1,
      },
      ConditionExpression: and(
        'attribute_exists(#id)',
        '#phase = :ongoing',
        'attribute_exists(#cards.#card)',
        '#cards.#card = :from',
      ),
    }
  },
  removeCard(gameId: string, cardId: string): Update {
    return {
      TableName,
      Key: gameKey(gameId),
      UpdateExpression: 'REMOVE #cards.#card ADD #clock :1',
      ExpressionAttributeNames: {
        '#card': cardId,
        ...expressionNames('id', 'phase', 'cards', 'clock'),
      },
      ExpressionAttributeValues: { ':ongoing': Phases.Ongoing, ':1': 1 },
      ConditionExpression: and(
        'attribute_exists(#id)',
        'attribute_exists(#cards.#card)',
        '#phase = :ongoing',
      ),
    }
  },
  updateFlippedCardIds(
    gameId: string,
    action: 'add' | 'remove',
    cardId: string,
    cardIdSet: DynamoDbSet,
  ): Update {
    return {
      TableName,
      Key: gameKey(gameId),
      UpdateExpression:
        action === 'add'
          ? 'ADD #flips :c, #clock :1'
          : 'DELETE #flips :c ADD #clock :1',
      ExpressionAttributeNames: expressionNames(
        'id',
        'flips',
        'phase',
        'clock',
      ),
      ExpressionAttributeValues: {
        ':c': cardIdSet,
        ':cid': cardId,
        ':ongoing': Phases.Ongoing,
        ':1': 1,
      },
      ConditionExpression: and(
        'attribute_exists(#id)',
        '#phase = :ongoing',
        `${action === 'add' ? 'NOT ' : ''} contains(#flips, :cid)`,
      ),
    }
  },
  addClues(gameId: string, characterId: string, delta: number): Update {
    if (!Number.isInteger(delta)) {
      throw new Error(`clues must be integer, got ${delta}`)
    }
    return {
      TableName,
      Key: gameKey(gameId),
      UpdateExpression: 'SET #clues.#c = #clues.#c + :c ADD #clock :1',
      ExpressionAttributeNames: {
        '#c': characterId,
        ...expressionNames('id', 'clues', 'phase', 'clock'),
      },
      ExpressionAttributeValues: {
        ':c': delta,
        ':ongoing': Phases.Ongoing,
        ':1': 1,
      },
      ConditionExpression: and('attribute_exists(#id)', '#phase = :ongoing'),
    }
  },
  addPlayer(gameId: string, userId: string, clock: number): Update {
    return {
      TableName,
      Key: gameKey(gameId),
      UpdateExpression: 'SET #players.#p = :p, #clock = :clock',
      ExpressionAttributeNames: {
        '#p': userId,
        ...expressionNames('id', 'players', 'phase', 'clock'),
      },
      ExpressionAttributeValues: {
        ':p': null,
        ':clock': clock + 1,
        ':oldclock': clock,
        ':max': MaxPlayers,
        ':over': Phases.Over,
      },
      ConditionExpression: and(
        'attribute_exists(#id)',
        '#phase <> :over',
        'size(#players) < :max',
        '#clock = :oldclock',
        'attribute_not_exists(#players.#p)',
      ),
    }
  },
  removePlayer(gameId: string, userId: string, clock: number): Update {
    return {
      TableName,
      Key: gameKey(gameId),
      UpdateExpression: 'REMOVE #players.#p SET #clock = :newclock',
      ExpressionAttributeNames: {
        '#p': userId,
        ...expressionNames('id', 'clock', 'players'),
      },
      ExpressionAttributeValues: { ':oldclock': clock, ':newclock': clock + 1 },
      ConditionExpression: and(
        'attribute_exists(#id)',
        'attribute_exists(#players.#p)',
        '#clock = :oldclock',
      ),
    }
  },
  changeCharacter(
    gameId: string,
    userId: string,
    characterId: string,
    previousCharacterId: string | null,
  ): Update {
    // Ensure that there's a one-to-one mapping between characters and players
    if (previousCharacterId) {
      // Switch from one character to another
      return {
        TableName,
        Key: gameKey(gameId),
        UpdateExpression:
          'SET #players.#p = :to, #clues.#to = :c REMOVE #clues.#from ADD #clock :1',
        ExpressionAttributeNames: {
          '#p': userId,
          '#from': previousCharacterId,
          '#to': characterId,
          ...expressionNames('id', 'clock', 'players', 'clues', 'phase'),
        },
        ExpressionAttributeValues: {
          ':c': DefaultClues,
          ':from': previousCharacterId,
          ':to': characterId,
          ':starting': Phases.Starting,
          ':1': 1,
        },
        ConditionExpression: and(
          'attribute_exists(#id)',
          '#phase = :starting', // The game hasn't started yet
          '#players.#p = :from', // We're switching away from the right character
          'attribute_exists(#players.#p)', // The player is part of the game
          'attribute_not_exists(#clues.#to)', // The character hasn't been chosen yet
        ),
      }
    } else {
      // First character selection
      return {
        TableName,
        Key: gameKey(gameId),
        UpdateExpression:
          'SET #players.#p = :to, #clues.#to = :c ADD #clock :1',
        ExpressionAttributeNames: {
          '#p': userId,
          '#to': characterId,
          ...expressionNames('id', 'clock', 'players', 'clues', 'phase'),
        },
        ExpressionAttributeValues: {
          ':c': DefaultClues,
          ':to': characterId,
          ':starting': Phases.Starting,
          ':1': 1,
        },
        ConditionExpression: and(
          'attribute_exists(#id)',
          '#phase = :starting', // The game hasn't started yet
          'attribute_exists(#players.#p)', // The player is part of the game
          'attribute_not_exists(#clues.#to)', // The character hasn't been chosen by somebody else yet
        ),
      }
    }
  },
})

export const DDBGamesService = inject(
  { DocumentClient, TableConfig, Logger },
  ({ DocumentClient: client, TableConfig, Logger: logger }) => {
    const actions = GameTableActions(TableConfig.tables.games)
    const userActions = UsersTableActions(TableConfig.tables.users)

    const service: GamesService = {
      async createGame(name: string, contentSetIds: string[]) {
        try {
          const id = `game:${await generateId()}`
          const action = actions.createGame(
            id,
            name,
            client.createSet(contentSetIds),
          )
          await client.put(action).promise()
          return toGameState(action.Item)
        } catch (err: unknown) {
          logger.error({ err }, 'failed to create game')
          throw err
        }
      },
      async startGame(gameId) {
        try {
          const { Attributes: item } = await client
            .update({
              ...actions.startGame(gameId),
              ReturnValues: 'ALL_NEW',
            })
            .promise()
          return toGameState(item)
        } catch (err: unknown) {
          if (isFailedConditionalCheck(err)) {
            return 'failure'
          }
          logger.error({ err, gameId }, 'failed to start game')
          throw err
        }
      },
      async endGame(gameId) {
        try {
          const { Attributes: item } = await client
            .update({
              ...actions.endGame(gameId),
              ReturnValues: 'ALL_NEW',
            })
            .promise()
          return toGameState(item)
        } catch (err: unknown) {
          logger.error({ err, gameId }, 'failed to end game')
          return 'failure'
        }
      },
      async getGame(gameId) {
        const { Item: item } = await client
          .get({
            TableName: TableConfig.tables.games,
            Key: { id: gameId },
            ConsistentRead: true,
          })
          .promise()
        return maybeToGameState(item)
      },
      async addPlayer(gameId, playerId) {
        const addGameToPlayer = {
          ...userActions.addGames(playerId, client.createSet([gameId])),
          ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
        }

        const MAX_RETRIES = 2
        let retries: number = 0
        let shouldRetry: boolean = false

        do
          try {
            const game = await service.getGame(gameId)
            if (!game) {
              return 'failure' // not found
            }
            const addUserToGame = {
              ...actions.addPlayer(gameId, playerId, game.clock),
              ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
            }

            // Update both items transactionally so we don't end up with
            // inconsitent state. Transactions only return values only failed
            // condition checks, thus we read once and make an optimistic update.
            await client
              .transactWrite({
                TransactItems: [
                  { Update: addUserToGame },
                  { Update: addGameToPlayer },
                ],
              })
              .promise()

            return {
              ...game,
              clock: game.clock + 1,
              players: {
                ...game.players,

                [playerId]: {},
              },
            }
          } catch (err: unknown) {
            if (isTransactionCanceled(err)) {
              shouldRetry = retries < MAX_RETRIES
              retries += 1
            } else if (isFailedConditionalCheck(err)) {
              // Did we only get the clock wrong?
              throw err
              break
            } else {
              throw err
            }
          }
        while (shouldRetry)
        return 'failure'
      },
      async removePlayer(gameId, playerId) {
        const removeGameFromUser = {
          ...userActions.removeGames(playerId, client.createSet([gameId])),
          ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
        }

        const MAX_RETRIES = 2
        let retries: number = 0
        let shouldRetry: boolean = false

        do
          try {
            const game = await service.getGame(gameId)
            if (!game) {
              return 'failure' // not found
            }
            await new Promise((res) =>
              setTimeout(res, 1 + Math.floor(Math.random() * 10)),
            )
            const removeUserFromGame = {
              ...actions.removePlayer(gameId, playerId, game.clock),
              ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
            }
            await client
              .transactWrite({
                TransactItems: [
                  { Update: removeUserFromGame },
                  { Update: removeGameFromUser },
                ],
              })
              .promise()
            const { [playerId]: removedPlayer, ...players } = game.players
            return {
              ...game,
              clock: game.clock + 1,
              players,
            }
          } catch (err: unknown) {
            if (isTransactionCanceled(err)) {
              shouldRetry = retries < MAX_RETRIES
              retries += 1
            } else if (isFailedConditionalCheck(err)) {
              throw err
              //break
            } else {
              throw err
            }
          }
        while (shouldRetry)
        return 'failure'
      },
      async switchCharacter(gameId, playerId, fromCharacterId, toCharacterId) {
        try {
          const { Attributes: item } = await client
            .update({
              ...actions.changeCharacter(
                gameId,
                playerId,
                toCharacterId,
                fromCharacterId,
              ),
              ReturnValues: 'ALL_NEW',
            })
            .promise()
          return toGameState(item)
        } catch (err: unknown) {
          if (isFailedConditionalCheck(err)) {
            return 'failure'
          }
          logger.error({ err, gameId }, 'failed to switch character')
          throw err
        }
      },
      async addCard(gameId, characterId, cardId) {
        try {
          const { Attributes: item } = await client
            .update({
              ...actions.addCard(gameId, characterId, cardId),
              ReturnValues: 'ALL_NEW',
            })
            .promise()
          return toGameState(item)
        } catch (err: unknown) {
          if (!isFailedConditionalCheck(err)) {
            logger.error({ err, gameId }, 'failed to add cards')
          }
          return 'failure'
        }
      },
      async moveCard(gameId, fromCharacterId, toCharacterId, cardId) {
        try {
          const { Attributes: item } = await client
            .update({
              ...actions.swapCard(
                gameId,
                fromCharacterId,
                toCharacterId,
                cardId,
              ),
              ReturnValues: 'ALL_NEW',
            })
            .promise()
          return toGameState(item)
        } catch (err: unknown) {
          if (!isFailedConditionalCheck(err)) {
            logger.error({ err, gameId }, 'failed to move cards')
          }
          return 'failure'
        }
      },
      async removeCard(gameId, cardId) {
        try {
          const { Attributes: item } = await client
            .update({
              ...actions.removeCard(gameId, cardId),
              ReturnValues: 'ALL_NEW',
            })
            .promise()
          return toGameState(item)
        } catch (err: unknown) {
          if (!isFailedConditionalCheck(err)) {
            logger.error({ err, gameId }, 'failed to remove cards')
          }
          return 'failure'
        }
      },
      async addClues(gameId, characterId, clues) {
        try {
          const { Attributes: item } = await client
            .update({
              ...actions.addClues(gameId, characterId, clues),
              ReturnValues: 'ALL_NEW',
            })
            .promise()
          return toGameState(item)
        } catch (err: unknown) {
          logger.error({ err, gameId }, 'failed to add clues')
          return 'failure'
        }
      },
      async setCardFacing(gameId, cardId, facing) {
        try {
          const action = facing === 'face-up' ? 'remove' : 'add'
          const { Attributes: item } = await client
            .update({
              ...actions.updateFlippedCardIds(
                gameId,
                action,
                cardId,
                client.createSet([cardId]),
              ),
              ReturnValues: 'ALL_NEW',
            })
            .promise()
          return toGameState(item)
        } catch (err: unknown) {
          if (!isFailedConditionalCheck(err)) {
            logger.error({ err, gameId }, `failed to set card face ${facing}`)
          }
          return 'failure'
        }
      },
    }

    return service
  },
)
