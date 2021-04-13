import React from 'react'
import { render } from 'react-dom'
import * as ReactRedux from 'react-redux'
import {
  ClientSocket,
  RequestTimeoutError,
  SocketContext,
} from './ClientSocket'
import App from './containers/App'
import { Action } from './ducks/actions'
import createStore from './store'

const root = document.createElement('div')
document.body.appendChild(root)

const [store, history] = createStore()

const socket = new ClientSocket({
  loginUrl: 'http://localhost:3001/ws',
  logoutUrl: 'http://localhost:3001/ws',
  openSocketUrl: 'ws://localhost:3001/ws',
})

socket.onNotification = (notification) => {
  store.dispatch({
    type: 'connection/notification',
    notification,
  } as Action)
}

socket.onConnectionStatusChange = (status) => {
  store.dispatch({
    type: 'connection/setStatus',
    status,
  } as Action)
}

socket.onRequest = (request) => {
  store.dispatch({
    type: 'connection/request',
    request: request,
  } as Action)
}

socket.onResponse = (request, response) => {
  store.dispatch({
    type: 'connection/response',
    request: request,
    response: response,
    status: 'ok',
  } as Action)
}

socket.onErrorResponse = (request, err) => {
  if (err instanceof RequestTimeoutError) {
    store.dispatch({
      type: 'connection/response',
      request: request,
      status: 'timeout',
    } as Action)
  } else {
    console.error(err)
  }
}

socket.connect()

render(
  <ReactRedux.Provider store={store}>
    <SocketContext.Provider value={socket}>
      <App history={history} />
    </SocketContext.Provider>
  </ReactRedux.Provider>,
  root,
)
