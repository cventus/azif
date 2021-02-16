import WebSocket from 'ws'
import { inject } from '../inject'
import http from 'http'
import type net from 'net'
import {
  ClientMessage,
  GameEventMessage,
  isClientMessage,
  ServerMessage,
} from '../game/protocol'

export interface ServerConfig {
  port: number
  realm: string
}

export const ServerConfig = inject<ServerConfig>()

interface Credentials {
  username: string
  password: string
}

function getAuthentication(authorization?: string): Credentials | undefined {
  const [, hash] = authorization?.match(/Basic\s+(\w+)/i) || []
  if (hash) {
    const decoded = Buffer.from(hash, 'base64').toString('utf-8')
    const [username, password] = decoded.split(':')
    if (username && password) {
      return { username, password }
    }
  }
}

function writeFailedRawResponse(socket: net.Socket, lines: string[]): void {
  const payload = [...lines, '\r\n'].join('\r\n')
  socket.write(payload, 'utf-8', (err) => {
    if (err) {
      console.log('Error writing to socket', err)
    }
    socket.end()
    socket.destroy()
  })
}

function handleClientMessage(
  message: ClientMessage,
  userId: string,
  getMessageId: () => number,
  broadcast: (message: ServerMessage) => void,
): void {
  if (message.type === 'player-action') {
    const gameEvent: GameEventMessage = {
      type: 'server-game-event',
      event: {
        ...message.action,
        eventId: getMessageId(),
        epoch: new Date().valueOf(),
        playerId: userId,
        gameId: 'the-game-id',
      },
    }
    broadcast(gameEvent)
  }
}

const GameServer = inject(
  { ServerConfig },
  ({ ServerConfig: config }) => {
    const { port } = config

    const server = http.createServer()
    const wsServer = new WebSocket.Server({ noServer: true })

    let messageId = 0
    const genMessageId: () => number = () => messageId++

    const connections: WebSocket[] = []
    const broadcast = (message: ServerMessage) => {
      const json = JSON.stringify(message)
      connections.forEach((w) => w.send(json))
    }

    const wwwAuthenticate = `Basic realm=${JSON.stringify(
      config.realm,
    )}, charset="UTF-8"`

    // Serve /login and /logout
    server.on(
      'request',
      (request: http.IncomingMessage, response: http.ServerResponse) => {
        const pathname = request.url
        const credentials = getAuthentication(request.headers['authorization'])

        // No pre-flight support, just POST requests
        if (request.method?.toLowerCase() !== 'post') {
          response.writeHead(405)
          response.end()
        } else if (pathname === '/login') {
          if (credentials) {
            response.writeHead(200)
            response.end()
          } else {
            response.setHeader('WWW-Authenticate', wwwAuthenticate)
            response.writeHead(401)
            response.end()
          }
        } else if (pathname === '/logout') {
          // Returning 401 no matter what should clear the browser's
          // Basic Authentication credentials cache.
          response.writeHead(401)
          response.end()
        } else {
          response.writeHead(404)
          response.end()
        }
      },
    )

    // Upgrade WebSocket requests that have basic auth
    server.on(
      'upgrade',
      (request: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
        const pathname = request.url
        const credentials = getAuthentication(request.headers['authorization'])

        if (pathname === '/login') {
          if (credentials) {
            wsServer.handleUpgrade(request, socket, head, function done(ws) {
              connections.push(ws)

              ws.on('message', (data) => {
                try {
                  const json = data.toString('utf-8')
                  const value = JSON.parse(json)
                  if (!isClientMessage(value)) {
                    throw new TypeError(`Bad client message: ${json}`)
                  }
                  handleClientMessage(
                    value,
                    credentials.username,
                    genMessageId,
                    broadcast,
                  )
                } catch (e) {
                  console.log('message error', e)
                }
              })

              ws.on('error', (error) => {
                console.error(`WebSocket ${credentials.username}`, error)
              })

              ws.on('close', (code, reason) => {
                console.log(`websocket closed: ${code} ${reason}`)
                const i = connections.findIndex((w) => w === ws)
                connections.splice(i, 1)
              })
            })
          } else {
            writeFailedRawResponse(socket, [
              'HTTP/1.1 401 Unauthorized',
              'Connection: close',
            ])
          }
        } else {
          writeFailedRawResponse(socket, [
            'HTTP/1.1 400 Bad Request',
            'Connection: close',
          ])
        }
      },
    )

    return {
      start(): void {
        server.listen(port, () => {
          console.log(`listening at http://localhost:${port}`)
        })
      },
      stop(): Promise<void> {
        return new Promise((resolve, reject) => {
          console.log('stopping server...')
          if (server) {
            server.close((err) => {
              if (err) {
                console.error('failed to stop server:', err)
                reject(err)
              } else {
                console.log('server stopped')
                resolve(undefined)
              }
            })
          }
        })
      },
    }
  },
  (server) => {
    server.stop()
  },
)

export default GameServer
