import { ClientRequest, isServerMessage } from '../game/protocol'
import { connection } from './ducks/connection'
import { Dispatch } from './store'

export const ConnectionStatus = [
  'disconnected',
  'connecting',
  'connected',
] as const

export type ConnectionStatus = typeof ConnectionStatus[number]

export interface ClientConfig {
  loginUrl: string
  logoutUrl: string
  openSocketUrl: string
}

export class ClientSocket {
  constructor(
    private readonly config: ClientConfig,
    private readonly dispatch: Dispatch,
  ) {
    this.shouldReconnect = false
  }

  private socket: WebSocket | undefined
  private shouldReconnect: boolean

  public async login(): Promise<void> {
    // 1. Call the login URL (it might be cross-origin)
    //  - If we're not logged in we'll hit the 401+WWW-Authenticate and hopefully
    //    this triggers the browser's Basic auth prompt
    //  - The browser will re-try fetching the login URL
    //    a) on a success: the browser will keep sending the "Authorization" header
    //       in future requests, including web-socket upgrade requests
    //    b) on a failure: browser will not use the "Authorization" headers and
    //       when we try to make a WebSocket connection we'll find out
    await fetch(this.config.loginUrl, {
      method: 'post',
      mode: 'no-cors',
      credentials: 'include',
    })

    // 2. Attempt to open socket
    //  - If Basic Authentication succeeded then the browser will include the
    //    headers when opening the socket
    //  - Otherwise we'll get an error here
    //  - Ulitmately, we're able to make the WS upgrade request with
    //    authentication headers included.
    this.openSocket()
  }

  // Try to open socket if we happen to be authenticated
  public async connect() {
    this.openSocket()
  }

  public send(clientMessage: ClientMessage): boolean {
    if (this.socket) {
      this.socket.send(JSON.stringify(clientMessage))
      return true
    } else {
      return false
    }
  }

  private openSocket(): void {
    if (this.socket) {
      return
    }
    this.shouldReconnect = false

    const socket = new WebSocket(this.config.openSocketUrl)
    this.socket = socket
    this.dispatch(connection.setStatus('connecting'))
    console.log('connecting')

    socket.addEventListener('open', () => {
      // We've successfully opened a connection. We've managed to authenticate
      // at least once. If we get an error let's try re-connecting once.
      this.shouldReconnect = true
      this.dispatch(connection.setStatus('connected'))
      console.log('opened')
    })

    socket.addEventListener('message', (ev) => {
      try {
        console.log(ev)
        const json = JSON.parse(ev.data)

        if (!isServerMessage(json)) {
          throw new TypeError('Unexpected server payload')
        }

        console.log(json)

        this.dispatch(connection.serverMessage(json))
      } catch (e: unknown) {
        console.log(e)
      }
    })

    socket.addEventListener('close', () => {
      this.socket = undefined
      if (this.shouldReconnect) {
        this.openSocket()
      } else {
        this.dispatch(connection.setStatus('disconnected'))
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
