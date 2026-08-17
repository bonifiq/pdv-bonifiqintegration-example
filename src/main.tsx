import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { resolveAppVariant } from './appVariant'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App variant={resolveAppVariant(window.location.pathname)} /></React.StrictMode>)
