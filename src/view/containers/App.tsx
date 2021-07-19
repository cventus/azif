import { hot } from 'react-hot-loader/root'
import React from 'react'
import { History } from 'history'
import { ConnectedRouter } from 'connected-react-router'
import { useSelector } from './../store'
import styled from 'styled-components'
import { withVisualState } from '../util/withVisualState'
import AuthenticationContainer from './AuthenticationContainer'
import GamesContainer from './GamesContainer'
import SettingsContainer from './SettingsContainer'
import NewGameContainer from './NewGameContainer'
import GameContainer from './GameContainer'
import { Page } from '../ducks/view'

interface AppProps {
  history: History
}

export const MainView = styled.main``

type TopLevelPage = Page | { pageId: 'authenticate' }

const isPage = <PageId extends string>(tag: PageId) => (
  page: TopLevelPage | undefined,
): page is TopLevelPage & { pageId: PageId } => {
  return page ? page.pageId === tag : false
}

const isAuthtenticationPage = isPage('authenticate')
const isFrontPage = isPage('front')
const isGamesPage = isPage('games')
const isNewGamePage = isPage('new-game')
const isSettingsPage = isPage('settings')
const isGamePage = isPage('game')

const MainViewState = withVisualState(MainView, (a: TopLevelPage) => a.pageId)

const App: React.FC<AppProps> = ({ history }) => {
  const page = useSelector((state) => state.view.page)
  const session = useSelector((state) => state.session.state)
  const currentPage: TopLevelPage = !session
    ? { pageId: 'authenticate' }
    : page || { pageId: 'front' }

  console.log(currentPage)

  return (
    <ConnectedRouter history={history}>
      <MainViewState state={currentPage}>
        {({ state, from, to }) => {
          const states = [state, from, to]

          const authenticate = states.find(isAuthtenticationPage)
          const front = states.find(isFrontPage)
          const games = states.find(isGamesPage)
          const newGame = states.find(isNewGamePage)
          const settings = states.find(isSettingsPage)
          const game = states.find(isGamePage)

          return (
            <>
              {authenticate && <AuthenticationContainer />}
              {(front || games) && <GamesContainer />}
              {newGame && <NewGameContainer />}
              {settings && <SettingsContainer />}
              {game && <GameContainer gameId={game.gameId} page={game} />}
            </>
          )
        }}
      </MainViewState>
    </ConnectedRouter>
  )
}

export default hot(App)
