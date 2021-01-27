import { Reducer } from 'redux'
import {
  CharacterCard,
  HorrorCard,
  DamageCard,
  ItemCard,
  ConditionCard,
} from '../../game/rules'
import { Action } from './actions'
import { defineActions } from './lib'

export const game = defineActions('game', {
  startNewGame: (players: Player[]) => ({ players }),
})

interface Player {
  id: string
  character: CharacterCard
  horrors: HorrorCard[]
  damages: DamageCard[]
  clues: number
  inventory: ItemCard[]
  conditions: ConditionCard[]
}

export interface GameState {
  players: Player[]
}

const defaultState: GameState = {
  players: [],
}

const reducer: Reducer<GameState, Action> = (
  state = defaultState,
  action = { type: undefined },
) => {
  switch (action.type) {
    case 'game/startNewGame':
      return {
        players: action.players,
      }

    default:
      return state
  }
}

export default reducer
