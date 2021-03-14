import { inject } from '../../inject'

export interface TableConfig {
  tables: {
    content: string
    games: string
    users: string
    connections: string
    gameConnections: string
  }
}

export const TableConfig = inject<TableConfig>()

