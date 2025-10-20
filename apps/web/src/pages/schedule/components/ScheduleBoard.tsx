import { Box, Group, Paper, ScrollArea, Select, SimpleGrid, Stack, Text, Title, ActionIcon, Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconChevronLeft, IconChevronRight, IconTrash } from '@tabler/icons-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { listBacklogCards, type BacklogCard as ApiBacklogCard, listTrips, type Trip, getSchedule, saveSchedule } from '../../../api/client'

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

function getCategoryBackground(category: Category): string {
  switch (category) {
    case 'activities':
      // darker pastel orange
      return '#FFCC99'
    case 'food':
      // darker pastel red
      return '#FFB3B3'
    case 'clubs':
      // darker pastel yellow
      return '#FFE699'
    case 'hotels':
    default:
      return '#FFFFFF'
  }
}

function formatHourLabel(hour24: number): string {
  const date = new Date()
  date.setHours(hour24, 0, 0, 0)
  return date.toLocaleTimeString(undefined, { hour: 'numeric' })
}

function EventsPanel({
  events,
  selected,
  onChangeCategory,
  isDirty,
  isSaving,
  onSave,
}: {
  events: EventLite[]
  selected: Category
  onChangeCategory: (c: Category) => void
  isDirty: boolean
  isSaving: boolean
  onSave: () => void
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
            styles={{
              input: {
                backgroundColor: getCategoryBackground(selected),
                border: '1px solid #000000',
                color: '#000000',
              },
              dropdown: {
                backgroundColor: '#FFFFFF',
                border: 'none',
                color: '#000000',
              },
            }}
            renderOption={({ option }) => {
              const value = option.value as Category
              return (
                <Box style={{ backgroundColor: getCategoryBackground(value), border: value === 'hotels' ? '1px solid #000000' : 'none', borderRadius: 4, padding: 6 }}>
                  <Text size="sm" style={{ color: '#000000' }}>{option.label}</Text>
                </Box>
              )
            }}
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
                draggable={true}
                onDragStart={e => {
                  const payload = { type: 'backlog-card', card: ev }
                  const serialized = JSON.stringify(payload)
                  e.dataTransfer.setData('application/json', serialized)
                  e.dataTransfer.setData('text/plain', serialized)
                  e.dataTransfer.effectAllowed = 'copy'
                  try {
                    e.dataTransfer.dropEffect = 'copy'
                  } catch {
                    /* ignore unsupported dropEffect */
                  }
                }}
                onDragEnd={() => undefined}
                style={{ cursor: 'grab', minHeight: CARD_MIN_HEIGHT, width: '100%', minWidth: 0, overflow: 'hidden', backgroundColor: getCategoryBackground(ev.category), border: '1px solid #000000' }}
              >
                <Box style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Text fw={600} size="sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                    {ev.title || 'Untitled'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Desire: {typeof ev.desire === 'number' ? ev.desire.toFixed(1) : '—'}
                  </Text>
                </Box>
              </Paper>
            ))}
            {events.length === 0 && (
              <Text size="sm" c="dimmed">No items in this category.</Text>
            )}
          </Stack>
        </ScrollArea.Autosize>
        <Box style={{ marginTop: 'auto', borderTop: '1px solid #000000', paddingTop: 8 }}>
          <Button fullWidth variant="filled" color="blue" disabled={!isDirty || isSaving} onClick={onSave}>
            {isSaving ? 'Saving…' : 'SAVE CHANGES'}
          </Button>
        </Box>
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
  onDelete,
}: {
  event: ScheduledEvent
  originDayIndex: number
  originHour: number
  onDragStart?: () => void
  onDragEnd?: () => void
  onDelete?: () => void
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
      <Paper withBorder p="xs" radius={0} style={{ height: '100%', width: '100%', maxWidth: '100%', minWidth: 0, display: 'flex', alignItems: 'flex-start', overflow: 'hidden', cursor: 'grab', position: 'relative', backgroundColor: getCategoryBackground(event.category), border: '1px solid #000000' }}>
        <Box style={{ width: '100%', maxWidth: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Text size="sm" fw={600} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', maxWidth: '100%' }}>{event.title}</Text>
          <Text size="xs" c="dimmed">Desire: {typeof event.desire === 'number' ? event.desire.toFixed(1) : '—'}</Text>
        </Box>
        <ActionIcon
          variant="filled"
          color="red"
          size="xs"
          onClick={e => { e.stopPropagation(); e.preventDefault(); onDelete?.() }}
          style={{ position: 'absolute', right: 4, bottom: 4, cursor: 'pointer' }}
          title="Remove"
        >
          <IconTrash size={12} />
        </ActionIcon>
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
  onRemoveFromSlot,
  currentWeekOffset,
  tripStartDate,
  tripEndDate,
}: {
  getEvent: (dayIndex: number, hour: number) => ScheduledEvent | null
  onDropIntoSlot: (dayIndex: number, hour: number, payload: DnDPayload) => void
  onScheduledDragStart: () => void
  onRemoveFromSlot: (dayIndex: number, hour: number) => void
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

  // Safety net: ensure the drag mode resets even if the card unmounts mid-drag
  useEffect(() => {
    const reset = () => { isDraggingScheduledRef.current = false }
    window.addEventListener('dragend', reset)
    window.addEventListener('drop', reset)
    return () => {
      window.removeEventListener('dragend', reset)
      window.removeEventListener('drop', reset)
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
                    // Reset drag mode on any drop
                    isDraggingScheduledRef.current = false
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
                    minWidth: 0,
                    overflow: 'hidden',
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
                      onDelete={() => onRemoveFromSlot(dayIndex, hour)}
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
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
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

  // Load existing schedule for the current 5-day window (absolute day_index stored from trip start)
  useEffect(() => {
    if (!tripId) return
    let mounted = true
    const windowStart = currentWeekOffset * 5
    const windowEnd = windowStart + 4
    // Immediately clear current window so previous week's cards don't linger visually
    setSlots({})
    getSchedule(tripId)
      .then(items => {
        if (!mounted) return
        const next: Record<string, ScheduledEvent> = {}
        for (const it of items) {
          if (it.day_index < windowStart || it.day_index > windowEnd) continue
          const localDayIndex = it.day_index - windowStart
          const ev = events.find(e => e.id === String(it.card_id))
          if (!ev) continue
          next[`${localDayIndex}-${it.hour}`] = { ...ev, dayIndex: localDayIndex, hour: it.hour }
        }
        setSlots(next)
      })
      .catch(() => { /* ignore */ })
    return () => { mounted = false }
  }, [tripId, events, currentWeekOffset])

  // Always compute fresh array so React rebinds draggable nodes across category changes
  const visibleEvents = useMemo(() => {
    return events.filter(ev => ev.category === category && ev.locked_in)
  }, [events, category])

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
      setIsDirty(true)
      return next
    })
  }

  function handleRemoveFromSlot(dayIndex: number, hour: number) {
    const key = getKey(dayIndex, hour)
    setSlots(prev => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      setIsDirty(true)
      return next
    })
  }

  async function handleSaveAll() {
    if (!tripId) return
    const windowStart = currentWeekOffset * 5
    const items = Object.values(slots).map(s => ({
      card_id: Number(s.id),
      day_index: windowStart + s.dayIndex,
      hour: s.hour,
    }))
    try {
      setIsSaving(true)
      await saveSchedule(tripId, items)
      setIsDirty(false)
      notifications.show({ message: 'Changes saved', color: 'green' })
    } catch {
      notifications.show({ message: 'Failed to save', color: 'red' })
    } finally {
      setIsSaving(false)
    }
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
          isDirty={isDirty}
          isSaving={isSaving}
          onSave={handleSaveAll}
        />
        <Paper withBorder p="sm" radius="md" style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', position: 'relative', backgroundColor: '#1D2F6F' }}>
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
              onRemoveFromSlot={handleRemoveFromSlot}
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