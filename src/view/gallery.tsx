import React from 'react'
import { render } from 'react-dom'
import Gallery from './components/Gallery'

const root = document.createElement('div')
document.body.appendChild(root)

render(<Gallery />, root)
