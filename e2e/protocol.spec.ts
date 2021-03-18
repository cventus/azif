import request from 'superwstest'
import http from 'http'

import { assemble, inject } from '../src/inject'
import { TestModule } from '../src/server/ddb/TestClient'
import { AppServices } from '../src/server/main'
import { SocketServer, SocketServerConfig } from '../src/server/sockets/SocketServer'
import { User } from '../src/server/users'
import { UsersService } from '../src/server/users/UsersService'

import * as p from '../src/game/protocol'

let socketServer: SocketServer
let server: http.Server
let users: UsersService
let cleanup: () => Promise<void>

beforeAll(async () => {
  const serverConfig: SocketServerConfig = {
    port: 0,
    host: 'localhost',
    path: '/ws'
  }
  const app = await assemble({
    ...AppServices,
    ...TestModule,
    SocketServerConfig: inject(serverConfig),
  })
  socketServer = app.get('SocketServer')
  users = app.get('UsersService')
  server = socketServer.server
  cleanup = () => app.destroy()
})
afterAll(() => cleanup())

beforeEach(() => socketServer.listen())
afterEach(() => socketServer.close()) // closes all sockets

describe('WebSocket protocol', () => {
  let alice: User

  beforeEach(async () => {
    alice = await users.createUser('Alice', { username: 'alice', password: 'password' })
  })

  it('users can log in and create games', async () => {
    await request(server)
      .ws('/ws')
      .sendJson({
        type: 'login',
        username: 'alice',
        password: 'password',
        requestId: 'login-req',
      } as p.PlayerLoginRequest)
      .expectJson({
        type: 'login',
        requestId: 'login-req',
        session: {
          currentGameId: null,
          gameIds: [],
          name: 'Alice',
          username: 'alice',
        }
      } as p.ServerLoginResponse)
      .close()
      .expectClosed()
  })
})
