import { Reducer } from 'redux'
import {
  Card,
  CharacterCard,
  ConditionCard,
  isCharacterCard,
  isConditionCard,
} from '../../game/rules'
import { Action } from './actions'
import { defineActions } from './lib'

export const content = defineActions('content', {
  defineCard: (card: Card) => ({ card }),
})

export interface ContentState {
  cards: Record<string, Card>
  characters: Record<string, CharacterCard>
  conditions: Record<string, ConditionCard>
}

const defaultState: ContentState = {
  cards: {},
  characters: {},
  conditions: {},
}

const reducer: Reducer<ContentState, Action> = (
  state = defaultState,
  action: Action = { type: undefined },
) => {
  switch (action.type) {
    case 'content/defineCard': {
      const { card } = action
      let { cards, characters, conditions } = state
      if (isCharacterCard(card)) {
        characters = { ...characters, [card.id]: card }
      } else if (isConditionCard(card)) {
        conditions = { ...conditions, [card.id]: card }
      }
      cards = { ...cards, [card.id]: card }
      return { cards, conditions, characters }
    }

    default:
      return state
  }
}

export default reducer
