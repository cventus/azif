import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import App from './app'
import createStore from './store'

const root = document.createElement('div')
document.body.appendChild(root)

const store = createStore()

render(
  <Provider store={store}>
    <App />
  </Provider>,
  root
)
