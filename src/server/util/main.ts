import { assemble, inject } from '../../inject'

import { EnvironmentLoggerConfig, LoggerService } from '../logger/LoggerService'

import { DocumentClient } from '../ddb/DocumentClient'
import { DefaultTableConfig, TableConfig } from '../ddb/TableConfig'

import { DDBContentService } from '../content/DDBContentService'
import { DDBEventsService } from '../events/DDBEventsService'
import { DDBGamesService } from '../games/DDBGamesService'
import { DDBSessionsService } from '../sessions/DDBSessionsService'
import { DDBUsersService } from '../users/DDBUsersService'

import AWSDynamoDB from 'aws-sdk/clients/dynamodb'
import { readFileSync } from 'fs'
import { isContentSet } from '../../game/resources'

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

const main = async (argv: string[]): Promise<void> => {
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

  const app = await assemble({
    TableConfig: inject(tableConfig),
    LoggerConfig: EnvironmentLoggerConfig,
    LoggerService,
    DynamoDB: inject(
      new AWSDynamoDB({
        apiVersion: '2012-08-10',
        endpoint: 'http://localhost:8000',
        region: 'ddblocal',
        credentials: {
          accessKeyId: `test`,
          secretAccessKey: 'test',
        },
      }),
    ),
    DocumentClient,
    EventsService: DDBEventsService,
    ContentService: DDBContentService,
    SessionsService: DDBSessionsService,
    UsersService: DDBUsersService,
    GamesService: DDBGamesService,
  })

  switch (argv[0]) {
    case 'add-user': {
      const params = JSON.parse(argv[1])
      const users = app.get('UsersService')
      users.createUser(params.name, params.credentials)
      break
    }

    case 'set-content': {
      const [, ...files] = argv

      const sets = files.map((file) => {
        try {
          const contents = readFileSync(file).toString('utf-8')
          const json = JSON.parse(contents)
          if (!isContentSet(json)) {
            throw new Error('Invalid JSON')
          }
          return json
        } catch (err) {
          err.file = file
          throw err
        }
      })

      const content = app.get('ContentService')
      await content.defineContent(sets)
      break
    }

    default:
      console.log('Unknown command', argv[0])
  }
}

main(process.argv.slice(2))
