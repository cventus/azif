import { inject } from '../../inject'
import { User } from '../users'

export interface SocketSession {
  id: string
  userId: string
  gameId?: string
}

export interface SessionsService {
  createSession(
    sessionId: string,
    userId: string,
  ): Promise<SocketSession | undefined>
  getSession(sessionId: string): Promise<SocketSession | undefined>
  subscribeToGame(sessionId: string, gameId: string): Promise<void>
  destroySession(sessionId: string): Promise<void>
}

export const SessionsService = inject<SessionsService>()
