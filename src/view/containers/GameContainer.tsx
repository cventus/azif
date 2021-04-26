import React, { useCallback, useContext, useEffect } from 'react'
import { useSelector } from '../store'
import { ClientSocket, SocketContext } from '../ClientSocket'
import { ContentSet, GameState, SessionState } from '../../game/resources'
import GameEventsContainer from './GameEventsContainer'
import { Page } from '../ducks/view'
import CharacterSelectionList from '../components/CharacterSelectionList'
import PlayerList from '../components/PlayerList'

export const GameStarting: React.FC<{
  game: GameState
  session: SessionState
  content: Record<string, ContentSet>
  socket: ClientSocket
}> = ({ game, session, content, socket }) => {
  const onSelectCharacter = useCallback((characterId: string) => {
    const isSelected = Object.values(game.players).map((p) => p.characterId).includes(characterId)
    const oldCharacterId = game.players[session.id].characterId || null
    if (!isSelected) {
      socket.send({
        type: 'action',
        action: {
          type: 'switch-character',
          playerId: session.id,
          newCharacter: characterId,
          oldCharacter: oldCharacterId,
        }
      })
    }
  }, [socket, game, session])

  const onStartGame = useCallback(() => {
    socket.send({
      type: 'action',
      action: {
        type: 'start-game',
      }
    })
  }, [socket])

  const canStartGame = Object.values(game.players).every((p) => p.characterId)

  return (
    <>
      <h1>{game.name}</h1>
      <PlayerList game={game} />
      <h1>Select character</h1>
      <CharacterSelectionList
        game={game}
        session={session}
        content={content}
        onSelectCharacter={onSelectCharacter}
      />
      <button onClick={onStartGame} disabled={!canStartGame}>Start</button>
    </>
  )
}

export const GameContainer: React.FC<{
  gameId: string
  page: Page & { pageId: 'game' }
}> = ({ gameId }) => {
  const socket = useContext(SocketContext)
  const game: GameState | undefined = useSelector((state) => state.game.games[gameId]) 
  const session = useSelector((state) => state.session.state)
  const currentGameId = session?.currentGameId
  const content = useSelector((state) => state.content.sets)

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
  }, [socket, !game, session?.gameIds, gameId])

  // Load content sets
  useEffect(() => {
    if (socket && game && game.contentSetIds) {
      for (const contentSetId of game.contentSetIds) {
        if (!(contentSetId in content)) {
          socket.send({
            type: 'get',
            resource: 'content-set',
            contentSetId,
          })
        }
      }
    }
  }, [socket, game && game.contentSetIds])

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
  } else if (game.phase === 'starting') {
    return <GameStarting
      game={game}
      socket={socket}
      session={session}
      content={content}
    />
  } else {
    return <GameEventsContainer game={game} socket={socket} session={session} />
  }
}

export default GameContainer
