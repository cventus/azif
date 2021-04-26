import React, {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useSelector } from '../store'
import { DatedMessage } from '../ducks/messages'
import { ClientSocket } from '../ClientSocket'
import { GameState, SessionState } from '../../game/resources'

const Hours: React.FC<{ date: Date }> = ({ date }) => {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return (
    <>
      {hours}:{minutes}
    </>
  )
}

const GameEventRow: React.FC<{
  game: GameState
  gameEvent: DatedMessage
}> = React.memo(({ game, gameEvent }) => {
  return (
    <div>
      <Hours date={gameEvent.date} />
      &nbsp;
      <span>{gameEvent.clock}</span>
      &nbsp;
      <span>{gameEvent.action.type}</span>
      &nbsp;
      <span>{game.players[gameEvent.playerId].name}</span>
      &nbsp;
      {gameEvent.action.type === 'chat' && <span>{gameEvent.action.text}</span>}
    </div>
  )
})

const ChatBox: React.FC<{
  onChat: (text: string) => void
}> = ({ onChat }) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const sendChat = useCallback(
    (ev: FormEvent) => {
      ev.preventDefault()
      if (inputRef.current) {
        const text = inputRef.current.value
        onChat(text)
        inputRef.current.value = ''
      }
    },
    [onChat, inputRef],
  )

  return (
    <div>
      <form onSubmit={sendChat}>
        <input ref={inputRef} name="text" type="text" />
      </form>
    </div>
  )
}

export const GameEventsContainer: React.FC<{
  game: GameState
  socket: ClientSocket
  session: SessionState
}> = ({ game, socket }) => {
  const gameId = game.id
  const gameEvents = useSelector((state) => state.messages[gameId]) || []

  const [isLoadingEvents, setIsLoadingEvents] = useState(
    gameEvents.filter((x) => !x).length < 20,
  )

  // Load game events
  useEffect(() => {
    if (!isLoadingEvents) {
      return
    }

    // Look for the most recent unknown event
    let until = game.clock
    for (let i = 0; i < game.clock; i++) {
      const j = game.clock - i
      if (!gameEvents[j]) {
        break
      }
      until = gameEvents[j].clock
    }

    // Calculate start of the inclusive range
    const since = Math.max(until - 20, 0)
    if (since < until) {
      socket.send({
        type: 'get',
        resource: 'events',
        gameId,
        since,
        until,
      })
    }
    setIsLoadingEvents(false)
  }, [socket, game, isLoadingEvents, setIsLoadingEvents])

  const sendChat = useCallback(
    (text: string) => {
      if (text.length > 0 && socket) {
        socket.send({
          type: 'action',
          action: {
            type: 'chat',
            text,
          },
        })
      }
    },
    [socket],
  )

  const loadMoreEvents = useCallback(() => setIsLoadingEvents(true), [
    setIsLoadingEvents,
  ])

  const rollSome = (n: number) => (): void => void socket.send({
    type: 'action',
    action: {
      type: 'dice',
      roll: new Array(n).fill(null)
    }
  })

  const rollOne = useCallback(rollSome(1), [socket])
  const rollTwo = useCallback(rollSome(2), [socket])
  const rollThree = useCallback(rollSome(3), [socket])
  const rollFour = useCallback(rollSome(4), [socket])
  const rollFive = useCallback(rollSome(5), [socket])

  if (!game) {
    return null
  }

  return (
    <>
      <div>
        <ChatBox onChat={sendChat} />
      </div>
      <div>
        Roll:
        <button onClick={rollOne}>1</button>
        <button onClick={rollTwo}>2</button>
        <button onClick={rollThree}>3</button>
        <button onClick={rollFour}>4</button>
        <button onClick={rollFive}>5</button>
        <button>+</button>
      </div>
      <div>
        {gameEvents.reduceRight((acc, current) => {
          if (current) {
            acc.push(
              <GameEventRow
                key={current.clock}
                game={game}
                gameEvent={current}
              />,
            )
          }
          return acc
        }, [] as JSX.Element[])}
      </div>
      <div>
        <button onClick={loadMoreEvents}>More</button>
      </div>
    </>
  )
}

export default GameEventsContainer
