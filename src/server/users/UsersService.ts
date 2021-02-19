import { inject } from '../../inject'

export interface User {
  id: string
  name: string
  gameIds: string[]
  recentGameId: string
  recentGameEpoch: number
}

export interface Credentials {
  username: string
  password: string
  userId: string
}

export interface UsersService {
  createUser(name: string, credentials: Credentials): Promise<User>
  removeUser(userId: string): Promise<void>
  authenticate(username: string, password: string): Promise<User | undefined>
  setName(userId: string, name: string): Promise<void>
  setUsername(userId: string, username: string): Promise<void>
  setPassword(userId: string, password: string): Promise<void>
}

export const UsersService = inject<UsersService>()
