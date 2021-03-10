import { inject } from '../../inject'

export interface SocketsService {
  send(socketId: string, json: unknown): Promise<void>
  disconnect(socketId: string): Promise<void>
}

export const SocketsService = inject<SocketsService>()
