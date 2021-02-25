import { inject } from '../../inject'
import { Page } from '../ddb'

import { Credentials, User, UserCredentials } from '.'

export interface UsersService {
  listUsers(token?: string): Promise<Page<User, string>>
  listCredentials(token?: string): Promise<Page<UserCredentials, string>>
  createUser(name: string, credentials: Credentials): Promise<User>
  removeUser(userId: string): Promise<void>
  authenticate(username: string, password: string): Promise<User | undefined>
  setName(userId: string, name: string): Promise<User>
  setUsername(userId: string, username: string): Promise<void>
  setPassword(userId: string, password: string): Promise<void>
}

export const UsersService = inject<UsersService>()
