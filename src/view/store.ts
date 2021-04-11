import { ReducerState } from 'react'
import {
  applyMiddleware,
  compose,
  createStore as createReduxStore,
  Store,
} from 'redux'
import {
  useDispatch as useGenericDispatch,
  useStore as useGenericStore,
  useSelector as useGenericSelector,
} from 'react-redux'
import { History, createBrowserHistory } from 'history'

import createReducer from './ducks'
import { Action } from './ducks/actions'
import { routerMiddleware } from 'connected-react-router'
import { clientMiddleware } from './client'
import { ClientSocket } from './ClientSocket'

export type State = ReducerState<ReturnType<typeof createReducer>>
export type Dispatch = ReturnType<typeof createStore>[0]['dispatch']

type EqualityFn<T> = (lhs: T, rhs: T) => boolean

export const useDispatch: () => Dispatch = useGenericDispatch
export const useStore: () => Store<State, Action> = useGenericStore
export const useSelector: <T>(
  selector: (state: State) => T,
  equalityFn?: EqualityFn<T>,
) => T = useGenericSelector

export default function createStore(
  socket: ClientSocket,
  initialState?: State,
): [Store<State, Action>, History] {
  const history = createBrowserHistory()
  const reducer = createReducer(history)

  const store = createReduxStore(
    reducer,
    initialState,
    compose(
      applyMiddleware(
        routerMiddleware(history),
        clientMiddleware(socket),
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
