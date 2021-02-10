import { Reducer } from 'redux'
import { ClientMessage, ServerMessage } from '../../game/protocol'
import { ConnectionStatus } from '../ClientSocket'
import { Action } from './actions'
import { defineActions } from './lib'

export const connection = defineActions('connection', {
  setStatus: (status: ConnectionStatus) => ({ status }),
  clientMessage: (message: ClientMessage) => ({ message }),
  serverMessage: (message: ServerMessage) => ({ message }),
  login: () => ({
    /* no content */
  }),
  connect: () => ({
    /* no content */
  }),
  logout: () => ({
    /* no content */
  }),
})

export interface ConnectionState {
  status: ConnectionStatus
}

const defaultState: ConnectionState = {
  status: 'disconnected',
}

const reducer: Reducer<ConnectionState, Action> = (
  state = defaultState,
  action = { type: undefined },
) => {
  switch (action.type) {
    case 'connection/setStatus':
      return {
        ...state,
        status: action.status,
      }

    default:
      return state
  }
}

export default reducer
