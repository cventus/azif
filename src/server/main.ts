import { assemble, inject } from '../inject'

import { EnvironmentLoggerConfig, LoggerService } from './logger/LoggerService'
import { SocketServer, SocketServerConfig } from './sockets/SocketServer'

import { DocumentClient } from './ddb/DocumentClient'
import { TableConfig } from './ddb/TableConfig'

import GameServer from './GameServer'
import { GameHandler } from './handler/GameHandler'
import { GameActionsHandler } from './games/GameActionsHandler'

import { DDBContentService } from './content/DDBContentService'
import { DDBEventsService } from './events/DDBEventsService'
import { DDBGamesService } from './games/DDBGamesService'
import { DDBSessionsService } from './sessions/DDBSessionsService'
import { DDBUsersService } from './users/DDBUsersService'

type CleanupHandler = () => Promise<void>

export async function main(): Promise<CleanupHandler> {
  const config: SocketServerConfig = {
    port: Number(process.env.PORT) || 3001,
    path: '/ws',
  }

  const TableConfig: TableConfig = {
    tables: {
      content: process.env.ITEMS_TABLE_NAME!,
      events: process.env.EVENTS_TABLE_NAME!,
      gameSessions: process.env.SESSIONS_TABLE_NAME!,
      games: process.env.ITEMS_TABLE_NAME!,
      sessions: process.env.ITEMS_TABLE_NAME!,
      users:  process.env.ITEMS_TABLE_NAME!,
    }
  }

  const assembly = await assemble({
    LoggerConfig: EnvironmentLoggerConfig,
    LoggerService,
    DocumentClient,
    EventsService: DDBEventsService,
    ContentService: DDBContentService,
    SocketServerConfig: inject(config),
    SocketServer,
    SocketsService: SocketServer, // alias
    SessionsService: DDBSessionsService,
    TableConfig: inject(TableConfig),
    UsersService: DDBUsersService,
    GamesService: DDBGamesService,
    GameActionsHandler,
    GameServer,
    GameHandler,
  })

  return async () => assembly.destroy()
}
