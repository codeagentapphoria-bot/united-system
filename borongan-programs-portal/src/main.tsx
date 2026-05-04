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

// Fallback: hide splash after 2 seconds in case React never finishes mounting
setTimeout(hideSplash, 2000)

// Render React app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Hide splash once React renders (splash only exists on cold starts)
hideSplash()
