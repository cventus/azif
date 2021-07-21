import React, {
  ChangeEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import { GameState } from '../../game/resources'
import { SocketContext } from '../ClientSocket'
import { toGamePage, toNewGamePage, toSettingsPage } from '../paths'
import { useSelector } from '../store'

const GamePreview: React.FC<{ game?: GameState }> = React.memo(({ game }) => {
  if (!game) {
    return <p>Loading...</p>
  }

  const createdAt = new Date(game.createdAt).toDateString()

  return (
    <li>
      <div>
        <Link to={toGamePage(game.id)}>{game.name}</Link>
      </div>
      <div>{createdAt}</div>
    </li>
  )
})

export const GamesContainer: React.FC = () => {
  const session = useSelector((state) => state.session)
  const allGames = useSelector((state) => state.game.games)
  const socket = useContext(SocketContext)
  const inputRef = useRef<HTMLInputElement>(null)
  const [joinGameId, setJoinGameId] = useState<string>('')

  const gameIds = session.state ? session.state.gameIds : []

  useEffect(() => {
    gameIds.forEach((gameId) => {
      if (!allGames[gameId] && socket) {
        socket.getGame(gameId)
      }
    })
  })

  const onJoinIdChanged = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
    setJoinGameId(ev.target.value)
  }, [])

  return (
    <div>
      <nav>
        <ul>
          <li>Games</li>
          <li>
            <Link to={toSettingsPage()}>Settings</Link>
          </li>
        </ul>
      </nav>
      <main>
        <h1>Games</h1>
        <ol>
          {gameIds.map((gameId, i) => (
            <GamePreview key={gameId} game={allGames[gameId]} />
          ))}
        </ol>
        <div>
          <Link to={toNewGamePage()} type="button">
            New Game
          </Link>
        </div>
        <div>
          <input
            type="text"
            ref={inputRef}
            value={joinGameId}
            onChange={onJoinIdChanged}
          />
          <Link
            to={joinGameId.length > 0 ? toGamePage(joinGameId) : '#'}
            type="button"
          >
            Join Game
          </Link>
        </div>
      </main>
    </div>
  )
}

export default GamesContainer
