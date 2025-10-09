import { NavLink, Stack } from '@mantine/core'
import { IconBackpack, IconCalendar, IconLayoutGrid, IconList, IconPlane, IconTrain, IconCurrencyDollar } from '@tabler/icons-react'
import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { listTrips, type Trip } from '../api/client'
import { generateTripSlug } from '../utils/tripUtils'

function Navigation() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    async function loadTrips() {
      try {
        const tripsData = await listTrips()
        setTrips(tripsData)
      } catch (error) {
        console.error('Failed to load trips:', error)
      } finally {
        setLoading(false)
      }
    }
    loadTrips()
  }, [])

  // Check if current path matches a trip section
  const isTripSection = (tripSlug: string, section: string) => {
    return location.pathname === `/${tripSlug}/${section}`
  }

  // Check if current path is a trip main page
  const isTripMain = (tripSlug: string) => {
    return location.pathname === `/${tripSlug}`
  }

  if (loading) {
    return (
      <Stack gap="md">
        <Stack gap="xs">
          <NavLink label="Trips" defaultOpened fw={700} fz="lg">
            <NavLink label="Loading..." />
          </NavLink>
        </Stack>
      </Stack>
    )
  }

  return (
    <Stack gap="md">
      <Stack gap="xs">
        <NavLink label="Trips" defaultOpened fw={700} fz="lg" leftSection={<IconPlane size={16} style={{ transform: 'translateY(1px)' }} />}>
          {trips.length === 0 ? (
            <NavLink label="No trips yet" disabled />
          ) : (
            trips.map((trip, index) => {
              const tripSlug = generateTripSlug(trip.name)
              const isOpen = location.pathname.startsWith(`/${tripSlug}`)
              
              return (
                <NavLink
                  key={trip.id}
                  label={trip.name}
                  defaultOpened={isOpen || index === 0}
                  component={Link}
                  to={`/${tripSlug}`}
                >
                  <NavLink 
                    label="Overview" 
                    component={Link} 
                    to={`/${tripSlug}`}
                    active={isTripMain(tripSlug)}
                    leftSection={<IconLayoutGrid size={16} style={{ transform: 'translateY(1px)' }} />}
                  />
                  <NavLink 
                    label="Backlog" 
                    component={Link} 
                    to={`/${tripSlug}/backlog`}
                    active={isTripSection(tripSlug, 'backlog')}
                    leftSection={<IconList size={16} style={{ transform: 'translateY(1px)' }} />}
                  />
                  <NavLink 
                    label="Schedule" 
                    component={Link} 
                    to={`/${tripSlug}/schedule`}
                    active={isTripSection(tripSlug, 'schedule')}
                    leftSection={<IconCalendar size={16} style={{ transform: 'translateY(1px)' }} />}
                  />
                  <NavLink 
                    label="Travel" 
                    component={Link} 
                    to={`/${tripSlug}/travel`}
                    active={isTripSection(tripSlug, 'travel')}
                    leftSection={<IconTrain size={16} style={{ transform: 'translateY(1px)' }} />}
                  />
                  <NavLink 
                    label="Packing" 
                    component={Link} 
                    to={`/${tripSlug}/packing`}
                    active={isTripSection(tripSlug, 'packing')}
                    leftSection={<IconBackpack size={16} style={{ transform: 'translateY(1px)' }} />}
                  />
                  <NavLink 
                    label="Budget / Expenses" 
                    component={Link} 
                    to={`/${tripSlug}/budget`}
                    active={isTripSection(tripSlug, 'budget')}
                    leftSection={<IconCurrencyDollar size={16} style={{ transform: 'translateY(1px)' }} />}
                  />
                </NavLink>
              )
            })
          )}
        </NavLink>
      </Stack>
    </Stack>
  )
}

export default Navigation
