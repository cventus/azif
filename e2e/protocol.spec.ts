import request from 'superwstest'
import http from 'http'

import { assemble, inject } from '../src/inject'
import { TestModule } from '../src/server/ddb/TestClient'
import { AppServices } from '../src/server/main'
import {
  SocketServer,
  SocketServerConfig,
} from '../src/server/sockets/SocketServer'
import { User } from '../src/server/users'
import { UsersService } from '../src/server/users/UsersService'
import { ContentSet, ContentSetPreview } from '../src/game/resources'
import { GamesService } from '../src/server/games/GamesService'

import * as p from '../src/game/protocol'
import { TestClient } from './TestClient'

let socketServer: SocketServer
let server: http.Server
let users: UsersService
let games: GamesService
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
    },
  },
}

beforeAll(async () => {
  const serverConfig: SocketServerConfig = {
    port: 0,
    host: 'localhost',
    path: '/ws',
  }
  const app = await assemble({
    ...AppServices,
    ...TestModule,
    SocketServerConfig: inject(serverConfig),
  })
  socketServer = app.get('SocketServer')
  users = app.get('UsersService')
  games = app.get('GamesService')
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
  let bob: User

  beforeEach(async () => {
    alice = await users.createUser('Alice', {
      username: 'alice',
      password: 'password',
    })
    bob = await users.createUser('Bob', {
      username: 'bob',
      password: 'password',
    })
  })
  afterEach(async () => {
    await users.removeUser(alice.id)
    await users.removeUser(bob.id)
  })

  it('users can log in', () =>
    request(server)
      .ws('/ws')
      .sendJson({
        type: 'login',
        username: 'alice',
        password: 'password',
        requestId: 'login-req',
      } as p.ClientLoginRequest)
      .expectJson({
        type: 'login',
        requestId: 'login-req',
        session: {
          id: alice.id,
          currentGameId: null,
          gameIds: [],
          name: 'Alice',
          username: 'alice',
        },
      })
      .close()
      .expectClosed())

  it('users can log in and create games', async () => {
    const client = makeClient()

    const login = await client.send(
      {
        type: 'login',
        username: 'alice',
        password: 'password',
        requestId: 'login-req',
      },
      'login',
    )

    expect(login).toEqual({
      type: 'login',
      requestId: 'login-req',
      session: {
        id: alice.id,
        currentGameId: null,
        gameIds: [],
        name: 'Alice',
        username: 'alice',
      },
    } as p.ServerLoginResponse)

    const getContents = await client.send(
      {
        type: 'get',
        resource: 'content-list',
        requestId: 'get-contents-req',
      },
      'get',
    )

    expect(getContents).toEqual({
      type: 'get',
      requestId: 'get-contents-req',
      resource: 'content-list',
      list: [defaultContentPreview],
    } as p.ServerGetResponse)

    const createGame = await client.send(
      {
        type: 'create-game',
        contentSets: [defaultContentPreview.id],
        name: 'my game',
        requestId: 'create-game-req',
      },
      'create-game',
    )

    expect(createGame).toEqual(
      expect.objectContaining({
        type: 'create-game',
        requestId: 'create-game-req',
        game: expect.objectContaining({
          id: expect.stringMatching(/./),
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
            },
          },
        }),
      }) as p.ServerCreateGameResponse,
    )

    const getSession = await client.send(
      {
        type: 'get',
        resource: 'session',
        requestId: 'get-session-req',
      },
      'get',
    )

    expect(getSession).toEqual({
      type: 'get',
      requestId: 'get-session-req',
      resource: 'session',
      session: {
        currentGameId: null,
        gameIds: [createGame.game.id],
        id: alice.id,
        name: 'Alice',
        username: 'alice',
      },
    } as p.ServerResponse)

    client.close()
  })

  it("users are notified of one another's game events", async () => {
    const aliceClient = makeClient()
    const bobClient = makeClient()

    const game = await games.createGame('some game', [defaultContent.id])
    await games.addPlayer(game.id, alice.id)
    await games.addPlayer(game.id, bob.id)

    await aliceClient.send(
      {
        type: 'login',
        username: 'alice',
        password: 'password',
        requestId: 'login-req',
      },
      'login',
    )
    await aliceClient.send(
      {
        type: 'subscribe-to-game',
        gameId: game.id,
        requestId: 'subscribe',
      },
      'subscribe-to-game',
    )

    await bobClient.send(
      {
        type: 'login',
        username: 'bob',
        password: 'password',
        requestId: 'login-req',
      },
      'login',
    )
    await bobClient.send(
      {
        type: 'subscribe-to-game',
        gameId: game.id,
        requestId: 'subscribe',
      },
      'subscribe-to-game',
    )

    await aliceClient.send(
      {
        type: 'action',
        requestId: 'action-1',
        action: {
          type: 'switch-character',
          playerId: alice.id,
          oldCharacter: null,
          newCharacter: 'ch-1',
        },
      },
      'game-update',
    )

    await bobClient.send(
      {
        type: 'action',
        requestId: 'action-2',
        action: {
          type: 'switch-character',
          playerId: bob.id,
          oldCharacter: null,
          newCharacter: 'ch-2',
        },
      },
      'game-update',
    )

    const response = await aliceClient.send(
      {
        type: 'action',
        requestId: 'action-3',
        action: {
          type: 'dice',
          roll: [null, null, null],
        },
      },
      'game-update',
    )

    await aliceClient.receiveNotification(response.game.clock)
    await bobClient.receiveNotification(response.game.clock)

    expect(aliceClient.events).toEqual(bobClient.events)
    expect(aliceClient.events).toEqual(
      expect.objectContaining({
        [response.game.clock]: expect.objectContaining({
          type: 'game-event',
          event: expect.objectContaining({
            action: expect.objectContaining({ type: 'dice' }),
          }),
        }),
        [response.game.clock - 1]: expect.objectContaining({
          type: 'game-event',
          event: expect.objectContaining({
            action: expect.objectContaining({ type: 'switch-character' }),
          }),
        }),
        [response.game.clock - 2]: expect.objectContaining({
          type: 'game-event',
          event: expect.objectContaining({
            action: expect.objectContaining({ type: 'switch-character' }),
          }),
        }),
      }),
    )
  })

  it('users can change their username', async () => {
    const client = makeClient()

    await client.send(
      {
        type: 'login',
        username: 'alice',
        password: 'password',
        requestId: 'login-req',
      },
      'login',
    )

    await client.send(
      {
        type: 'set-username',
        newUsername: 'alexa',
        currentPassword: 'password',
        requestId: 'set-username',
      },
      'success',
    )

    const getSession = await client.send(
      {
        type: 'get',
        resource: 'session',
        requestId: 'get-session-req',
      },
      'get',
    )

    expect(getSession).toEqual({
      type: 'get',
      requestId: 'get-session-req',
      resource: 'session',
      session: {
        currentGameId: null,
        gameIds: [],
        id: alice.id,
        name: 'Alice',
        username: 'alexa',
      },
    } as p.ServerResponse)
  })

  it('users can change their passwords', async () => {
    const client = makeClient()

    await client.send(
      {
        type: 'login',
        username: 'alice',
        password: 'password',
        requestId: 'login-req',
      },
      'login',
    )

    await client.send(
      {
        type: 'set-password',
        newPassword: 'PASSWORD',
        currentPassword: 'password',
        requestId: 'set-password',
      },
      'success',
    )

    await client.send(
      {
        type: 'logout',
        requestId: 'logout-req',
      },
      'success',
    )

    await client.send(
      {
        type: 'login',
        username: 'alice',
        password: 'PASSWORD',
        requestId: 'login-req-2',
      },
      'login',
    )
  })
})
