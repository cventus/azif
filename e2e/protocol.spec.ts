import request from 'superwstest'
import http from 'http'
import WebSocket from 'ws'

import { assemble, inject } from '../src/inject'
import { TestModule } from '../src/server/ddb/TestClient'
import { AppServices } from '../src/server/main'
import { SocketServer, SocketServerConfig } from '../src/server/sockets/SocketServer'
import { User } from '../src/server/users'
import { UsersService } from '../src/server/users/UsersService'

import * as p from '../src/game/protocol'
import { ContentSet, ContentSetPreview, GameState } from '../src/game/resources'
import { TestClient } from './TestClient'

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

const wsUrl = (): string => {
  const addr = server.address()
  if (!addr) {
    throw new Error('Server has no address')
  }
  if (typeof addr === 'string') {
    throw new Error(`Unexpectedly listening to UNIX domain socket ${addr}`)
  }
  return `http://localhost:${addr.port}/ws`
}

const makeClient = () => new TestClient(wsUrl())

describe('WebSocket protocol', () => {
  let alice: User

  beforeEach(async () => {
    alice = await users.createUser('Alice', {
      username: 'alice',
      password: 'password',
    })
  })
  afterEach(async () => {
    await users.removeUser(alice.id)
  })

  it('users can log', () =>
    request(server)
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
  )

  it('users can log in and create games', async () => {
    const client = makeClient()

    const login = await client.send({
      type: 'login',
      username: 'alice',
      password: 'password',
      requestId: 'login-req',
    }, 'login')

    expect(login).toEqual({
      type: 'login',
      requestId: 'login-req',
      session: {
        currentGameId: null,
        gameIds: [],
        name: 'Alice',
        username: 'alice',
      }
    } as p.ServerLoginResponse)

    const getContents = await client.send({
      type: 'get',
      resource: ['contents'],
      requestId: 'get-contents-req'
    }, 'get')

    expect(getContents).toEqual({
      type: 'get',
      requestId: 'get-contents-req',
      resource: ['contents'],
      list: [defaultContentPreview],
    } as p.ServerGetContentListResponse)

    const createGame = await client.send({
      type: 'create-game',
      contentSets: [defaultContentPreview.id],
      name: 'my game',
      requestId: 'create-game-req'
    }, 'create-game')

    expect(createGame).toEqual(expect.objectContaining({
      type: 'create-game',
      requestId: 'create-game-req',
      game: expect.objectContaining({
        id: expect.stringMatching(/^game:/),
        characters: {},
        clock: 1,
        contentSetIds: [defaultContentPreview.id],
        name: 'my game',
        createdAt: expect.anything(),
        flippedCardIds: [],
        phase: 'starting',
        players: {
          [alice.id]: {
            name: alice.name,
          }
        },
      })
    }) as p.ServerCreateGameResponse)

    const getSession = await client.send({
      type: 'get',
      resource: ['session'],
      requestId: 'get-session-req',
    }, 'get')

    expect(getSession).toEqual({
      type: 'get',
      requestId: 'get-session-req',
      resource: ['session'],
      session: {
          currentGameId: null,
          gameIds: [createGame.game.id],
          id: alice.id,
          name: 'Alice',
          username: 'alice',
        }
    } as p.ServerResponse)

    client.close()
  })
})
