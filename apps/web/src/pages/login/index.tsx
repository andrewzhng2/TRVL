import { Button, Center, Paper, Stack, Text, Title } from '@mantine/core'
import { useEffect, useState } from 'react'
import type { SessionRead } from '../../api/client'

function LoginPage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Handle Google redirect response: /login#id_token=...
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
    console.log('[AuthDebug] location.hash =', window.location.hash)
    const params = new URLSearchParams(hash)
    const idToken = params.get('id_token')
    if (idToken) {
      // Store optimistic session and immediately leave login
      const optimistic = buildOptimisticSession(idToken)
      if (optimistic) localStorage.setItem('trvl_session', JSON.stringify(optimistic))
      history.replaceState(null, '', window.location.pathname + window.location.search)
      window.location.replace('/trips')
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

function parseJwt(token: string): { email?: string; name?: string; picture?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload
  } catch {
    return null
  }
}

function buildOptimisticSession(idToken: string): SessionRead | null {
  const claims = parseJwt(idToken)
  if (!claims) return null
  const user = {
    id: 0,
    email: claims.email || '',
    name: claims.name || claims.email || 'User',
    picture: claims.picture || '',
  }
  return { token: `local:${idToken.slice(0, 16)}`, user }
}

export default LoginPage


