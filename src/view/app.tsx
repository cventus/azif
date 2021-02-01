import { hot } from 'react-hot-loader/root'
import React from 'react'
import { History } from 'history'
import { ConnectedRouter } from 'connected-react-router'

interface AppProps {
  history: History
}

function App({ history }: AppProps) {
  return (
    <ConnectedRouter history={history}>
      <h1>Main page</h1>

    </ConnectedRouter>
  );
}

export default hot(App);
