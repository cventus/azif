import { inject } from '../../inject'

export interface Connection {
  socketId: string
  userId: string
  gameId?: string | undefined
}

export interface ConnectionsService {
  getConnection(socketId: string): Promise<Connection | undefined>
  getGameConnections(gameId: string): Promise<Connection[]>
  createConnection(socketId: string, userId: string): Promise<Connection>
  setGame(socketId: string, gameId: string): Promise<Connection>
  removeConnection(socketId: string, gameId?: string): Promise<void>
}

export const ConnectionsService = inject<ConnectionsService>()
