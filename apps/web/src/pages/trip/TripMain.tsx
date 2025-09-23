import { Stack, Title, Text, Card, Group, Badge } from '@mantine/core'
import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { listTrips, type Trip } from '../../api/client'
import { getTripIdFromSlug } from '../../utils/tripUtils'

function TripMain() {
  const { tripSlug } = useParams<{ tripSlug: string }>()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)

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
        <Title order={2}>{trip.name}</Title>
        <Badge color="blue" variant="light">
          {trip.start_date && trip.end_date 
            ? `${trip.start_date} → ${trip.end_date}`
            : 'No dates set'
          }
        </Badge>
      </Group>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Title order={3}>Trip Overview</Title>
          <Text>
            Welcome to your {trip.name} trip! This is the main dashboard where you can get an overview of your trip planning progress.
          </Text>
          <Text size="sm" c="dimmed">
            Use the navigation on the left to access different sections of your trip planning:
          </Text>
          <Stack gap="xs">
            <Text size="sm">• <strong>Backlog</strong> - Manage your list of activities and places to visit</Text>
            <Text size="sm">• <strong>Schedule</strong> - Plan your daily itinerary</Text>
            <Text size="sm">• <strong>Travel</strong> - Organize transportation and logistics</Text>
            <Text size="sm">• <strong>Packing</strong> - Create and manage your packing lists</Text>
          </Stack>
        </Stack>
      </Card>
    </Stack>
  )
}

export default TripMain
