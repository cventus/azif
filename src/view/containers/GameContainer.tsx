import React, { useEffect } from 'react'
import { useDispatch, useSelector } from '../store'
import { ClientSocket } from '../ClientSocket'
import { GameState, SessionState } from '../../game/resources'
import EventsContainer from './game/EventsContainer'
import { GamePage } from '../ducks/view'
import { replace } from 'connected-react-router'
import { toGameEventsPage, toGameLobbyPage } from '../paths'
import styled, { keyframes } from 'styled-components'
import { withVisualState } from '../util/withVisualState'
import LobbyContainer from './game/LobbyContainer'
import CharacterSelectionContainer from './game/CharacterSelectionContainer'
import CharacterContainer from './game/CharacterContainer'

const Filler = styled.div`
  height: 100vh;
  width: 100vw;
`

const nothing = keyframes`
  from {}
  to   {}
`

const lobbyToCharacterSelect = keyframes`
  from {
    transform: perspective(100vw) rotateY(0) translate(0, 0);
    opacity: 1;
  }
  to {
    transform: perspective(100vw) rotateY(60deg) translate(-50vw, 0vh);
    opacity: 0;
  }
`

const enterCharacterSelect = keyframes`
  from {
    transform: perspective(100vw) rotateY(-30deg) translate(25vw, 0vh);
    opacity: 0;
  }
  25% {
    transform: perspective(100vw) rotateY(-30deg) translate(25vw, 0vh);
    opacity: 0;
  }
  to {
    transform: perspective(100vw) rotateY(0) translate(0, 0);
    opacity: 1;
  }
`

const duration = '0.50s'

const GameView = styled.article`
  position: relative;

  &.TO_lobby,
  &.TO_select-character {
    animation: ${duration} ${nothing};
    overflow: hidden;
  }

  &.STATE_lobby.TO_select-character > .lobby-container,
  &.STATE_select-character.TO_lobby > .lobby-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    animation: ${duration} ${lobbyToCharacterSelect} ease-in-out;
  }

  &.STATE_select-character.TO_lobby > .lobby-container {
    animation-direction: reverse;
  }

  &.STATE_lobby.TO_select-character > .character-selection-container,
  &.STATE_select-character.TO_lobby > .character-selection-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    animation: ${duration} ${enterCharacterSelect} ease-in-out;
  }

  &.TO_lobby.STATE_select-character > .character-selection-container {
    animation-direction: reverse;
  }
`

const GameViewState = withVisualState(GameView, (a: GamePage) => a.subPageId)

const isPage = <PageId extends GamePage['subPageId']>(tag: PageId) => (
  page: GamePage | undefined,
): page is GamePage & { subPageId: PageId } => {
  return page ? page.subPageId === tag : false
}

const isLobbyPage = isPage('lobby')
const isCharacterSelectionPage = isPage('select-character')
const isEventsPage = isPage('events')
const isCharacterPage = isPage('character')

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

        const lobby = states.find(isLobbyPage)
        const selectCharacter = states.find(isCharacterSelectionPage)
        const events = states.find(isEventsPage)
        const character = states.find(isCharacterPage)

        return (
          <>
            {lobby && (
              <div className="lobby-container">
                <LobbyContainer game={game} socket={socket} session={session} />
              </div>
            )}
            {selectCharacter && (
              <div className="character-selection-container">
                <CharacterSelectionContainer
                  game={game}
                  socket={socket}
                  session={session}
                  characterId={selectCharacter.characterId}
                />
              </div>
            )}
            {events && (
              <div className="events-container">
                <EventsContainer
                  game={game}
                  socket={socket}
                  session={session}
                />
              </div>
            )}
            {character && (
              <div className="characters-container">
                <CharacterContainer
                  game={game}
                  socket={socket}
                  session={session}
                />
              </div>
            )}
            {
              /* Render something that takes up the whole page while animating. */
              (to || from) && <Filler />
            }
          </>
        )
      }}
    </GameViewState>
  )
}

export default GameContainer
