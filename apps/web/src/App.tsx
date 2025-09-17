import { AppShell, Group, Image, NavLink, Stack, Title } from '@mantine/core'
import './App.css'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import Backlog from './pages/backlog'
import Schedule from './pages/schedule'

function App() {
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 280, breakpoint: 'sm' }}
      padding="md"
    >
      <AppShell.Header withBorder>
        <Group h="100%" px="md" justify="space-between">
          <Group gap={8}>
            <Image alt="TRVL logo" src="/vite.svg" w={24} h={24} />
            <Title order={4}>TRVL</Title>
          </Group>
        </Group>
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
          <Route path="/" element={<Navigate to="/dubai/backlog" replace />} />
          <Route path="/dubai/backlog" element={<Backlog />} />
          <Route path="/dubai/schedule" element={<Schedule />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  )
}

export default App
