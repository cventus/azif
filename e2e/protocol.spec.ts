import request from 'superwstest'
import http from 'http'

import { assemble, inject } from '../src/inject'
import { TestModule } from '../src/server/ddb/TestClient'
import { AppServices } from '../src/server/main'
import { SocketServer, SocketServerConfig } from '../src/server/sockets/SocketServer'
import { User } from '../src/server/users'
import { UsersService } from '../src/server/users/UsersService'

import * as p from '../src/game/protocol'
import { ContentSet, ContentSetPreview } from '../src/game/resources'

let socketServer: SocketServer
let server: http.Server
let users: UsersService
let cleanup: () => Promise<void>

const defaultContentPreview: ContentSetPreview = {
  id: 'content:default',
  description: ['the default cards'],
  name: 'default',
}

const defaultContent: ContentSet = {
  ...defaultContentPreview,
  cards: {
    c00: {
      id: 'c00',
      type: 'common-item',
      name: 'brush',
      set: 'content:default',
    }
  }
}

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

  // Setup
  const contents = app.get('ContentService')
  await contents.defineContent([defaultContent])
})
afterAll(() => cleanup())

beforeEach(() => socketServer.listen())
afterEach(() => socketServer.close()) // closes all sockets

describe('WebSocket protocol', () => {
  let alice: User

  beforeEach(async () => {
    alice = await users.createUser('Alice', { username: 'alice', password: 'password' })
  })
  afterEach(async () => {
    await users.removeUser(alice.id)
  })

  it('users can log in and create games', () =>
    request(server).ws('/ws')
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
      .sendJson({
        type: 'get',
        resource: ['contents'],
        requestId: 'get-contents-req'
      } as p.PlayerGetRequest)
      .expectJson({
        type: 'get',
        requestId: 'get-contents-req',
        resource: ['contents'],
        list: [defaultContentPreview],
      } as p.ServerGetContentListResponse)
      .sendJson({
        type: 'create-game',
        contentSets: [defaultContentPreview.id],
        name: 'my game',
        requestId: 'create-game-req'
      } as p.PlayerCreateGameRequest)
      .expectJson({
        type: 'success',
        requestId: 'create-game-req',
      } as p.ServerSuccessResponse)
      .close()
      .expectClosed()
  )
})
