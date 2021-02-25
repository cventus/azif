export interface User {
  id: string
  name: string
  gameIds: string[]
  recentGameId?: string
  recentGameEpoch?: number
}

export interface Credentials {
  username: string
  password: string
}

export interface UserCredentials {
  username: string
  userId: string
}
