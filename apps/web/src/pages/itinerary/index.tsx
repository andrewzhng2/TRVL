import { Stack, Title, Text } from '@mantine/core'
import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { listTrips, type Trip } from '../../api/client'
import { getTripIdFromSlug } from '../../utils/tripUtils'

function TripItinerary() {
  const { tripSlug } = useParams<{ tripSlug: string }>()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTrip() {
      try {
        const trips = await listTrips()
        const id = getTripIdFromSlug(tripSlug || '', trips)
        const foundTrip = trips.find(t => t.id === id)
        setTrip(foundTrip || null)
      } catch (e) {
        console.error('Failed to load trip:', e)
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
      <div>
        <h2>Trip Not Found</h2>
        <p>The trip you're looking for doesn't exist.</p>
      </div>
    )
  }

  return (
    <Stack>
      <Title order={2}>Itinerary Map - {trip.name}</Title>
      <Text c="dimmed">This is a placeholder. The itinerary builder will go here.</Text>
    </Stack>
  )
}

export default TripItinerary


