import { inject } from '../../inject'

interface Connection {
  socketId: string
  userId: string
  gameId: string | undefined
}

export interface ConnectionsService {
  getConnection(socketId: string): Promise<Connection>
  getGameConnections(gameId: string): Promise<Connection[]>
  setUser(socketId: string, userId: string): Promise<void>
  setGame(socketId: string, gameId: string): Promise<void>
  disconnect(socketId: string): Promise<void>
}

export const ConnectionsService = inject<ConnectionsService>()
