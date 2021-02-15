import { hot } from 'react-hot-loader/root'
import React, { FormEvent, Ref, useCallback, useRef } from 'react'
import { History } from 'history'
import { ConnectedRouter } from 'connected-react-router'
import { useDispatch, useSelector } from './../store'
import { connection } from '../ducks/connection'
import { DatedMessage } from '../ducks/messages'

interface AppProps {
  history: History
}

const Hours = (props: { date: Date }) => {
  const { date } = props

  let hours = date.getHours().toString()
  if (hours.length === 1) {
    hours = '0' + hours
  }
  let minutes = date.getMinutes().toString()
  if (minutes.length === 1) {
    minutes = '0' + minutes
  }

  return <>{`${hours}:${minutes}`}</>
}

const GameEventRow = (props: { gameEvent: DatedMessage }) => {
  const { gameEvent } = props

  return (
    <div>
      <Hours date={gameEvent.date} />
      &nbsp;
      <span>{gameEvent.type}</span>
      &nbsp;
      {gameEvent.type === 'chat' && <span>{gameEvent.text}</span>}
    </div>
  )
}

function App({ history }: AppProps) {
  const dispatch = useDispatch()
  const connectionStatus = useSelector((state) => state.connection.status)
  const gameEvents = useSelector((state) => state.messages.gameEvents)

  const login = useCallback(() => {
    dispatch(connection.login())
  }, [dispatch])

  const logout = useCallback(() => {
    dispatch(connection.logout())
  }, [dispatch])

  const inputRef = useRef<HTMLInputElement>()

  const sendChat = useCallback(
    (ev: FormEvent) => {
      ev.preventDefault()
      if (inputRef.current) {
        const text = inputRef.current.value
        if (text.length > 0) {
          dispatch(
            connection.clientMessage({
              type: 'player-action',
              action: {
                type: 'chat',
                text,
              },
            }),
          )
          inputRef.current.value = ''
        }
      }
    },
    [dispatch, inputRef],
  )

  return (
    <ConnectedRouter history={history}>
      <h1>Main page</h1>

      {connectionStatus === 'disconnected' && (
        <button onClick={login}>Login</button>
      )}
      {connectionStatus === 'connecting' && <div>connecting...</div>}
      {connectionStatus === 'connected' && (
        <>
          <button onClick={logout}>Logout</button>

          <div>
            <form onSubmit={sendChat}>
              <input ref={inputRef as Ref<HTMLInputElement>} />
            </form>
          </div>
          <div>
            {gameEvents.reduceRight((acc, current) => {
              acc.push(
                <GameEventRow key={current.eventId} gameEvent={current} />,
              )
              return acc
            }, [] as JSX.Element[])}
          </div>
        </>
      )}
    </ConnectedRouter>
  )
}

export default hot(App)
