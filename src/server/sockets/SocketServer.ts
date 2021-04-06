import { EventEmitter } from 'events'
import http from 'http'
import WebSocket from 'ws'
import pino from 'pino'

import { inject } from '../../inject'
import { LoggerService } from '../logger/LoggerService'

export interface SocketServerConfig {
  path: string
  host?: string
  port: number
}

export const SocketServerConfig = inject<SocketServerConfig>()

export interface SocketServer {
  listen(): Promise<void>
  close(): Promise<void>
  readonly server: http.Server

  send(socketId: string, json: unknown): Promise<void>
  disconnect(socketId: string): Promise<void>

  on(event: 'connect', cb: (socketId: string) => void): this
  on(event: 'message', cb: (socketId: string, json: unknown) => void): this
  on(event: 'disconnect', cb: (socketId: string) => void): this

  off(event: 'connect', cb: (socketId: string) => void): this
  off(event: 'message', cb: (socketId: string, json: unknown) => void): this
  off(event: 'disconnect', cb: (socketId: string) => void): this
}

class SocketServerImpl extends EventEmitter implements SocketServer {
  public readonly server: http.Server
  private readonly config: SocketServerConfig
  private readonly wss: WebSocket.Server

  private counter: number
  private connections: Record<string, WebSocket>

  private makeId() {
    return `connection-${this.counter++}`
  }

  constructor(config: SocketServerConfig, logger: pino.Logger) {
    super()
    this.server = http.createServer()
    this.config = config
    this.wss = new WebSocket.Server({
      server: this.server,
      path: config.path,
    })
    this.counter = 0
    this.connections = {}

    this.wss.on('connection', (ws) => {
      const socketId = this.makeId()
      this.connections[socketId] = ws

      ws.on('close', (code, reason) => {
        logger.info({ code, reason, socketId }, 'websocket closed')
        this.emit('disconnect', socketId)
        delete this.connections[socketId]
      })

      ws.on('message', (data) => {
        try {
          const json = data.toString('utf-8')
          const value = JSON.parse(json)
          this.emit('message', socketId, value)
        } catch (err) {
          logger.error({ err, socketId }, 'message error')
        }
      })

      ws.on('error', (err) => {
        logger.error({ err, socketId }, 'websocket error')
      })
    })

    this.wss.on('error', (err) => {
      logger.error(err, 'websocket server error')
    })
  }

  send(socketId: string, json: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connections[socketId].send(JSON.stringify(json), (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  listen() {
    return new Promise<void>((resolve) => {
      this.server.ref()
      this.server.listen(this.config.port, this.config.host, () =>
        resolve(undefined),
      )
    })
  }

  disconnect(socketId: string): Promise<void> {
    return Promise.resolve(this.connections[socketId].close())
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.unref()
      this.server.close((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}

export const SocketServer = inject(
  { SocketServerConfig, LoggerService },
  ({ SocketServerConfig: config, LoggerService }): SocketServer => {
    const logger = LoggerService.create('SocketServer')

    const service = LoggerService.traceMethods(
      logger,
      new SocketServerImpl(config, logger),
    )

    return service
  },
  (service) => service.close(),
)
