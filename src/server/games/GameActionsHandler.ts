import { roll } from '../../game/dice'
import { GameAction } from '../../game/actions'
import { ContentSet, GameEvent } from '../../game/resources'
import { PlayerAction } from '../../game/protocol'
import { inject } from '../../inject'
import { EventsService } from '../events/EventsService'
import { GamesService, PartialGameState } from './GamesService'
import { ContentService } from '../content/ContentService'
import { Card, ConditionCard } from '../../game/rules'

const MAX_CHAT = 1000
const MAX_DICE = 16

interface GameUpdated {
  type: 'update'
  state: PartialGameState
  event: GameEvent
}

interface Failure {
  type: 'failure'
}

type ActionResult = GameUpdated | Failure

export type GameActionsService = (
  userId: string,
  gameId: string,
  action: PlayerAction,
) => Promise<ActionResult>

const Failure: Failure = { type: 'failure' }

export const GameActionsHandler = inject(
  { GamesService, EventsService, ContentService },
  ({
    GamesService: states,
    EventsService: events,
    ContentService: contents,
  }): GameActionsService => async (userId, gameId, action) => {
    const writeEvent = async (
      action: GameAction,
      statePromise: Promise<PartialGameState | 'failure'>,
    ): Promise<GameUpdated | Failure> => {
      const state = await statePromise
      if (state === 'failure') {
        return Failure
      }
      const event = {
        gameId,
        action,
        epoch,
        playerId: userId,
        clock: state.clock,
      }
      await events.write(event)
      return { type: 'update', state, event }
    }

    const epoch = new Date().valueOf()
    switch (action.type) {
      case 'flip-card':
        return writeEvent(
          action,
          states.setCardFacing(gameId, action.card, action.facing),
        )

      case 'chat':
        if (action.text.length > MAX_CHAT) {
          return Failure
        }
        return writeEvent(action, states.tick(gameId))

      case 'dice': {
        if (action.roll.length > MAX_DICE) {
          return Failure
        }
        const dice = action.roll.map((value) => {
          if (value === null) {
            return roll()
          } else {
            return value
          }
        })
        return writeEvent({ type: 'dice', dice }, states.tick(gameId))
      }

      case 'drop-card':
      case 'discard-card':
        return writeEvent(action, states.removeCard(gameId, action.card))

      case 'draw-card':
        return writeEvent(
          action,
          states.addCard(gameId, action.character, action.card),
        )

      case 'trade-card': {
        const { fromCharacter, toCharacter, card } = action
        return writeEvent(
          action,
          states.moveCard(gameId, fromCharacter, toCharacter, card),
        )
      }

      case 'set-condition': {
        const game = await states.getGame(gameId)
        if (!game) {
          // Game not found
          return Failure
        }
        const character = game.characters[action.character]
        if (!character) {
          // Invalid character ID
          return Failure
        }

        const characterCards = character.cardIds
          .map((id) => sets.find((set) => id in set.cards)?.cards[id])
          .filter((c): c is Card => Boolean(c))

        if (
          characterCards.find(
            (c) => c.type === 'condition' && c.condition === action.condition,
          )
        ) {
          // Character already has card
          return Failure
        }

        const sets = (
          await Promise.all(game.contentSetIds.map(contents.get))
        ).filter((c): c is ContentSet => Boolean(c))

        const usedCards = Object.values(game.characters).reduce<string[]>(
          (acc, { cardIds }) => [...acc, ...cardIds],
          [],
        )

        const conditionCards = sets
          .reduce<ConditionCard[]>((list, set) => {
            const cards: ConditionCard[] = []
            for (const cardId in cards) {
              const card = cards[cardId]
              if (
                card.type === 'condition' &&
                card.condition === action.condition
              ) {
                cards.push(card)
              }
            }
            return [...list, ...cards]
          }, [])
          .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

        const availableConditionCard = conditionCards.filter(
          ({ id }) => !usedCards.includes(id),
        )

        const [newCard] = availableConditionCard

        if (!newCard) {
          return Failure
        }

        // This is susceptible to race-conditions: a player might get the same
        // condition twice.
        return writeEvent(
          action,
          states.addCard(gameId, action.character, newCard.id),
        )
      }

      case 'remove-condition': {
        throw new Error()
      }
    }
  },
)
