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

    const responses: Record<string, p.ServerMessage> = {}
    const events: Record<number, p.ServerGameNotification> = {}
    const awaiters: Record<string, (res: p.ServerMessage) => void> = {}

    const handler: jest.Mock<void, [WebSocket.Data]> = jest.fn(message => {
      const json = JSON.parse(message.toString())
      if (p.isServerResponse(json)) {
        responses[json.requestId] = json
        if (awaiters[json.requestId]) {
          awaiters[json.requestId](json)
          delete awaiters[json.requestId]
        }
      } else if (p.isServerGameNotification(json)) {
        events[json.event.clock] = json
      } else {
        throw new Error('Unexpected response')
      }
    })

    const response = async <T extends p.ServerMessage['type']>(requestId: string, type: T): Promise<p.ServerMessage & { type: T }> => {
      let message: p.ServerMessage
      if (responses[requestId]) {
        message = responses[requestId]
      } else {
        message = await new Promise<p.ServerMessage>((resolve) => {
          awaiters[requestId] = resolve
        })
      }
      if (message.type !== type) {
        throw new Error(`Expected ${type}, got ${message.type}`)
      }
      return message as any
    }

    const ws = await request(server).ws('/ws')

    ws.on('message', handler)

    const send = (req: p.ClientMessage) => ws.send(JSON.stringify(req))

    send({
      type: 'login',
      username: 'alice',
      password: 'password',
      requestId: 'login-req',
    } as p.PlayerLoginRequest)

    const login = await response('login-req', 'login')
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

    send({
      type: 'get',
      resource: ['contents'],
      requestId: 'get-contents-req'
    })
    const getContents = await response('get-contents-req', 'get')
    expect(getContents).toEqual({
      type: 'get',
      requestId: 'get-contents-req',
      resource: ['contents'],
      list: [defaultContentPreview],
    } as p.ServerGetContentListResponse)

    send({
      type: 'create-game',
      contentSets: [defaultContentPreview.id],
      name: 'my game',
      requestId: 'create-game-req'
    } as p.PlayerCreateGameRequest)
    const createGame = await response('create-game-req', 'create-game')
    expect(createGame).toEqual(expect.objectContaining({
      type: 'create-game',
      requestId: 'create-game-req',
      game: expect.objectContaining({
        id: expect.stringMatching(/^game:/),
        characters: {},
        clock: 1,
        contentSetIds: [defaultContentPreview.id],
        name: 'my game',
        createdAt: expect.anything(), //(Number),
        flippedCardIds: [],
        phase: 'starting',
        players: {
          [alice.id]: {
            name: expect.anything(), // alice.name,
          }
        },
      })
    }) as p.ServerCreateGameResponse)

    send({
      type: 'get',
      resource: ['session'],
      requestId: 'get-session-req',
    } as p.PlayerGetRequest)
    const getSession = await response('get-session-req', 'get')
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

    ws.close()
  })
})
