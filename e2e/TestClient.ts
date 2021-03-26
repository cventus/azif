import WebSocket from 'ws'

import {
  ClientMessage,
  isServerGameNotification,
  isServerResponse,
  ServerGameNotification,
  ServerMessage,
  ServerResponse,
} from '../src/game/protocol'

export class TestClient {
  private responses: Record<string, ServerMessage>
  private events: Record<number, ServerGameNotification>
  private requestAwaiters: Record<string, (res: ServerMessage) => void>
  private ws: WebSocket
  private awaitOpen: Promise<void>

  constructor(url: string) {
    this.responses = {}
    this.events = {}
    this.requestAwaiters = {}
    this.ws = new WebSocket(url)

    let onOpen: () => void
    this.awaitOpen = new Promise<void>((resolve) => { onOpen = resolve })

    this.ws.on('open', () => onOpen())

    this.ws.on('message', (message) => {
      const json = JSON.parse(message.toString())
      if (isServerResponse(json)) {
        this.responses[json.requestId] = json
        if (this.requestAwaiters[json.requestId]) {
          this.requestAwaiters[json.requestId](json)
          delete this.requestAwaiters[json.requestId]
        }
      } else if (isServerGameNotification(json)) {
        this.events[json.event.clock] = json
      } else {
        throw new Error('Unexpected response')
      }
    })
  }

  public async response(requestId: string): Promise<ServerResponse> {
    let message: ServerMessage
    if (this.responses[requestId]) {
      message = this.responses[requestId]
    } else {
      message = await new Promise<ServerMessage>((resolve) => {
        this.requestAwaiters[requestId] = resolve
      })
    }
    return message
  }

  public async send<T extends ServerMessage['type']>(
    message: ClientMessage,
    type: T,
  ): Promise<ServerResponse & { type: T }> {
    await this.awaitOpen
    this.ws.send(JSON.stringify(message))
    const response = await Promise.race([
      new Promise<ServerResponse>((_, reject) =>
        setTimeout(() => {
          reject(new Error(`Request ${message.requestId} timed out after 1s`))
        }, 1000)
      ),
      this.response(message.requestId),
    ])
    if (response.type === type) {
      return response as ServerMessage & { type: T }
    }
    throw new Error(`Expected response message ${type}, got ${response.type}`)
  }

  public close(): void {
    this.ws.close()
  }
}
