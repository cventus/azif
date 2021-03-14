import { inject } from '../inject'
import { SocketServer } from './sockets/SocketServer'
import { GameHandler } from './handler/GameHandler'

const GameServer = inject(
  { SocketServer, GameHandler },
  ({ SocketServer: server, GameHandler: handler }) => {

    const onConnect = (socketId: string) => {
      handler({ type: 'connect', socketId })
    }
    const onMessage = (socketId: string, json: unknown) => {
      handler({ type: 'message', socketId, json })
    }
    const onDisconnect = (socketId: string) => {
      handler({ type: 'disconnect', socketId })
    }

    server.on('connect', onConnect)
    server.on('message', onMessage)
    server.on('disconnect', onDisconnect)

    const cleanup = () => {
      server.off('connect', onConnect)
      server.off('message', onMessage)
      server.off('disconnect', onDisconnect)
    }
    return cleanup
  },
  (cleanup) => cleanup()
)

export default GameServer
