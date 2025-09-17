import { Box, Group, Paper, ScrollArea, Select, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { useEffect, useMemo, useState } from 'react'
import { listBacklogCards, type BacklogCard as ApiBacklogCard } from '../../../api/client'

const allDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
const visibleDays = allDays.slice(0, 5)

type Category = 'hotels' | 'activities' | 'food' | 'clubs'

type EventLite = {
  id: string
  title: string
  desire: number | null
  category: Category
}

type DnDPayload =
  | { type: 'backlog-card'; card: EventLite }
  | { type: 'scheduled-event'; card: EventLite; fromDayIndex: number; fromHour: number }

type ScheduledEvent = EventLite & { dayIndex: number; hour: number }

const START_HOUR_24 = 8 // 8 AM
const END_HOUR_24 = 23 // 11 PM (exclusive bound for label helper)

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
    <Paper withBorder p="sm" radius="md" h="100%" style={{ gridColumn: 'span 2' }}>
      <Stack gap="sm" h="100%">
        <Group justify="space-between" align="center">
          <Title order={4}>Events</Title>
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
}: {
  event: ScheduledEvent
  originDayIndex: number
  originHour: number
  onDragStart?: () => void
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
      style={{ height: '100%' }}
    >
      <Paper withBorder p="xs" radius="sm" style={{ height: '100%', display: 'flex', alignItems: 'center', overflow: 'hidden', cursor: 'grab' }}>
        <Group justify="space-between" align="center" style={{ width: '100%' }}>
          <Text size="sm" fw={600} style={{ wordBreak: 'break-word' }}>{event.title}</Text>
          <Text size="sm" c="dimmed">Desire: {typeof event.desire === 'number' ? event.desire.toFixed(1) : '—'}</Text>
        </Group>
      </Paper>
    </div>
  )
}

function WeekHeader() {
  return (
    <Box
      style={{
        display: 'grid',
        gridTemplateColumns: `${TIME_COL_WIDTH_PX}px repeat(5, 1fr)`,
        gap: 8,
        alignItems: 'center',
      }}
    >
      <Box />
      {visibleDays.map(d => (
        <Box key={d}>
          <Title order={4}>{d}</Title>
        </Box>
      ))}
    </Box>
  )
}

function WeekBody({
  getEvent,
  onDropIntoSlot,
  onScheduledDragStart,
}: {
  getEvent: (dayIndex: number, hour: number) => ScheduledEvent | null
  onDropIntoSlot: (dayIndex: number, hour: number, payload: DnDPayload) => void
  onScheduledDragStart: () => void
  
}) {
  const hours = useMemo(() => Array.from({ length: END_HOUR_24 - START_HOUR_24 }, (_, i) => START_HOUR_24 + i), [])

  return (
    <ScrollArea.Autosize type="auto" mah={`calc(100dvh - 220px)`} offsetScrollbars>
      <Stack gap={8}>
        {hours.map(hour => (
          <Box
            key={hour}
            style={{
              display: 'grid',
              gridTemplateColumns: `${TIME_COL_WIDTH_PX}px repeat(5, 1fr)`,
              gap: 8,
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
              }}
            >
              <Text size="xs" c="dimmed">{formatHourLabel(hour)}</Text>
            </Box>
            {/* Day cells */}
            {visibleDays.map((_, dayIndex) => {
              const scheduled = getEvent(dayIndex, hour)
              return (
                <Box
                  key={`${dayIndex}-${hour}`}
                  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
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
                  }}
                >
                  {scheduled ? (
                    <ScheduleEventCard event={scheduled} originDayIndex={dayIndex} originHour={hour} onDragStart={onScheduledDragStart} />
                  ) : (
                    <Box
                      style={{
                        height: '100%',
                        border: '1px dashed var(--mantine-color-gray-5)',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text size="xs" c="dimmed">Drop here</Text>
                    </Box>
                  )}
                </Box>
              )
            })}
          </Box>
        ))}
      </Stack>
    </ScrollArea.Autosize>
  )
}

function ScheduleBoard() {
  const [category, setCategory] = useState<Category>('activities')
  const [events, setEvents] = useState<EventLite[]>([])
  const [slots, setSlots] = useState<Record<string, ScheduledEvent>>({})
  // simple flag that a drag started from a scheduled card (no removing outside)

  const gridHeight = useMemo(() => 'calc(100dvh - 180px)', [])

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
        }))
        setEvents(mapped)
      })
      .catch(() => { /* no-op */ })
    return () => { mounted = false }
  }, [])

  const visibleEvents = useMemo(() => events.filter(ev => ev.category === category), [events, category])

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
      if (prev[key]) return prev
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
    // no-op now; we keep this to keep the API stable
  }

  return (
    <Box h={gridHeight}>
      <SimpleGrid cols={7} spacing="md" h="100%">
        <EventsPanel
          events={visibleEvents}
          selected={category}
          onChangeCategory={setCategory}
        />
        <Paper withBorder p="sm" radius="md" style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column' }}>
          <Stack gap="sm" style={{ flex: 1, minHeight: 0 }}>
            <WeekHeader />
            <WeekBody
              getEvent={getEvent}
              onDropIntoSlot={handleDropIntoSlot}
              onScheduledDragStart={handleScheduledDragStart}
            />
          </Stack>
        </Paper>
      </SimpleGrid>
    </Box>
  )
}

export default ScheduleBoard


