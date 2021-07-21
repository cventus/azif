import React, {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useSelector } from '../../store'
import { DatedMessage } from '../../ducks/messages'
import { ClientSocket } from '../../ClientSocket'
import { GameState, SessionState } from '../../../game/resources'
import { GameAction } from '../../../game/actions'
import styled from 'styled-components'

const Hours: React.FC<{ date: Date }> = ({ date }) => {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return (
    <>
      {hours}:{minutes}
    </>
  )
}

const getAuthor = (game: GameState, event: DatedMessage): string =>
  game.players[event.playerId].name

const EventContainer = styled.div`
  display: flex;
`

const EventTime = styled.div`
  text-align: right;
  margin: 0 16px;
  color: #333;
`

const EventContent = styled.div`
  flex-grow: 1;
  margin: 0 16px;
`

const EventAuthor = styled.div`
  text-align: left;
  color: #333;
`

const EventRow: React.FC<{
  game: GameState
  event: DatedMessage
  showAuthor?: boolean
}> = ({ game, event, children, showAuthor = true }) => {
  return (
    <EventContainer>
      <EventTime>
        <Hours date={event.date} />
      </EventTime>
      <EventContent>
        {children}
        {showAuthor && <EventAuthor>{getAuthor(game, event)}</EventAuthor>}
      </EventContent>
    </EventContainer>
  )
}

const DiceContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin: 0 -8px;
`

const Die = styled.div`
  width: 32px;
  height: 32px;
  background-color: #5e1224;
  vertical-align: center;
  text-align: center;
  margin: 8px;
  color: white;
  line-height: 32px;
  border-radius: 16px;
  font-size: 24px;
`

const DiceEventRow: React.FC<{
  game: GameState
  event: DatedMessage
  action: GameAction & { type: 'dice' }
}> = ({ event, game, action }) => {
  const symbols = action.dice.map((side) => {
    if (side === 'investigation') {
      return '\u26B2'
    } else if (side === 'success') {
      return '\u26E7'
    } else {
      return ' '
    }
  })
  return (
    <EventRow game={game} event={event}>
      <DiceContainer>
        {symbols.map((symbol, i) => (
          <Die key={i}>{symbol}</Die>
        ))}
      </DiceContainer>
    </EventRow>
  )
}

const ChatEventRow: React.FC<{
  game: GameState
  event: DatedMessage
  action: GameAction & { type: 'chat' }
}> = ({ event, game, action }) => (
  <EventRow game={game} event={event} showAuthor={false}>
    <span>
      <b>{getAuthor(game, event)}</b>:{' '}
    </span>{' '}
    {action.text}
  </EventRow>
)

const GameEventRow: React.FC<{
  game: GameState
  gameEvent: DatedMessage
}> = React.memo(({ game, gameEvent }) => {
  const action = gameEvent.action
  switch (action.type) {
    case 'dice':
      return <DiceEventRow game={game} event={gameEvent} action={action} />

    case 'chat':
      return <ChatEventRow game={game} event={gameEvent} action={action} />
  }
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

export const EventsContainer: React.FC<{
  game: GameState
  socket: ClientSocket
  session: SessionState
}> = ({ game, socket }) => {
  const gameId = game.id
  const gameEvents = useSelector((state) => state.messages[gameId]) || []

  const [isLoadingEvents, setIsLoadingEvents] = useState(
    gameEvents.filter((x) => !x).length < 20,
  )

  console.log([socket, game, isLoadingEvents])

  // Load game events
  useEffect(() => {
    console.log('re-render', isLoadingEvents)
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
    console.log('loading more', since, until)

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

  const rollSome = (n: number) => (): void =>
    void socket.send({
      type: 'action',
      action: {
        type: 'dice',
        roll: new Array(n).fill(null),
      },
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

export default EventsContainer
