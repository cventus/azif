import { Middleware } from 'redux'
import { ClientSocket, ClientConfig, RequestTimeoutError } from './ClientSocket'
import { Action } from './ducks/actions'

export const clientMiddleware: (config: ClientConfig) => Middleware = (
  config,
) => ({ dispatch }) => {
  const socket = new ClientSocket(config)

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
    console.log(action)
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
