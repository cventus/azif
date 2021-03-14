import { inject } from '../../inject'

export interface TableConfig {
  tables: {
    content: string
    games: string
    users: string
    sessions: string
    gameSessions: string
  }
}

export const TableConfig = inject<TableConfig>()
