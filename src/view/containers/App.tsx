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
import GameEventsContainer from './GameEventsContainer'
import NewGameContainer from './NewGameContainer'

interface AppProps {
  history: History
}

export const MainView = styled.main``

const MainViewState = withVisualState(MainView, [
  'front',
  'games',
  'settings',
  'game',
  'new-game',
  'authenticate',
])

const App: React.FC<AppProps> = ({ history }) => {
  const page = useSelector((state) => state.view.page)
  const session = useSelector((state) => state.session.state)
  const currentPage = !session ? 'authenticate' : page ? page.pageId : 'front'

  console.log(currentPage)

  return (
    <ConnectedRouter history={history}>
      <MainViewState state={currentPage}>
        {({ state, from, to }) => {
          const states = [state, from, to]
          return (
            <>
              {states.includes('authenticate') && <AuthenticationContainer />}
              {(states.includes('front') || states.includes('games')) && <GamesContainer />}
              {states.includes('new-game') && <NewGameContainer />}
              {states.includes('settings') && <SettingsContainer />}
              {states.includes('game') && <GameEventsContainer />}
            </>
          )
        }}
      </MainViewState>
    </ConnectedRouter>
  )
}

export default hot(App)
