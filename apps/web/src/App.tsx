import { AppShell, Avatar, Group, Image, NavLink, Stack, Text, Title } from '@mantine/core'
import './App.css'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import Backlog from './pages/backlog'
import Schedule from './pages/schedule'
import Login from './pages/login'
import { fetchMe, type SessionRead } from './api/client'
import Trips from './pages/trips'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || 'U'
}

function useSession() {
  const [session, setSession] = useState<SessionRead | null>(() => {
    const raw = localStorage.getItem('trvl_session')
    if (!raw) return null
    try { return JSON.parse(raw) as SessionRead } catch { return null }
  })

  useEffect(() => {
    if (!session?.token) return
    let cancelled = false
    fetchMe(session.token)
      .then(user => { if (!cancelled) setSession(s => (s ? { ...s, user } : s)) })
      .catch(() => { /* ignore; keep local */ })
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'trvl_session') {
        const next = e.newValue ? JSON.parse(e.newValue) : null
        setSession(next)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => { cancelled = true; window.removeEventListener('storage', onStorage) }
  }, [session?.token])

  return { session, setSession }
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { session } = useSession()
  if (!session) return <Navigate to="/login" replace />
  return children
}

function App() {
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 280, breakpoint: 'sm' }}
      padding="md"
    >
      <AppShell.Header withBorder>
        <HeaderContent />
      </AppShell.Header>
      <AppShell.Navbar p="md" withBorder>
        <Stack gap="md">
          <Stack gap="xs">
            <NavLink label="Trips" defaultOpened fw={700} fz="lg">
              <NavLink label="Dubai" defaultOpened>
                <NavLink label="Backlog" component={Link} to="/dubai/backlog" />
                <NavLink label="Schedule" component={Link} to="/dubai/schedule" />
                <NavLink label="Travel" />
                <NavLink label="Packing" />
              </NavLink>
            </NavLink>
          </Stack>
        </Stack>
      </AppShell.Navbar>
      <AppShell.Main>
        <Routes>
          <Route path="/" element={<Navigate to="/trips" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/trips" element={<RequireAuth><Trips /></RequireAuth>} />
          <Route path="/dubai/backlog" element={<RequireAuth><Backlog /></RequireAuth>} />
          <Route path="/dubai/schedule" element={<RequireAuth><Schedule /></RequireAuth>} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  )
}

export default App

function HeaderContent() {
  const { session } = useSession()
  return (
    <Group h="100%" px="md" justify="space-between">
      <Group gap={8}>
        <Image alt="TRVL logo" src="/vite.svg" w={24} h={24} />
        <Title order={4}>TRVL</Title>
      </Group>
      {session && (
        <Group gap={8}>
          <Text size="sm" fw={600}>{session.user.name}</Text>
          <Avatar radius="xl" size={28} src={session.user.picture} alt={session.user.name}>
            {!session.user.picture && getInitials(session.user.name)}
          </Avatar>
        </Group>
      )}
    </Group>
  )
}
