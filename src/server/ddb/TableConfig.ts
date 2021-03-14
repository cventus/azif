import { inject } from '../../inject'

export interface TableConfig {
  tables: {
    content: string
    events: string
    games: string
    gameSessions: string
    sessions: string
    users: string
  }
}

export const TableConfig = inject<TableConfig>()
