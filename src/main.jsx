import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { getInitialTheme } from './i18n/useTheme'
import './index.css'
import App from './App.jsx'

document.documentElement.dataset.theme = getInitialTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
