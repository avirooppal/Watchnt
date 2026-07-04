import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ToastProvider } from '../contexts/ToastContext'
import '../index.css'
import Popup from './Popup.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <Popup />
    </ToastProvider>
  </StrictMode>,
)
