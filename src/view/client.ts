import { Middleware } from 'redux'
import { ClientSocket, ClientConfig } from './ClientSocket'
import { Action } from './ducks/actions'

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

      default: {
        return next(action)
      }
    }
  }
}
