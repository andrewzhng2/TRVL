import { Stack, Title, Text, Card, Group, Badge } from '@mantine/core'
import { useParams } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { listTrips, listTripLegs, type Trip, type TripLeg } from '../../api/client'
import { getTripIdFromSlug } from '../../utils/tripUtils'

function TripTravel() {
  const { tripSlug } = useParams<{ tripSlug: string }>()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [legs, setLegs] = useState<TripLeg[]>([])
  const [legsLoading, setLegsLoading] = useState(true)

  useEffect(() => {
    async function loadTrip() {
      try {
        const trips = await listTrips()
        const tripId = getTripIdFromSlug(tripSlug || '', trips)
        const foundTrip = trips.find(t => t.id === tripId)
        setTrip(foundTrip || null)
      } catch (error) {
        console.error('Failed to load trip:', error)
      } finally {
        setLoading(false)
      }
    }
    loadTrip()
  }, [tripSlug])

  useEffect(() => {
    if (!trip) return
    const tripId = trip.id
    let cancelled = false
    async function loadLegs() {
      try {
        setLegsLoading(true)
        const data = await listTripLegs(tripId)
        if (!cancelled) setLegs(data)
      } catch (error) {
        console.error('Failed to load trip legs:', error)
      } finally {
        if (!cancelled) setLegsLoading(false)
      }
    }
    loadLegs()
    return () => {
      cancelled = true
    }
  }, [trip])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!trip) {
    return (
      <Stack>
        <Title order={2}>Trip Not Found</Title>
        <Text>The trip you're looking for doesn't exist.</Text>
      </Stack>
    )
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Title order={2}>Travel - {trip.name}</Title>
      </Group>

      <Card withBorder radius="md" p="lg">
        <Stack gap="sm">
          <Card withBorder radius="md" p="xl">
            <Group justify="space-between" align="center">
              <Stack gap={2}>
                <Group gap="xs">
                  <Text fw={500} style={{ fontSize: '2rem' }}>Departure Travel</Text>
                  <Badge size="sm" variant="light">Start</Badge>
                </Group>
                <Text size="sm" c="dimmed">Trip start: {trip.start_date ?? 'TBD'}</Text>
              </Stack>
            </Group>
          </Card>

          {legsLoading ? (
            <Text>Loading legs...</Text>
          ) : legs.length === 0 ? (
            <Text c="dimmed" ta="center">No trip legs yet. They will appear here.</Text>
          ) : (
            (() => {
              const sorted = [...legs].sort((a, b) => a.order_index - b.order_index)
              const rows: ReactNode[] = []
              sorted.forEach((leg, index) => {
                // Leg row
                rows.push(
                <Card key={`leg-${leg.id}`} withBorder radius="md" p="xl">
                    <Group justify="space-between" align="center">
                      <Stack gap={2}>
                      <Group gap="xs">
                        <Text fw={500} style={{ fontSize: '2rem' }}>{leg.name}</Text>
                          <Badge size="sm" variant="light">Leg {index + 1}</Badge>
                        </Group>
                        <Text size="sm" c="dimmed">
                          {(leg.start_date ?? 'Start')} → {(leg.end_date ?? 'End')}
                        </Text>
                      </Stack>
                    </Group>
                  </Card>
                )

                // Between Travel row between consecutive legs
                if (index < sorted.length - 1) {
                  const next = sorted[index + 1]
                  rows.push(
                    <Card key={`between-${leg.id}-${next.id}`} withBorder radius="md" p="xl">
                      <Group justify="space-between" align="center">
                        <Stack gap={2}>
                          <Group gap="xs">
                            <Text fw={500} style={{ fontSize: '2rem' }}>Between Travel</Text>
                            <Badge size="sm" variant="light">{leg.name} → {next.name}</Badge>
                          </Group>
                          <Text size="sm" c="dimmed">
                            {(leg.end_date ?? 'End')} → {(next.start_date ?? 'Start')}
                          </Text>
                        </Stack>
                      </Group>
                    </Card>
                  )
                }
              })
              return <Stack gap="sm">{rows}</Stack>
            })()
          )}

          <Card withBorder radius="md" p="xl">
            <Group justify="space-between" align="center">
              <Stack gap={2}>
                <Group gap="xs">
                  <Text fw={500} style={{ fontSize: '2rem' }}>Return Travel</Text>
                  <Badge size="sm" variant="light">End</Badge>
                </Group>
                <Text size="sm" c="dimmed">Trip end: {trip.end_date ?? 'TBD'}</Text>
              </Stack>
            </Group>
          </Card>
        </Stack>
      </Card>
    </Stack>
  )
}

export default TripTravel
