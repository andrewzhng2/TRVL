import { ActionIcon, Box, Divider, Group, Paper, ScrollArea, Stack, Text } from '@mantine/core'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { useMemo, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { listTrips, type Trip, getSchedule, type ScheduledEvent, listBacklogCards, type BacklogCard } from '../../api/client'
import { getTripIdFromSlug } from '../../utils/tripUtils'
import ItineraryMap, { type ItineraryStop } from './components/ItineraryMap'

function TripItinerary() {
  const { tripSlug } = useParams<{ tripSlug: string }>()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<ScheduledEvent[]>([])
  const [cards, setCards] = useState<BacklogCard[]>([])
  const [dayOffset, setDayOffset] = useState(0)

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

  useEffect(() => {
    async function loadData() {
      try {
        const [cardsRes] = await Promise.all([
          listBacklogCards(),
        ])
        setCards(cardsRes)
      } catch (e) {
        console.error('Failed to load backlog cards:', e)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    if (!trip) return
    let mounted = true
    getSchedule(trip.id)
      .then(items => { if (mounted) setSchedule(items) })
      .catch(e => console.error('Failed to load schedule:', e))
    return () => { mounted = false }
  }, [trip])

  const canNavigate = useMemo(() => {
    if (!trip?.start_date || !trip?.end_date) return { prev: true, next: true }
    const start = new Date(trip.start_date + 'T00:00:00')
    const end = new Date(trip.end_date + 'T00:00:00')
    const selected = new Date(start)
    selected.setDate(start.getDate() + dayOffset)
    const prevDate = new Date(selected); prevDate.setDate(selected.getDate() - 1)
    const nextDate = new Date(selected); nextDate.setDate(selected.getDate() + 1)
    return { prev: prevDate >= start, next: nextDate <= end }
  }, [trip?.start_date, trip?.end_date, dayOffset])

  const dayLabel = useMemo(() => {
    if (!trip?.start_date) return `Day ${dayOffset + 1}`
    const start = new Date(trip.start_date + 'T00:00:00')
    const date = new Date(start)
    date.setDate(start.getDate() + dayOffset)
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
  }, [trip?.start_date, dayOffset])

  const orderedStops: (ItineraryStop & { hour: number })[] = useMemo(() => {
    if (!trip) return []
    const windowDayIndex = dayOffset // day index relative to trip start
    const cardById = new Map(cards.map(c => [c.id, c]))
    return schedule
      .filter(s => s.day_index === windowDayIndex)
      .map(s => ({ s, card: cardById.get(s.card_id) }))
      .filter(x => x.card && x.card.locked_in)
      .sort((a, b) => a.s.hour - b.s.hour)
      .map(x => ({ id: x.card!.id, hour: x.s.hour, title: x.card!.title, location: x.card!.location || '' }))
  }, [trip, schedule, cards, dayOffset])

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
    <Stack gap="sm">
      <Paper withBorder p="sm" radius="md" style={{ height: 'calc(100dvh - 180px)', display: 'grid', gridTemplateColumns: '360px 1fr', gap: 12 }}>
        <Stack gap="xs" style={{ height: '100%', minHeight: 0 }}>
          <Group gap={6} align="center" justify="center" style={{ backgroundColor: '#1D2F6F', color: '#FFFFFF', borderRadius: 8, padding: '10px 12px' }}>
            <ActionIcon 
              variant="light" 
              onClick={() => setDayOffset(o => Math.max(0, o - 1))} 
              disabled={!canNavigate.prev} 
              aria-label="Previous day"
              style={{ color: '#1D2F6F', backgroundColor: 'white', border: '2px solid #2E6CF6' }}
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
            <Text fw={600} c="white">{dayLabel}</Text>
            <ActionIcon 
              variant="light" 
              onClick={() => setDayOffset(o => o + 1)} 
              disabled={!canNavigate.next} 
              aria-label="Next day"
              style={{ color: '#1D2F6F', backgroundColor: 'white', border: '2px solid #2E6CF6' }}
            >
              <IconChevronRight size={18} />
            </ActionIcon>
          </Group>
          <Divider my={4} />
          <ScrollArea.Autosize
            mah="100%"
            type="auto"
            offsetScrollbars
            scrollbars="y"
            styles={{ viewport: { overflowX: 'hidden' } }}
            style={{ flex: 1 }}
          >
            <Stack gap="xs">
              {orderedStops.length === 0 ? (
                <Text c="dimmed">No locked-in events scheduled for this day.</Text>
              ) : (
                orderedStops.map((s, idx) => (
                  <Box key={`${s.title}-${idx}`}>
                    <Group gap="sm" align="center" wrap="nowrap">
                      <Text fw={700} size="sm" style={{ width: 28, textAlign: 'right', flex: '0 0 28px' }}>{String(idx + 1)}</Text>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={600} title={s.title} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</Text>
                      </Box>
                    </Group>
                    <Text size="xs" c="dimmed" pl={44}>{`${s.hour}:00`}</Text>
                    {idx < orderedStops.length - 1 && <Divider my={8} />}
                  </Box>
                ))
              )}
            </Stack>
          </ScrollArea.Autosize>
        </Stack>
        <Box style={{ width: '100%', height: '100%' }}>
          <ItineraryMap stops={orderedStops} geocodeContext={trip.name} />
        </Box>
      </Paper>
    </Stack>
  )
}

export default TripItinerary


