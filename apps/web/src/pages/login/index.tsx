import { Button, Center, Paper, Stack, Text, Title } from '@mantine/core'
import { useEffect, useState } from 'react'
import { loginWithGoogle, type SessionRead } from '../../api/client'

function LoginPage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Handle Google redirect response: /login#id_token=...
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
    console.log('[AuthDebug] location.hash =', window.location.hash)
    const params = new URLSearchParams(hash)
    const idToken = params.get('id_token')
    if (idToken) {
      ;(async () => {
        try {
          const session = await loginWithGoogle(idToken)
          localStorage.setItem('trvl_session', JSON.stringify(session))
          // Clean the hash and redirect
          history.replaceState(null, '', window.location.pathname + window.location.search)
          window.location.replace('/trips')
        } catch (e) {
          console.error('Google login failed', e)
          setError((e as Error).message || 'Login failed')
        }
      })()
      return
    }

    // If already logged in (without id_token), leave login page
    const existing = localStorage.getItem('trvl_session')
    if (existing) {
      window.location.replace('/trips')
      return
    }
  }, [])

  function startRedirectOAuth() {
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
      if (!clientId) throw new Error('Missing VITE_GOOGLE_CLIENT_ID')
      const origin = window.location.origin
      const redirectUri = `${origin}/login`
      const state = (window.crypto?.randomUUID?.() ?? String(Date.now()))
      const nonce = (window.crypto?.randomUUID?.() ?? String(Date.now()))
      sessionStorage.setItem('trvl_oauth_state', state)
      sessionStorage.setItem('trvl_oauth_nonce', nonce)
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      url.searchParams.set('client_id', clientId)
      url.searchParams.set('redirect_uri', redirectUri)
      url.searchParams.set('response_type', 'id_token')
      url.searchParams.set('scope', 'openid email profile')
      url.searchParams.set('nonce', nonce)
      url.searchParams.set('state', state)
      url.searchParams.set('prompt', 'select_account')
      ;(window as unknown as { __trvlAuthUrl?: string }).__trvlAuthUrl = url.toString()
      console.log('[AuthDebug] built auth URL =', url.toString())
      window.location.assign(url.toString())
    } catch (e) {
      setError((e as Error).message || 'Unable to start Google sign-in')
    }
  }

  return (
    <Center h="70dvh">
      <Paper withBorder p="lg" radius="md" w={380}>
        <Stack>
          <Title order={3}>Login</Title>
          <Text c="dimmed">Continue with Google.</Text>
          <Button onClick={startRedirectOAuth}>Continue with Google</Button>
          {error && <Text c="red">{error}</Text>}
        </Stack>
      </Paper>
    </Center>
  )
}

// The previous local dev-only optimistic session flow has been removed in favor of
// exchanging the Google ID token with the backend, which validates and persists
// the user and returns an API session token.

export default LoginPage


