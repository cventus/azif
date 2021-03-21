import { inject } from '../../inject'

export interface SocketSession {
  socketId: string
  userId: string
  gameId: string | null
}

export interface SessionsService {
  getSession(socketId: string): Promise<SocketSession | undefined>
  getGameSessions(gameId: string): Promise<SocketSession[]>
  createSession(socketId: string, userId: string): Promise<SocketSession>
  subscribeToGame(socketId: string, gameId: string | null): Promise<SocketSession>
  removeSession(socketId: string, gameId?: string): Promise<void>
}

export const SessionsService = inject<SessionsService>()
