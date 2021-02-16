import { replace } from 'connected-react-router'
import { Middleware } from 'redux'
import { ClientSocket, ClientConfig } from './ClientSocket'
import { Action } from './ducks/actions'
import { toGamesPage } from './paths'

export const clientMiddleware: (config: ClientConfig) => Middleware = (
  config,
) => ({ dispatch }) => {
  const socket = new ClientSocket(config, dispatch)

  return (next) => (action: Action) => {
    console.log(action)
    switch (action.type) {
      // Swallow certain connection messages
      case 'connection/clientMessage':
        socket.send(action.message)
        break

      case 'connection/login':
        socket.login()
        break

      case 'connection/connect':
        socket.connect()
        break

      case 'connection/logout':
        socket.logout()
        break

      case 'connection/setStatus':
        if (action.status === 'connected') {
          dispatch(replace(toGamesPage()))
        }
        return next(action)

      default: {
        return next(action)
      }
    }
  }
}
