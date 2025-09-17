import { Center, Paper, Stack, Text, Title } from '@mantine/core'
import { useEffect, useRef, useState } from 'react'
import { loginWithGoogle, type SessionRead } from '../../api/client'

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (opts: { client_id: string; ux_mode?: 'popup' | 'redirect'; use_fedcm_for_prompt?: boolean; callback: (response: { credential: string }) => void }) => void
          renderButton: (parent: HTMLElement, opts?: Record<string, unknown>) => void
          prompt: () => void
        }
      }
    }
  }
}

function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const buttonRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Load Google Identity Services script if not present
    if (!window.google) {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.onload = () => initGis()
      document.head.appendChild(script)
    } else {
      initGis()
    }
  }, [])

  function initGis() {
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
      if (!clientId) return
      if (!window.google || !window.google.accounts || !window.google.accounts.id) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        ux_mode: 'popup',
        use_fedcm_for_prompt: false,
        callback: async (response: { credential: string }) => {
          try {
            const session: SessionRead = await loginWithGoogle(response.credential)
            localStorage.setItem('trvl_session', JSON.stringify(session))
            window.location.replace('/trips')
          } catch (e) {
            setError((e as Error).message || 'Login failed')
          }
        },
      })
      if (buttonRef.current && window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'left',
          width: 320,
        })
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to initialize Google Sign-In')
    }
  }

  return (
    <Center h="70dvh">
      <Paper withBorder p="lg" radius="md" w={380}>
        <Stack>
          <Title order={3}>Login</Title>
          <Text c="dimmed">Continue with Google. No passwords required.</Text>
          <div ref={buttonRef} />
          {error && <Text c="red">{error}</Text>}
        </Stack>
      </Paper>
    </Center>
  )
}

export default LoginPage


