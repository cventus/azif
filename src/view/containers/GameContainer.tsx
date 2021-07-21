import React, { useEffect } from 'react'
import { useDispatch, useSelector } from '../store'
import { ClientSocket } from '../ClientSocket'
import { GameState, SessionState } from '../../game/resources'
import EventsContainer from './game/EventsContainer'
import { GamePage } from '../ducks/view'
import { replace } from 'connected-react-router'
import { toGameEventsPage, toGameLobbyPage } from '../paths'
import styled from 'styled-components'
import { withVisualState } from '../util/withVisualState'
import LobbyContainer from './game/LobbyContainer'
import CharacterSelectionContainer from './game/CharacterSelectionContainer'
import CharacterContainer from './game/CharacterContainer'

const GameView = styled.article``

const GameViewState = withVisualState(GameView, (a: GamePage) => a.subPageId)

export const GameContainer: React.FC<{
  gameId: string
  socket: ClientSocket
  session: SessionState
  page: GamePage
}> = ({ gameId, socket, session, page }) => {
  const game: GameState | undefined = useSelector(
    (state) => state.game.games[gameId],
  )
  const currentGameId = session.currentGameId
  const content = useSelector((state) => state.content.sets)
  const dispatch = useDispatch()

  // Load game
  useEffect(() => {
    if (!session.gameIds.includes(gameId)) {
      socket
        .send({
          type: 'join-game',
          gameId,
        })
        .then(() => {
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
  }, [socket, !game, session.gameIds, gameId])

  // Load content sets
  useEffect(() => {
    if (game && game.contentSetIds) {
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
  }, [game && game.contentSetIds])

  // Subscribe to game
  useEffect(() => {
    if (currentGameId !== gameId) {
      socket.send({
        type: 'subscribe-to-game',
        gameId,
      })
    }
  })

  // Redirect from game root path to specific page
  useEffect(() => {
    if (page.subPageId === 'start' && game) {
      if (game.phase === 'starting') {
        dispatch(replace(toGameLobbyPage(game.id)))
      } else {
        dispatch(replace(toGameEventsPage(game.id)))
      }
    }
  }, [dispatch, game, page.subPageId])

  // Check that everything is loaded
  if (!game || session.currentGameId !== gameId) {
    return null
  }

  // Render current game view
  return (
    <GameViewState state={page}>
      {({ state, from, to }) => {
        const states = [state, from, to]

        const lobby = states.find((p) => p?.subPageId === 'lobby')
        const selectCharacter = states.find(
          (p) => p?.subPageId === 'select-character',
        )
        const events = states.find((p) => p?.subPageId === 'events')
        const character = states.find((p) => p?.subPageId === 'character')

        return (
          <>
            {lobby && (
              <LobbyContainer game={game} socket={socket} session={session} />
            )}
            {selectCharacter && (
              <CharacterSelectionContainer
                game={game}
                socket={socket}
                session={session}
              />
            )}
            {events && (
              <EventsContainer game={game} socket={socket} session={session} />
            )}
            {character && (
              <CharacterContainer
                game={game}
                socket={socket}
                session={session}
              />
            )}
          </>
        )
      }}
    </GameViewState>
  )
}

export default GameContainer
