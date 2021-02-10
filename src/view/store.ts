import { ReducerState } from 'react'
import {
  applyMiddleware,
  compose,
  createStore as createReduxStore,
  Store,
} from 'redux'
import { History, createBrowserHistory } from 'history'

import createReducer from './ducks'
import { Action } from './ducks/actions'
import { routerMiddleware } from 'connected-react-router'
import { clientMiddleware } from './client'

export type State = ReducerState<ReturnType<typeof createReducer>>
export type Dispatch = ReturnType<typeof createStore>[0]['dispatch']

export default function createStore(
  initialState?: State,
): [Store<State, Action>, History] {
  const history = createBrowserHistory()
  const reducer = createReducer(history)

  const socketConfig = {
    loginUrl: 'http://localhost:3001/login',
    logoutUrl: 'http://localhost:3001/logout',
    openSocketUrl: 'ws://localhost:3001/login',
  }

  const store = createReduxStore(
    reducer,
    initialState,
    compose(
      applyMiddleware(
        routerMiddleware(history),
        clientMiddleware(socketConfig),
      ),
    ),
  )

  if (module.hot) {
    module.hot.accept('./ducks', () => {
      console.log('Reloading reducer')
      // eslint-disable-next-line
      const nextReducer = require('./ducks/index').default
      store.replaceReducer(nextReducer)
    })
  }

  return [store, history]
}
