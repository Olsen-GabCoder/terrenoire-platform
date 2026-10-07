import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/design-system-v2.css'
import './styles/design-system-compat.css'
import './styles/typography-utilities.css'
import './index.css'
import App from './App.jsx'
import { reloadOnceForNewVersion } from './utils/appVersion'

// Une page chargée à la demande est introuvable (nouvelle version en ligne
// depuis l'ouverture de l'onglet) : on recharge une fois au lieu d'afficher
// une erreur. Si le rechargement vient d'avoir lieu, l'erreur suit son cours.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForNewVersion()) event.preventDefault()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
