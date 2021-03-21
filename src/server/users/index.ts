export interface User {
  id: string
  name: string
  username: string
  gameIds: string[]
  recentGame?: {
    id: string
    timestamp: Date
  }
}

export interface Credentials {
  username: string
  password: string
}

export interface UserCredentials {
  username: string
  userId: string
}
