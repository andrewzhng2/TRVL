import { Stack, Title, Text, Card, Group, Badge } from '@mantine/core'
import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { listTrips, type Trip } from '../../api/client'
import { getTripIdFromSlug } from '../../utils/tripUtils'

function TripPacking() {
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
        <Title order={2}>Packing - {trip.name}</Title>
        <Badge color="orange" variant="light">Coming Soon</Badge>
      </Group>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Title order={3}>Packing Lists</Title>
          <Text>
            This section will help you organize your packing for {trip.name}.
          </Text>
          <Text size="sm" c="dimmed">
            Features coming soon:
          </Text>
          <Stack gap="xs">
            <Text size="sm">• Create custom packing lists by category</Text>
            <Text size="sm">• Weather-based packing suggestions</Text>
            <Text size="sm">• Activity-specific gear recommendations</Text>
            <Text size="sm">• Checklist with check-off functionality</Text>
            <Text size="sm">• Weight and space optimization tips</Text>
            <Text size="sm">• Share packing lists with travel companions</Text>
          </Stack>
        </Stack>
      </Card>
    </Stack>
  )
}

export default TripPacking
