import { Stack, Title, Text, Card, Group, Badge } from '@mantine/core'
import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { listTrips, type Trip } from '../../api/client'
import { getTripIdFromSlug } from '../../utils/tripUtils'

function TripTravel() {
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
        <Title order={2}>Travel - {trip.name}</Title>
        <Badge color="green" variant="light">Coming Soon</Badge>
      </Group>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Title order={3}>Travel Planning</Title>
          <Text>
            This section will help you organize all your travel logistics for {trip.name}.
          </Text>
          <Text size="sm" c="dimmed">
            Features coming soon:
          </Text>
          <Stack gap="xs">
            <Text size="sm">• Flight bookings and confirmations</Text>
            <Text size="sm">• Hotel reservations and check-in details</Text>
            <Text size="sm">• Ground transportation (rental cars, public transit)</Text>
            <Text size="sm">• Travel documents and visa requirements</Text>
            <Text size="sm">• Airport and station information</Text>
            <Text size="sm">• Travel insurance and emergency contacts</Text>
          </Stack>
        </Stack>
      </Card>
    </Stack>
  )
}

export default TripTravel
