import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PellitoneScene from './Pellitone'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PellitoneScene />
  </StrictMode>,
)
