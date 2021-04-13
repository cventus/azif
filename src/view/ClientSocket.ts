import React from 'react'
import {
  ClientRequest,
  ServerResponse,
  isServerMessage,
  ServerGameNotification,
} from '../game/protocol'

export const ConnectionStatus = [
  'disconnected',
  'connecting',
  'connected',
] as const
export type ConnectionStatus = typeof ConnectionStatus[number]

export type ClientRequestWithId = ClientRequest & { requestId: string }

export class RequestTimeoutError {
  public readonly request: ClientRequestWithId
  constructor(request: ClientRequestWithId) {
    this.request = request
  }
}

export interface ClientConfig {
  loginUrl: string
  logoutUrl: string
  openSocketUrl: string
}

const DefaultTimeout = 5000

interface PendingRequest {
  resolve: (response: ServerResponse) => void
  reject: (err: unknown) => void
  request: ClientRequestWithId
  timerId: ReturnType<typeof setTimeout>
}

export interface SendOptions {
  timeout?: number
}

type ServerError = RequestTimeoutError | unknown

export class ClientSocket {
  constructor(private readonly config: ClientConfig) {
    this.shouldReconnect = false
    this.requestId = 0
    this.requests = {}
  }

  private socket: WebSocket | undefined
  private shouldReconnect: boolean
  private requestId: number
  private requests: Record<string, PendingRequest>

  public onRequest?: (request: ClientRequest) => void
  public onResponse?: (request: ClientRequest, response: ServerResponse) => void
  public onErrorResponse?: (
    request: ClientRequest,
    response: ServerError,
  ) => void
  public onNotification?: (notification: ServerGameNotification) => void
  public onConnectionStatusChange?: (status: ConnectionStatus) => void

  private notifyStatus(status: ConnectionStatus) {
    if (this.onConnectionStatusChange) {
      this.onConnectionStatusChange(status)
    }
  }

  // Try to open socket if we happen to be authenticated
  public async connect() {
    this.openSocket()
  }

  public async send(
    request: ClientRequest,
    options: SendOptions = {},
  ): Promise<ServerResponse> {
    if (this.socket) {
      const { timeout = DefaultTimeout } = options
      const requestId = String(this.requestId++)
      const requestWithId = { ...request, requestId }

      const timerId = setTimeout(() => {
        const { reject } = this.requests[requestId]
        delete this.requests[requestId]
        reject(new RequestTimeoutError(requestWithId))
      }, timeout)

      const result = new Promise<ServerResponse>((resolve, reject) => {
        const pendingRequest: PendingRequest = {
          request: requestWithId,
          timerId,
          resolve,
          reject,
        }
        this.requests[requestId] = pendingRequest
      })

      try {
        // attempt to send
        const message = { ...request, requestId }
        this.socket.send(JSON.stringify(message))
        if (this.onRequest) {
          this.onRequest(message)
        }
        return await result
      } catch (err: unknown) {
        clearTimeout(timerId)
        delete this.requests[requestId]
        if (this.onErrorResponse) {
          this.onErrorResponse(requestWithId, err)
        }
        throw err
      }
    } else {
      return Promise.reject()
    }
  }

  private openSocket(): void {
    if (this.socket) {
      return
    }
    this.shouldReconnect = false

    const socket = new WebSocket(this.config.openSocketUrl)
    this.socket = socket
    this.notifyStatus('connecting')

    socket.addEventListener('open', () => {
      this.shouldReconnect = true
      this.notifyStatus('connected')
      console.log('opened')
    })

    socket.addEventListener('message', (ev) => {
      try {
        const json = JSON.parse(ev.data)

        if (!isServerMessage(json)) {
          throw new TypeError('Unexpected server payload')
        }

        if (json.type === 'game-event') {
          if (this.onNotification) {
            this.onNotification(json)
          }
        } else {
          const { resolve, request, timerId } = this.requests[json.requestId]
          if (!request) {
            console.error('Unexpected response from server:', json)
          } else {
            delete this.requests[json.requestId]
            clearTimeout(timerId)
            resolve(json)
            if (this.onResponse) {
              this.onResponse(request, json)
            }
          }
        }
      } catch (err: unknown) {
        console.error(err)
      }
    })

    socket.addEventListener('close', () => {
      this.socket = undefined
      if (this.shouldReconnect) {
        this.openSocket()
      } else {
        this.notifyStatus('disconnected')
      }
    })

    socket.addEventListener('error', async (ev) => {
      console.log('Socket error', ev)
    })
  }

  async logout(): Promise<void> {
    try {
      await fetch(this.config.logoutUrl, {
        method: 'post',
        mode: 'no-cors',
        credentials: 'include',
      })
      this.shouldReconnect = false
      if (this.socket) {
        this.socket.close()
        this.socket = undefined
      }
    } catch (e) {
      console.log('Failed to connect', e)
    }
  }
}
