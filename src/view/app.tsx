import React, { useState } from 'react'
import { hot } from 'react-hot-loader/root'

import Button from './components/Button'

function App(props: any) {
  const [counter, setCounter] = useState(0)

  return (
    <>
       <h1>Title</h1>
      <Button />
    </>
  );
}

export default hot(App);
