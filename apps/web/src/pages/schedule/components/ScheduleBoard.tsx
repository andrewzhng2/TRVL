import { Box, Group, Paper, ScrollArea, Select, SimpleGrid, Stack, Text, Title, ActionIcon } from '@mantine/core'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { listBacklogCards, type BacklogCard as ApiBacklogCard, listTrips, type Trip } from '../../../api/client'

type Category = 'hotels' | 'activities' | 'food' | 'clubs'

type EventLite = {
  id: string
  title: string
  desire: number | null
  category: Category
  locked_in: boolean
}

type DnDPayload =
  | { type: 'backlog-card'; card: EventLite }
  | { type: 'scheduled-event'; card: EventLite; fromDayIndex: number; fromHour: number }

type ScheduledEvent = EventLite & { dayIndex: number; hour: number }

const START_HOUR_24 = 0 // 12 AM
const END_HOUR_24 = 24 // 12 PM (exclusive bound for label helper)
const SCROLL_START_HOUR_24 = 8 // 8 AM - where scroll starts

function formatHourLabel(hour24: number): string {
  const date = new Date()
  date.setHours(hour24, 0, 0, 0)
  return date.toLocaleTimeString(undefined, { hour: 'numeric' })
}

function EventsPanel({
  events,
  selected,
  onChangeCategory,
}: {
  events: EventLite[]
  selected: Category
  onChangeCategory: (c: Category) => void
}) {
  const MAX_VISIBLE_CARDS = 10
  const CARD_MIN_HEIGHT = 56
  const CARD_GAP_PX = 8
  const COLUMN_STACK_MAX_HEIGHT = MAX_VISIBLE_CARDS * CARD_MIN_HEIGHT + (MAX_VISIBLE_CARDS - 1) * CARD_GAP_PX

  return (
    <Paper withBorder p="sm" radius="md" h="100%" style={{ gridColumn: 'span 2', backgroundColor: '#1D2F6F', border: '1px solid #000000' }}>
      <Stack gap="sm" h="100%">
        <Group justify="space-between" align="center">
          <Title order={4} style={{ color: '#FFFFFF', fontSize: '1.5rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Events</Title>
          <Select
            data={[
              { value: 'activities', label: 'Activities' },
              { value: 'food', label: 'Food' },
              { value: 'clubs', label: 'Clubs' },
              { value: 'hotels', label: 'Hotels' },
            ]}
            value={selected}
            onChange={val => val && onChangeCategory(val as Category)}
            w={160}
            size="xs"
          />
        </Group>

        <ScrollArea.Autosize mah={COLUMN_STACK_MAX_HEIGHT} type="auto" offsetScrollbars>
          <Stack gap="sm">
            {events.map(ev => (
              <Paper
                key={ev.id}
                withBorder
                p="xs"
                radius="md"
                draggable
                onDragStart={e => {
                  const payload = { type: 'backlog-card', card: ev }
                  const serialized = JSON.stringify(payload)
                  e.dataTransfer.setData('application/json', serialized)
                  e.dataTransfer.setData('text/plain', serialized)
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                style={{ cursor: 'grab', minHeight: CARD_MIN_HEIGHT }}
              >
                <Group justify="space-between" align="center">
                  <Text fw={600} size="sm" style={{ wordBreak: 'break-word' }}>
                    {ev.title || 'Untitled'}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Desire: {typeof ev.desire === 'number' ? ev.desire.toFixed(1) : '—'}
                  </Text>
                </Group>
              </Paper>
            ))}
            {events.length === 0 && (
              <Text size="sm" c="dimmed">No items in this category.</Text>
            )}
          </Stack>
        </ScrollArea.Autosize>
      </Stack>
    </Paper>
  )
}

const TIME_COL_WIDTH_PX = 72
const SLOT_HEIGHT_PX = 56

function ScheduleEventCard({
  event,
  originDayIndex,
  originHour,
  onDragStart,
  onDragEnd,
}: {
  event: ScheduledEvent
  originDayIndex: number
  originHour: number
  onDragStart?: () => void
  onDragEnd?: () => void
}) {
  return (
    <div
      draggable
      onDragStart={e => {
        const payload: DnDPayload = {
          type: 'scheduled-event',
          card: event,
          fromDayIndex: originDayIndex,
          fromHour: originHour,
        }
        const serialized = JSON.stringify(payload)
        e.dataTransfer.setData('application/json', serialized)
        e.dataTransfer.setData('text/plain', serialized)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.()
      }}
      onDragEnd={() => {
        onDragEnd?.()
      }}
      style={{ height: '100%' }}
    >
      <Paper withBorder p="xs" radius={0} style={{ height: '100%', display: 'flex', alignItems: 'center', overflow: 'hidden', cursor: 'grab' }}>
        <Group justify="space-between" align="center" style={{ width: '100%' }}>
          <Text size="sm" fw={600} style={{ wordBreak: 'break-word' }}>{event.title}</Text>
          <Text size="sm" c="dimmed">Desire: {typeof event.desire === 'number' ? event.desire.toFixed(1) : '—'}</Text>
        </Group>
      </Paper>
    </div>
  )
}

function WeekHeader({ 
  currentWeekOffset, 
  onPreviousWeek, 
  onNextWeek,
  tripStartDate,
  tripEndDate,
  canNavigatePrevious,
  canNavigateNext
}: { 
  currentWeekOffset: number
  onPreviousWeek: () => void
  onNextWeek: () => void
  tripStartDate?: string | null
  tripEndDate?: string | null
  canNavigatePrevious: boolean
  canNavigateNext: boolean
}) {
  const getWeekData = () => {
    if (!tripStartDate) return []
    
    // Start from the trip's start date - ensure we parse it correctly
    const tripStart = new Date(tripStartDate + 'T00:00:00') // Force local time to avoid UTC issues
    const tripEnd = tripEndDate ? new Date(tripEndDate + 'T00:00:00') : null
    
    // Apply the week offset (5-day intervals) - start exactly on trip start date
    const startOfWeek = new Date(tripStart)
    startOfWeek.setDate(tripStart.getDate() + (currentWeekOffset * 5))
    
    // Get 5 days starting from the current week start, but only within trip dates
    const weekData = []
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      
      // Only include dates within the trip range (inclusive)
      if (tripEnd && date > tripEnd) break
      if (date < tripStart) continue
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayName = dayNames[date.getDay()]
      const dayNumber = date.getDate()
      
      weekData.push({ dayName, dayNumber, date })
    }
    
    return weekData
  }

  const weekData = getWeekData()

  return (
    <Box
      style={{
        display: 'grid',
        gridTemplateColumns: `${TIME_COL_WIDTH_PX}px 40px repeat(5, 1fr) 40px`,
        gap: 0,
        alignItems: 'center',
      }}
    >
      <Box style={{ backgroundColor: '#1D2F6F' }} />
      <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1D2F6F' }}>
        <ActionIcon 
          variant="light" 
          size="sm" 
          onClick={onPreviousWeek}
          disabled={!canNavigatePrevious}
          style={{ opacity: canNavigatePrevious ? 1 : 0.3, color: '#1D2F6F', backgroundColor: 'white', border: '2px solid #2E6CF6' }}
        >
          <IconChevronLeft size={16} />
        </ActionIcon>
      </Box>
      {weekData.map((day) => (
        <Box key={`${day.dayName}-${day.dayNumber}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <Title order={4} style={{ color: '#FFFFFF' }}>{day.dayName}</Title>
          <Text size="sm" style={{ color: '#FFFFFF' }}>{day.dayNumber}</Text>
        </Box>
      ))}
      <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1D2F6F' }}>
        <ActionIcon 
          variant="light" 
          size="sm" 
          onClick={onNextWeek}
          disabled={!canNavigateNext}
          style={{ opacity: canNavigateNext ? 1 : 0.3, color: '#1D2F6F', backgroundColor: 'white', border: '2px solid #2E6CF6' }}
        >
          <IconChevronRight size={16} />
        </ActionIcon>
      </Box>
    </Box>
  )
}

function WeekBody({
  getEvent,
  onDropIntoSlot,
  onScheduledDragStart,
  currentWeekOffset,
  tripStartDate,
  tripEndDate,
}: {
  getEvent: (dayIndex: number, hour: number) => ScheduledEvent | null
  onDropIntoSlot: (dayIndex: number, hour: number, payload: DnDPayload) => void
  onScheduledDragStart: () => void
  currentWeekOffset: number
  tripStartDate?: string | null
  tripEndDate?: string | null
}) {
  const hours = useMemo(() => Array.from({ length: END_HOUR_24 - START_HOUR_24 }, (_, i) => START_HOUR_24 + i), [])
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const isDraggingScheduledRef = useRef(false)

  const getWeekData = () => {
    if (!tripStartDate) return []
    
    // Start from the trip's start date - ensure we parse it correctly
    const tripStart = new Date(tripStartDate + 'T00:00:00') // Force local time to avoid UTC issues
    const tripEnd = tripEndDate ? new Date(tripEndDate + 'T00:00:00') : null
    
    // Apply the week offset (5-day intervals) - start exactly on trip start date
    const startOfWeek = new Date(tripStart)
    startOfWeek.setDate(tripStart.getDate() + (currentWeekOffset * 5))
    
    // Get 5 days starting from the current week start, but only within trip dates
    const weekData = []
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      
      // Only include dates within the trip range (inclusive)
      if (tripEnd && date > tripEnd) break
      if (date < tripStart) continue
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayName = dayNames[date.getDay()]
      const dayNumber = date.getDate()
      
      weekData.push({ dayName, dayNumber, date })
    }
    
    return weekData
  }

  const weekData = getWeekData()

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollToHour = SCROLL_START_HOUR_24 - START_HOUR_24
      const scrollTop = scrollToHour * SLOT_HEIGHT_PX
      scrollAreaRef.current.scrollTop = scrollTop
    }
  }, [])

  return (
    <ScrollArea.Autosize ref={scrollAreaRef} type="auto" mah={`calc(100dvh - 220px)`} offsetScrollbars style={{ backgroundColor: '#1D2F6F' }}>
      <Stack gap={0}>
        {hours.map(hour => (
          <Box
            key={hour}
            style={{
              display: 'grid',
              gridTemplateColumns: `${TIME_COL_WIDTH_PX}px 40px repeat(5, 1fr) 40px`,
              gap: 0,
              alignItems: 'stretch',
            }}
          >
            {/* Time cell */}
            <Box
              style={{
                minHeight: SLOT_HEIGHT_PX,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingLeft: 4,
                borderBottom: '1px solid transparent',
                position: 'relative',
                backgroundColor: '#1D2F6F',
                zIndex: 1,
              }}
            >
              <Text size="xs" style={{ color: '#FFFFFF', position: 'absolute', top: '-6px', left: '4px', backgroundColor: '#1D2F6F', padding: '0 2px' }}>{formatHourLabel(hour)}</Text>
            </Box>
            {/* Left arrow cell */}
            <Box style={{ height: SLOT_HEIGHT_PX, borderBottom: '1px solid transparent', backgroundColor: '#1D2F6F' }} />
            {/* Day cells */}
            {weekData.map((_, dayIndex) => {
              const scheduled = getEvent(dayIndex, hour)
              return (
                <Box
                  key={`${dayIndex}-${hour}`}
                  onDragOver={e => {
                    e.preventDefault()
                    try {
                      e.dataTransfer.dropEffect = isDraggingScheduledRef.current ? 'move' : 'copy'
                    } catch {
                      // some browsers may throw if dropEffect not supported; ignore
                    }
                  }}
                  onDrop={e => {
                    e.preventDefault()
                    let data = e.dataTransfer.getData('application/json')
                    if (!data) data = e.dataTransfer.getData('text/plain')
                    try {
                      const parsed = JSON.parse(data) as DnDPayload
                      if (parsed && (parsed.type === 'backlog-card' || parsed.type === 'scheduled-event')) {
                        onDropIntoSlot(dayIndex, hour, parsed)
                      }
                    } catch {
                      // ignore invalid
                    }
                  }}
                  style={{
                    height: SLOT_HEIGHT_PX,
                    borderBottom: '1px solid var(--mantine-color-gray-2)',
                    borderRight: '1px solid var(--mantine-color-gray-2)',
                    backgroundColor: 'white',
                  }}
                >
                  {scheduled ? (
                    <ScheduleEventCard 
                      event={scheduled} 
                      originDayIndex={dayIndex} 
                      originHour={hour} 
                      onDragStart={() => { isDraggingScheduledRef.current = true; onScheduledDragStart() }}
                      onDragEnd={() => { isDraggingScheduledRef.current = false }}
                    />
                  ) : (
                    <Box style={{ height: '100%' }} />
                  )}
                </Box>
              )
            })}
            {/* Right arrow cell */}
            <Box style={{ height: SLOT_HEIGHT_PX, borderBottom: '1px solid transparent', backgroundColor: '#1D2F6F' }} />
          </Box>
        ))}
      </Stack>
    </ScrollArea.Autosize>
  )
}

function ScheduleBoard({ tripId }: { tripId?: number }) {
  const [category, setCategory] = useState<Category>('activities')
  const [events, setEvents] = useState<EventLite[]>([])
  const [slots, setSlots] = useState<Record<string, ScheduledEvent>>({})
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)
  const [trip, setTrip] = useState<Trip | null>(null)
  // simple flag that a drag started from a scheduled card (no removing outside)

  const gridHeight = useMemo(() => 'calc(100dvh - 180px)', [])

  // Load trip data
  useEffect(() => {
    if (!tripId) return
    let mounted = true
    listTrips()
      .then(trips => {
        if (!mounted) return
        const foundTrip = trips.find(t => t.id === tripId)
        setTrip(foundTrip || null)
      })
      .catch(() => { /* no-op */ })
    return () => { mounted = false }
  }, [tripId])

  useEffect(() => {
    let mounted = true
    listBacklogCards()
      .then(api => {
        if (!mounted) return
        const mapped: EventLite[] = api.map((c: ApiBacklogCard) => ({
          id: String(c.id),
          title: c.title,
          desire: c.desire_to_go ?? null,
          category: (c.category as Category) ?? 'activities',
          locked_in: c.locked_in ?? false,
        }))
        setEvents(mapped)
      })
      .catch(() => { /* no-op */ })
    return () => { mounted = false }
  }, [])

  const visibleEvents = useMemo(() => events.filter(ev => ev.category === category && ev.locked_in), [events, category])

  // Calculate navigation limits based on trip dates
  const navigationLimits = useMemo(() => {
    if (!trip?.start_date || !trip?.end_date) {
      return { canNavigatePrevious: true, canNavigateNext: true }
    }

    const tripStart = new Date(trip.start_date)
    const tripEnd = new Date(trip.end_date)
    
    // Calculate the earliest possible start date (trip start)
    const earliestStart = tripStart
    
    // Calculate the latest possible start date (trip end - 4 days to show 5 days, but ensure we don't go before trip start)
    const latestStart = new Date(tripEnd)
    latestStart.setDate(tripEnd.getDate() - 4)
    
    // Ensure latest start is not before trip start
    if (latestStart < tripStart) {
      latestStart.setTime(tripStart.getTime())
    }
    
    // Calculate current start date based on offset
    const currentStart = new Date(tripStart)
    currentStart.setDate(tripStart.getDate() + (currentWeekOffset * 5))
    
    const canNavigatePrevious = currentStart > earliestStart
    const canNavigateNext = currentStart < latestStart
    
    return { canNavigatePrevious, canNavigateNext }
  }, [trip?.start_date, trip?.end_date, currentWeekOffset])

  function getKey(dayIndex: number, hour: number): string {
    return `${dayIndex}-${hour}`
  }

  function getEvent(dayIndex: number, hour: number): ScheduledEvent | null {
    return slots[getKey(dayIndex, hour)] ?? null
  }

  type DnDPayload =
    | { type: 'backlog-card'; card: EventLite }
    | { type: 'scheduled-event'; card: EventLite; fromDayIndex: number; fromHour: number }

  function handleDropIntoSlot(dayIndex: number, hour: number, payload: DnDPayload) {
    const key = getKey(dayIndex, hour)
    setSlots(prev => {
      const next = { ...prev }
      if (payload.type === 'scheduled-event') {
        const fromKey = getKey(payload.fromDayIndex, payload.fromHour)
        delete next[fromKey]
      }
      next[key] = { ...payload.card, dayIndex, hour }
      return next
    })
  }

  function handleScheduledDragStart() {
    // no-op here (handled inside WeekBody for per-instance state)
  }

  function handlePreviousWeek() {
    if (navigationLimits.canNavigatePrevious) {
      setCurrentWeekOffset(prev => prev - 1)
    }
  }

  function handleNextWeek() {
    if (navigationLimits.canNavigateNext) {
      setCurrentWeekOffset(prev => prev + 1)
    }
  }

  return (
    <Box h={gridHeight}>
      <SimpleGrid cols={7} spacing="md" h="100%">
        <EventsPanel
          events={visibleEvents}
          selected={category}
          onChangeCategory={setCategory}
        />
        <Paper withBorder p="sm" radius="md" style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', backgroundColor: '#1D2F6F' }}>
          <Stack gap="sm" style={{ flex: 1, minHeight: 0 }}>
            <WeekHeader 
              currentWeekOffset={currentWeekOffset}
              onPreviousWeek={handlePreviousWeek}
              onNextWeek={handleNextWeek}
              tripStartDate={trip?.start_date}
              tripEndDate={trip?.end_date}
              canNavigatePrevious={navigationLimits.canNavigatePrevious}
              canNavigateNext={navigationLimits.canNavigateNext}
            />
            <WeekBody
              getEvent={getEvent}
              onDropIntoSlot={handleDropIntoSlot}
              onScheduledDragStart={handleScheduledDragStart}
              currentWeekOffset={currentWeekOffset}
              tripStartDate={trip?.start_date}
              tripEndDate={trip?.end_date}
            />
          </Stack>
        </Paper>
      </SimpleGrid>
    </Box>
  )
}

export default ScheduleBoard