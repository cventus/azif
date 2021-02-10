import GameServer, { ServerConfig } from './GameServer'
import { assemble, inject } from '../inject'

type CleanupHandler = () => Promise<void>

export async function main(): Promise<CleanupHandler> {
  const config: ServerConfig = {
    port: Number(process.env.PORT) || 3001,
    realm: process.env.REALM || 'My realm',
  }

  const assembly = await assemble({
    GameServer,
    ServerConfig: inject(config),
  })

  const app = assembly.get('GameServer')

  app.start()

  return () => assembly.destroy()
}
