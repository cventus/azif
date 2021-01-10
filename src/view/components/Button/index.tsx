import React, { useState } from 'react'
import './style.css'

const Button = (props: {}) => {
  const [counter, setCounter] = useState(0)

  return (
    <button className="button-btn" onClick={() => setCounter(counter + 1)}>
      Clicks: {counter}
    </button>
  );
}

export default Button 
