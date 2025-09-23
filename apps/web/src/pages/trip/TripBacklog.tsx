import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { listTrips, type Trip } from '../../api/client'
import { getTripIdFromSlug } from '../../utils/tripUtils'
import BacklogBoard from '../backlog/components/BacklogBoard'

function TripBacklog() {
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
      <div>
        <h2>Trip Not Found</h2>
        <p>The trip you're looking for doesn't exist.</p>
      </div>
    )
  }

  return <BacklogBoard tripId={trip.id} />
}

export default TripBacklog
