import React from 'react'
import { render } from 'react-dom'
import * as ReactRedux from 'react-redux'
import App from './app'
import createStore from './store'

const root = document.createElement('div')
document.body.appendChild(root)

const [store, history] = createStore()

render(
  <ReactRedux.Provider store={store}>
    <App history={history} />
  </ReactRedux.Provider>,
  root
)
