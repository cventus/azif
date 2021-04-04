import { assemble, inject } from '../inject'

import { EnvironmentLoggerConfig, LoggerService } from './logger/LoggerService'
import { SocketServer, SocketServerConfig } from './sockets/SocketServer'

import { DocumentClient } from './ddb/DocumentClient'
import { DefaultTableConfig, TableConfig } from './ddb/TableConfig'

import GameServer from './GameServer'
import { GameHandler } from './handler/GameHandler'
import { GameActionsHandler } from './games/GameActionsHandler'

import { DDBContentService } from './content/DDBContentService'
import { DDBEventsService } from './events/DDBEventsService'
import { DDBGamesService } from './games/DDBGamesService'
import { DDBSessionsService } from './sessions/DDBSessionsService'
import { DDBUsersService } from './users/DDBUsersService'

type CleanupHandler = () => Promise<void>

const getEnv = (name: string, fallback?: string): string => {
  const value = process.env[name]
  if (!value) {
    if (fallback) {
      return fallback
    }
    throw new Error(`Variable not defined: ${name}`)
  }
  return value.trim()
}

export async function main(): Promise<CleanupHandler> {
  const serverConfig: SocketServerConfig = {
    port: Number(process.env.PORT) || 3001,
    host: process.env.HOST,
    path: '/ws',
  }

  const defaults = DefaultTableConfig.tables

  const tableConfig: TableConfig = {
    tables: {
      content: getEnv('ITEMS_TABLE_NAME', defaults.content),
      events: getEnv('EVENTS_TABLE_NAME', defaults.events),
      gameSessions: getEnv('SESSIONS_TABLE_NAME', defaults.gameSessions),
      games: getEnv('ITEMS_TABLE_NAME', defaults.games),
      sessions: getEnv('ITEMS_TABLE_NAME', defaults.sessions),
      users: getEnv('ITEMS_TABLE_NAME', defaults.users),
    },
  }

  const app = await init(serverConfig, tableConfig)
  await app.get('SocketServer').listen()
  return () => app.destroy()
}

export const AppServices = {
  LoggerConfig: EnvironmentLoggerConfig,
  LoggerService,
  DocumentClient,
  EventsService: DDBEventsService,
  ContentService: DDBContentService,
  SocketServer,
  SocketsService: SocketServer, // alias
  SessionsService: DDBSessionsService,
  UsersService: DDBUsersService,
  GamesService: DDBGamesService,
  GameActionsHandler,
  GameServer,
  GameHandler,
} as const

export const init = (
  serverConfig: SocketServerConfig,
  tableConfig: TableConfig,
) => {
  return assemble({
    ...AppServices,
    TableConfig: inject(tableConfig),
    SocketServerConfig: inject(serverConfig),
  })
}

type PromisedType<A> = A extends Promise<infer B> ? B : never
export type AppAssembly = PromisedType<ReturnType<typeof init>>
