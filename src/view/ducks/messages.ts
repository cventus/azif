import { defineActions } from './lib'
import { Action } from './actions'
import { Reducer } from 'redux'
import { GameEvent } from '../../game/resources'

export const messages = defineActions('messages', {})

export type DatedMessage = GameEvent & { date: Date }

export type MessageState = Record<string, DatedMessage[]>

const defaultState: MessageState = {}

const reducer: Reducer<MessageState, Action> = (
  state = defaultState,
  action = { type: undefined },
) => {
  switch (action.type) {
    case 'connection/notification': {
      const serverMessage = action.notification
      if (serverMessage.type === 'game-event') {
        const gameId = action.notification.game.id
        const updatedEvents = [...(state[gameId] || [])]
        const gameEvent: DatedMessage = {
          ...serverMessage.event,
          date: new Date(serverMessage.event.epoch),
        }
        updatedEvents[serverMessage.event.clock] = gameEvent
        return {
          ...state,
          [gameId]: updatedEvents,
        }
      } else {
        return state
      }
    }

    case 'connection/response': {
      if (action.status !== 'ok') {
        return state
      }
      const { response } = action
      if (response.type !== 'get' || response.resource !== 'events') {
        return state
      }

      const { gameId } = response

        const updatedEvents = [...(state[gameId] || [])]
        response.events.forEach((e) => {
          updatedEvents[e.clock] = {
            ...e,
            date: new Date(e.epoch),
          }
        })
        return {
          ...state,
          [gameId]: updatedEvents,
        }
    }

    default: {
      return state
    }
  }
}

export default reducer
