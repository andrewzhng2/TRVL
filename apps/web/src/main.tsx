import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dates/styles.css'
import { BrowserRouter } from 'react-router-dom'
// One-time Google Maps script injector to guarantee keyed load before React renders
async function loadGoogleMaps(apiKey: string): Promise<void> {
  const w = window as unknown as { google?: { maps?: unknown } }
  if (typeof window !== 'undefined' && w.google?.maps) return
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })
}

const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
if (mapsApiKey) {
  await loadGoogleMaps(mapsApiKey)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="auto">
      <Notifications position="top-right" />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </StrictMode>,
)
