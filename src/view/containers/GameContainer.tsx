import React, { useContext, useEffect } from 'react'
import { useSelector } from '../store'
import { SocketContext } from '../ClientSocket'
import { GameState } from '../../game/resources'
import GameEventsContainer from './GameEventsContainer'
import { Page } from '../ducks/view'

export const GameContainer: React.FC<{
  gameId: string
  page: Page & { pageId: 'game' }
}> = ({ gameId }) => {
  const socket = useContext(SocketContext)
  const game: GameState | undefined = useSelector((state) => state.game.games[gameId]) 
  const session = useSelector((state) => state.session.state)
  const currentGameId = session?.currentGameId

  // Load game
  useEffect(() => {
    if (socket) {
      if (!session?.gameIds.includes(gameId)) {
        socket.send({
          type: 'join-game',
          gameId,
        }).then(() => {
          socket.send({
            type: 'get',
            resource: 'game',
            gameId,
          })
        })
      }
      if (!game) {
        socket.send({
          type: 'get',
          resource: 'game',
          gameId,
        })
      }
    }
  }, [socket, game, session, gameId])

  // Subscribe to game
  useEffect(() => {
    if (socket) {
      if (currentGameId !== gameId) {
        socket.send({
          type: 'subscribe-to-game',
          gameId,
        })
      } 
    }
  })

  if (!game || !socket || !session || session.currentGameId !== gameId) {
    return null
  } else {
    return <GameEventsContainer game={game} socket={socket} session={session} />
  }
}

export default GameContainer
