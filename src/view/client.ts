import React from 'react'
import { Middleware } from 'redux'
import { ClientSocket, RequestTimeoutError } from './ClientSocket'
import { Action } from './ducks/actions'


export const clientMiddleware: (socket: ClientSocket) => Middleware = (
  socket,
) => ({ dispatch }) => {
  socket.onNotification = (notification) => {
    dispatch({
      type: 'connection/notification',
      notification,
    } as Action)
  }

  socket.onConnectionStatusChange = (status) => {
    dispatch({
      type: 'connection/setStatus',
      status,
    } as Action)
  }

  return (next) => async (action: Action) => {
    switch (action.type) {
      case 'connection/request': {
        try {
          const response = await socket.send(action.request, action.options)
          dispatch({
            type: 'connection/response',
            request: action.request,
            response: response,
            status: 'ok',
          } as Action)
        } catch (err) {
          if (err instanceof RequestTimeoutError) {
            dispatch({
              type: 'connection/response',
              request: action.request,
              status: 'timeout',
            } as Action)
          } else {
            throw err
          }
        }
        break
      }

      case 'connection/connect': {
        socket.connect()
        break
      }

      default: {
        return next(action)
      }
    }
  }
}
