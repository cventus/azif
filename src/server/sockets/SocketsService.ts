import { inject } from "../../inject";
import { User } from "../users/UsersService";

export interface SocketSession {
  id: string
  userId: string
  gameId: string
}

export interface SocketsService {
  createSession(socketId: string, user: User): Promise<SocketSession | undefined>
  getSession(socketId: string): Promise<SocketSession | undefined>
  setGame(socketId: string, gameId: string): Promise<void>
  destroySession(socketId: string): Promise<void>
}

export const SocketsService = inject<SocketsService>()
