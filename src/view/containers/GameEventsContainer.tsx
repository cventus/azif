import React, { FormEvent, Ref, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from '../store'
import { connection } from '../ducks/connection'
import { DatedMessage } from '../ducks/messages'

interface GameEventsContainerProps {
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

export const GameEventsContainer: React.FC<GameEventsContainerProps> = ({}) => {
  const dispatch = useDispatch()
  const gameEvents = useSelector((state) => state.messages.gameEvents)

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
    <>
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
  )
}

export default GameEventsContainer
