import React from 'react'
import { render } from 'react-dom'
import * as ReactRedux from 'react-redux'
import { SocketContext } from './client'
import { ClientSocket } from './ClientSocket'
import App from './containers/App'
import { connection } from './ducks'
import createStore from './store'

const root = document.createElement('div')
document.body.appendChild(root)

const socket = new ClientSocket({
  loginUrl: 'http://localhost:3001/ws',
  logoutUrl: 'http://localhost:3001/ws',
  openSocketUrl: 'ws://localhost:3001/ws',
})

const [store, history] = createStore(socket)

store.dispatch(connection.connect())

render(
  <ReactRedux.Provider store={store}>
    <SocketContext.Provider value={socket}>
      <App history={history} />
    </SocketContext.Provider>
  </ReactRedux.Provider>,
  root,
)
