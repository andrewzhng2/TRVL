import { AppShell, Avatar, Group, Menu, Text, Title } from '@mantine/core'
import './App.css'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Login from './pages/login'
import { fetchMe, logout as apiLogout, type SessionRead } from './api/client'
import Trips from './pages/trips'
import Navigation from './components/Navigation'
import TripMain from './pages/overview'
import InviteJoin from './pages/invite'
import TripBacklog from './pages/backlog'
import TripSchedule from './pages/schedule'
import TripItinerary from './pages/itinerary'
import TripTravel from './pages/travel'
import TripPacking from './pages/packing'
import TripBudget from './pages/budget'

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

type RequireAuthProps = { children: React.ReactElement }
function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()
  const raw = localStorage.getItem('trvl_session')
  if (!raw) {
    try {
      sessionStorage.setItem('trvl_post_login_redirect', location.pathname + location.search + location.hash)
    } catch {}
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  const location = useLocation()
  const isLogin = location.pathname === '/login'
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={isLogin ? undefined : { width: 280, breakpoint: 'sm' }}
      padding="md"
    >
      <AppShell.Header withBorder>
        <HeaderContent />
      </AppShell.Header>
      {!isLogin && (
        <AppShell.Navbar p="md" withBorder>
          <Navigation />
        </AppShell.Navbar>
      )}
      <AppShell.Main>
        <Routes>
          <Route path="/" element={<Navigate to="/trips" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/invite/:tripId/:code" element={<RequireAuth><InviteJoin /></RequireAuth>} />
          <Route path="/trips" element={<RequireAuth><Trips /></RequireAuth>} />
          <Route path="/:tripSlug" element={<RequireAuth><TripMain /></RequireAuth>} />
          <Route path="/:tripSlug/backlog" element={<RequireAuth><TripBacklog /></RequireAuth>} />
          <Route path="/:tripSlug/schedule" element={<RequireAuth><TripSchedule /></RequireAuth>} />
          <Route path="/:tripSlug/itinerary" element={<RequireAuth><TripItinerary /></RequireAuth>} />
          <Route path="/:tripSlug/travel" element={<RequireAuth><TripTravel /></RequireAuth>} />
          <Route path="/:tripSlug/packing" element={<RequireAuth><TripPacking /></RequireAuth>} />
          <Route path="/:tripSlug/budget" element={<RequireAuth><TripBudget /></RequireAuth>} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  )
}

export default App

function HeaderContent() {
  const { session, setSession } = useSession()
  async function handleLogout() {
    try {
      if (session?.token) await apiLogout(session.token)
    } catch { /* ignore */ }
    localStorage.removeItem('trvl_session')
    setSession(null)
    window.location.replace('/login')
  }
  return (
    <Group h="100%" pl="xl" pr="md" justify="space-between">
      <Link to="/trips" style={{ textDecoration: 'none', color: 'inherit' }}>
        <Group gap={8}>
          <Title order={2} className="brand-logo">TRVL</Title>
        </Group>
      </Link>
      {session && (
        <Group gap={8}>
          <Text size="sm" fw={600}>{session.user.name}</Text>
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <Avatar radius="xl" size={28} src={session.user.picture} alt={session.user.name} style={{ cursor: 'pointer' }}>
                {!session.user.picture && getInitials(session.user.name)}
              </Avatar>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={handleLogout}>Log out</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      )}
    </Group>
  )
}
