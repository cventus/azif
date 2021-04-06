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

interface AppProps {
  history: History
}

export const MainView = styled.main``

const MainViewState = withVisualState(MainView, [
  'front',
  'games',
  'settings',
  'game',
  'unknown',
])

const App: React.FC<AppProps> = ({ history }) => {
  const page = useSelector((state) => state.view.page)
  const currentPage = page ? page.pageId : 'unknown'

  console.log(currentPage)

  return (
    <ConnectedRouter history={history}>
      <MainViewState state={currentPage}>
        {({ state, from, to }) => {
          const states = [state, from, to]
          return (
            <>
              {states.includes('front') && <AuthenticationContainer />}
              {states.includes('games') && <GamesContainer />}
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
