import { EventEmitter } from 'events'
import WebSocket from 'ws'

import { inject } from '../../inject'
import { LoggerService } from '../logger/LoggerService'

export interface SocketServerConfig {
  path: string
  port: number
}

export const SocketServerConfig = inject<SocketServerConfig>()

interface SocketServer {
  close(): Promise<void>

  send(socketId: string, json: unknown): Promise<void>
  disconnect(socketId: string): Promise<void>

  on(event: 'connect', cb: (socketId: string) => void): this
  on(event: 'message', cb: (socketId: string, json: unknown) => void): this
  on(event: 'disconnect', cb: (socketId: string) => void): this

  off(event: 'connect', cb: (socketId: string) => void): this
  off(event: 'message', cb: (socketId: string, json: unknown) => void): this
  off(event: 'disconnect', cb: (socketId: string) => void): this
}

export const SocketServer = inject(
  { SocketServerConfig, Logger: LoggerService },
  ({ SocketServerConfig: config, Logger }): SocketServer => {
    const server = new WebSocket.Server(config)
    const logger = Logger.create('SocketServer')

    let counter = 0
    const makeId = () => `connection-${counter++}`
    const connections: Record<string, WebSocket> = {}

    const service = Logger.traceMethods(
      logger,
      new (class extends EventEmitter implements SocketServer {
        send(socketId: string, json: unknown): Promise<void> {
          return new Promise((resolve, reject) => {
            connections[socketId].send(JSON.stringify(json), (err) => {
              if (err) {
                reject(err)
              } else {
                resolve()
              }
            })
          })
        }

        disconnect(socketId: string): Promise<void> {
          return Promise.resolve(connections[socketId].close())
        }

        close(): Promise<void> {
          return new Promise((resolve, reject) => {
            server.close((err) => {
              if (err) {
                reject(err)
              } else {
                resolve()
              }
            })
          })
        }
      })(),
    )

    server.on('connection', (ws) => {
      const socketId = makeId()
      connections[socketId] = ws

      ws.on('close', (code, reason) => {
        logger.info({ code, reason, socketId }, 'websocket closed')
        service.emit('disconnect', socketId)
        delete connections[socketId]
      })

      ws.on('message', (data) => {
        try {
          const json = data.toString('utf-8')
          const value = JSON.parse(json)
          service.emit('message', socketId, value)
        } catch (err) {
          logger.error({ err, socketId }, 'message error')
        }
      })

      ws.on('error', (err) => {
        logger.error({ err, socketId }, 'websocket error')
      })
    })

    server.on('error', (err) => {
      logger.error(err, 'websocket server error')
    })

    return service
  },
  (service) => service.close(),
)
