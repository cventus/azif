import { Reducer } from 'redux'
import {
  ClientRequest,
  ServerGameNotification,
  ServerResponse,
} from '../../game/protocol'
import { ConnectionStatus, SendOptions } from '../ClientSocket'
import { Action } from './actions'
import { defineActions } from './lib'

interface OkResponse {
  request: ClientRequest
  status: 'ok'
  response: ServerResponse
}

interface ResponseTimeout {
  request: ClientRequest
  status: 'timeout'
}

export const connection = defineActions('connection', {
  setStatus: (status: ConnectionStatus) => ({ status }),
  request: (request: ClientRequest, options?: SendOptions) => ({
    request,
    options,
  }),
  response: (res: OkResponse | ResponseTimeout) => ({ ...res }),
  notification: (notification: ServerGameNotification) => ({ notification }),
  connect: () => ({
    /* no content */
  }),
})

export const getGame = (gameId: string, options?: SendOptions): Action => ({
  type: 'connection/request',
  options,
  request: {
    type: 'get',
    resource: 'game',
    gameId,
  }
})

export const getSession = (options?: SendOptions): Action => ({
  type: 'connection/request',
  options,
  request: {
    type: 'get',
    resource: 'session',
  }
})

export const getContentSet = (contentSetId: string, options?: SendOptions): Action => ({
  type: 'connection/request',
  options,
  request: {
    type: 'get',
    resource: 'content-set',
    contentSetId,
  }
})

export const getContentList = (options?: SendOptions): Action => ({
  type: 'connection/request',
  options,
  request: {
    type: 'get',
    resource: 'content-list',
  }
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
