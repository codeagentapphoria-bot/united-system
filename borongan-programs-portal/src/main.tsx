import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'
import './components/ui/SplashScreen.css'

// Auto-hide branded splash when React finishes mounting
const hideSplash = () => {
  const splash = document.getElementById('splash')
  if (splash) {
    splash.classList.add('hide')
    setTimeout(() => splash.remove(), 300)
  }
}

// Fallback: always hide after 2 seconds
setTimeout(hideSplash, 2000)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Hide splash immediately after React renders (StrictMode renders twice in dev)
hideSplash()
