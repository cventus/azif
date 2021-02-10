import { defineActions } from './lib'
import { Action } from './actions'
import { Reducer } from 'redux'
import { GameEvent } from '../../game/protocol'

export const messages = defineActions('messages', {})

export type DatedMessage = GameEvent & { date: Date }

export interface MessageState {
  gameEvents: DatedMessage[]
}

const defaultState: MessageState = {
  gameEvents: [],
}

const reducer: Reducer<MessageState, Action> = (
  state = defaultState,
  action = { type: undefined },
) => {
  switch (action.type) {
    case 'connection/serverMessage': {
      const serverMessage = action.message
      if (serverMessage.type === 'game-event') {
        const gameEvent: DatedMessage = {
          ...serverMessage.event,
          date: new Date(serverMessage.event.epoch),
        }
        return {
          ...state,
          gameEvents: [...state.gameEvents, gameEvent],
        }
      } else {
        return state
      }
    }

    default: {
      return state
    }
  }
}

export default reducer
