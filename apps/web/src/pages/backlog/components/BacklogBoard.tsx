import { Badge, Box, Button, Checkbox, Group, Modal, NumberInput, Paper, Rating, ScrollArea, SimpleGrid, Stack, Text, TextInput, Textarea, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createBacklogCard, listBacklogCards, deleteBacklogCard, updateBacklogCard, type BacklogCard as ApiBacklogCard } from '../../../api/client'

type ColumnKey = 'hotels' | 'activities' | 'food' | 'clubs'

type BacklogCard = {
  id: string
  title: string
  location: string
  distanceFromHotelKm: number | null
  cost: number | null
  rating: number | null
  desireToGo: number | null
  requiresReservation: boolean
  description: string
  reserved: boolean
  reservationDate: string | null
  lockedIn: boolean
}

type AddCardFormState = {
  title: string
  location: string
  cost: number | ''
  rating: number | ''
  desireToGo: number | ''
  requiresReservation: boolean
  description: string
}

function createEmptyFormState(): AddCardFormState {
  return {
    title: '',
    location: '',
    cost: '',
    rating: '',
    desireToGo: '',
    requiresReservation: false,
    description: '',
  }
}

function BacklogBoard({ tripId }: { tripId?: number }) {
  const [columns, setColumns] = useState<Record<ColumnKey, BacklogCard[]>>({
    hotels: [],
    activities: [],
    food: [],
    clubs: [],
  })

  const [addOpen, { open: openAdd, close: closeAdd }] = useDisclosure(false)
  const [viewOpen, { open: openView, close: closeView }] = useDisclosure(false)
  const [activeColumn, setActiveColumn] = useState<ColumnKey | null>(null)
  const [form, setForm] = useState<AddCardFormState>(createEmptyFormState())
  const [viewingCard, setViewingCard] = useState<{ column: ColumnKey; card: BacklogCard } | null>(null)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const ratingRef = useRef<HTMLDivElement | null>(null)
  

  const gridHeight = useMemo(() => 'calc(100dvh - 180px)', [])
  const MAX_VISIBLE_CARDS = 6
  const CARD_MIN_HEIGHT = 110
  const CARD_GAP_PX = 8
  const COLUMN_STACK_MAX_HEIGHT = MAX_VISIBLE_CARDS * CARD_MIN_HEIGHT + (MAX_VISIBLE_CARDS - 1) * CARD_GAP_PX

  function mapApiToLocal(card: ApiBacklogCard): BacklogCard {
    return {
      id: String(card.id),
      title: card.title,
      location: card.location ?? '',
      distanceFromHotelKm: null,
      cost: card.cost ?? null,
      rating: card.rating ?? null,
      desireToGo: card.desire_to_go ?? null,
      requiresReservation: card.requires_reservation ?? false,
      description: card.description ?? '',
      reserved: card.reserved ?? false,
      reservationDate: card.reservation_date ?? null,
      lockedIn: card.locked_in ?? false,
    }
  }

  function categoryFromColumn(column: ColumnKey): ApiBacklogCard['category'] {
    return column
  }

  useEffect(() => {
    let mounted = true
    listBacklogCards()
      .then(apiCards => {
        if (!mounted) return
        const grouped: Record<ColumnKey, BacklogCard[]> = {
          hotels: [], activities: [], food: [], clubs: [],
        }
        for (const c of apiCards) {
          const col = (c.category as ColumnKey) ?? 'activities'
          if (grouped[col]) grouped[col].push(mapApiToLocal(c))
        }
        setColumns(grouped)
      })
      .finally(() => { /* no-op */ })
    return () => { mounted = false }
  }, [])

  function handleOpenAdd(column: ColumnKey) {
    setActiveColumn(column)
    setForm(createEmptyFormState())
    openAdd()
  }

  async function handleSubmitNewCard() {
    if (!activeColumn) return
    const payload = {
      category: categoryFromColumn(activeColumn),
      title: form.title.trim(),
      location: form.location.trim(),
      cost: form.cost === '' ? null : Number(form.cost),
      rating: form.rating === '' ? null : Number(form.rating),
      desire_to_go: form.desireToGo === '' ? null : Number(form.desireToGo),
      requires_reservation: form.requiresReservation,
      description: form.description.trim(),
      reserved: false,
      reservation_date: null,
      locked_in: false,
    } as const
    const created = await createBacklogCard(payload as unknown as ApiBacklogCard)
    const local = mapApiToLocal(created)
    setColumns(prev => ({
      ...prev,
      [activeColumn]: [...prev[activeColumn], local],
    }))
    closeAdd()
  }

  function handleOpenView(column: ColumnKey, card: BacklogCard) {
    setViewingCard({ column, card })
    openView()
  }

  function handleDeleteViewingCard() {
    if (!viewingCard) return
    const apiId = Number(viewingCard.card.id)
    deleteBacklogCard(apiId)
      .then(() => {
        setColumns(prev => ({
          ...prev,
          [viewingCard.column]: prev[viewingCard.column].filter(c => c.id !== viewingCard.card.id),
        }))
      })
      .finally(() => {
        closeView()
        setViewingCard(null)
      })
  }

  function Column({ column, title }: { column: ColumnKey; title: string }) {
    const cards = columns[column]
    return (
      <Paper withBorder p="sm" radius="md" h="100%">
        <Stack gap="sm" h="100%">
          <Group justify="space-between" align="center">
            <Title order={4}>{title}</Title>
            <Button size="xs" onClick={() => handleOpenAdd(column)}>Add</Button>
          </Group>
          <ScrollArea.Autosize mah={COLUMN_STACK_MAX_HEIGHT} type="auto" offsetScrollbars>
            <Stack gap="sm">
              {cards.map(card => (
                <Paper key={card.id} withBorder p="sm" radius="md" onClick={() => handleOpenView(column, card)} style={{ cursor: 'pointer', minHeight: CARD_MIN_HEIGHT, display: 'flex', flexDirection: 'column' }}>
                  <Stack gap={4} style={{ flex: 1 }}>
                    <Group justify="space-between" align="start">
                      <Title order={5}>{card.title || 'Untitled'}</Title>
                      <Text size="sm">Desire: {typeof card.desireToGo === 'number' ? card.desireToGo.toFixed(1) : '—'}</Text>
                    </Group>
                    <Text size="sm">Location: {card.location || '—'}</Text>
                    <Group gap={8}>
                      <Text size="sm">Distance: {card.distanceFromHotelKm ?? '—'} km</Text>
                      <Text size="sm">Cost: {typeof card.cost === 'number' ? `$${card.cost}` : '—'}</Text>
                    </Group>
                    <Group gap={8}>
                      <Rating value={card.rating ?? 0} readOnly count={5} fractions={10} size="xs" />
                    </Group>
                    <Group gap={8}>
                      {card.requiresReservation && !card.reserved && <Badge color="yellow">Requires reservation</Badge>}
                      {card.requiresReservation && card.reserved && (
                        <Badge color="green">
                          Reservation made{card.reservationDate ? ` · ${new Date(card.reservationDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
                        </Badge>
                      )}
                    </Group>
                  </Stack>
                  <Group justify="flex-end">
                    <Button
                      size="xs"
                      variant={card.lockedIn ? 'filled' : 'light'}
                      color={card.lockedIn ? 'green' : 'blue'}
                      onClick={async e => {
                        e.stopPropagation()
                        const newLockedIn = !card.lockedIn
                        // Optimistically update UI
                        setColumns(prev => ({
                          ...prev,
                          [column]: prev[column].map(c => c.id === card.id ? { ...c, lockedIn: newLockedIn } : c),
                        }))
                        // Update backend
                        try {
                          console.log('Updating card', card.id, 'to locked_in:', newLockedIn)
                          const updatedCard = await updateBacklogCard(Number(card.id), { locked_in: newLockedIn })
                          console.log('Updated card response:', updatedCard)
                          // Update with the actual response from the server
                          setColumns(prev => ({
                            ...prev,
                            [column]: prev[column].map(c => c.id === card.id ? mapApiToLocal(updatedCard) : c),
                          }))
                        } catch (error) {
                          // Revert on error
                          setColumns(prev => ({
                            ...prev,
                            [column]: prev[column].map(c => c.id === card.id ? { ...c, lockedIn: !newLockedIn } : c),
                          }))
                          console.error('Failed to update lock status:', error)
                        }
                      }}
                    >
                      {card.lockedIn ? 'LOCKED IN' : 'lock in?'}
                    </Button>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        </Stack>
      </Paper>
    )
  }

  return (
    <>
      <Box h={gridHeight}>
        <SimpleGrid cols={4} spacing="md" h="100%">
          <Column column="hotels" title="Hotels" />
          <Column column="activities" title="Activities" />
          <Column column="food" title="Food" />
          <Column column="clubs" title="Clubs" />
        </SimpleGrid>
      </Box>

      <Modal opened={addOpen} onClose={closeAdd} title={`Add card${activeColumn ? ` – ${activeColumn}` : ''}`} size="lg" centered>
        <Stack gap="sm">
          <TextInput label="Title" placeholder="e.g., Burj Khalifa" value={form.title} onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, title: v })) }} />
          <TextInput label="Location" placeholder="e.g., Downtown Dubai" value={form.location} onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, location: v })) }} />
          <Group grow>
            <NumberInput label="Cost" placeholder="e.g., 120" value={form.cost} onChange={v => setForm(f => ({ ...f, cost: typeof v === 'number' ? v : '' }))} min={0} step={1} />
          </Group>
          <Stack gap="xs">
            <Group align="center" gap="sm">
              <Text w={90}>Desire</Text>
              <Rating
                value={typeof form.desireToGo === 'number' ? form.desireToGo : undefined}
                onChange={(val: number) => setForm(f => ({ ...f, desireToGo: val }))}
                count={10}
                fractions={2}
                emptySymbol="♡"
                fullSymbol="♥"
              />
            </Group>
            <Group align="center" gap="sm">
              <Text w={90}>Rating</Text>
              <div
                ref={ratingRef}
                onMouseMove={e => {
                  const el = ratingRef.current
                  if (!el) return
                  const rect = el.getBoundingClientRect()
                  const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width)
                  const proportion = rect.width > 0 ? x / rect.width : 0
                  const raw = proportion * 5
                  const stepped = Math.round(raw * 10) / 10
                  setHoverRating(Number(stepped.toFixed(1)))
                }}
                onMouseLeave={() => setHoverRating(null)}
                style={{ display: 'inline-flex' }}
              >
                <Rating
                  value={typeof form.rating === 'number' ? form.rating : undefined}
                  onChange={(val: number) => setForm(f => ({ ...f, rating: val }))}
                  count={5}
                  fractions={10}
                />
              </div>
              <Text size="sm" c="dimmed">{(hoverRating ?? (typeof form.rating === 'number' ? form.rating : null))?.toFixed?.(1) ?? '—'}</Text>
            </Group>
          </Stack>
          <Checkbox label="Requires reservation" checked={form.requiresReservation} onChange={e => { const checked = e.currentTarget.checked; setForm(f => ({ ...f, requiresReservation: checked })) }} />
          <Textarea label="Description" placeholder="Add details" minRows={3} value={form.description} onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, description: v })) }} />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeAdd}>Cancel</Button>
            <Button onClick={handleSubmitNewCard} disabled={!form.title.trim()}>Add Event</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={viewOpen}
        onClose={closeView}
        title={<Title order={2}>{viewingCard?.card.title || 'Card'}</Title>}
        size="lg"
        centered
      >
        {viewingCard && (
          <Stack gap="sm">
            <Stack gap={4}>
              <Title order={5}>Location</Title>
              <Text>{viewingCard.card.location || '—'}</Text>
            </Stack>
            <Stack gap={4}>
              <Title order={5}>Distance</Title>
              <Text>{viewingCard.card.distanceFromHotelKm != null ? `${viewingCard.card.distanceFromHotelKm} km` : '—'}</Text>
            </Stack>
            <Stack gap={4}>
              <Title order={5}>Cost</Title>
              <Text>{typeof viewingCard.card.cost === 'number' ? `$${viewingCard.card.cost}` : '—'}</Text>
            </Stack>
            <Stack gap={6}>
              <Title order={5}>Rating</Title>
              <Group gap={8} align="center">
                <Rating value={viewingCard.card.rating ?? 0} readOnly count={5} fractions={10} size="sm" />
                <Text size="sm" c="dimmed">{typeof viewingCard.card.rating === 'number' ? viewingCard.card.rating.toFixed(1) : '—'}</Text>
              </Group>
            </Stack>
            <Stack gap={4}>
              <Title order={5}>Desire</Title>
              <Text>{typeof viewingCard.card.desireToGo === 'number' ? viewingCard.card.desireToGo.toFixed(1) : '—'}</Text>
            </Stack>
            {viewingCard.card.description && (
              <Stack gap={4}>
                <Title order={5}>Description</Title>
                <Text>{viewingCard.card.description}</Text>
              </Stack>
            )}
            {viewingCard.card.requiresReservation && (
              <Stack gap="xs">
                <Checkbox
                  label="Reserved"
                  checked={!!viewingCard.card.reserved}
                  onChange={e => {
                    const reserved = e.currentTarget.checked
                    setColumns(prev => ({
                      ...prev,
                      [viewingCard.column]: prev[viewingCard.column].map(c => c.id === viewingCard.card.id ? { ...c, reserved } : c),
                    }))
                    setViewingCard(v => v ? { ...v, card: { ...v.card, reserved } } : v)
                  }}
                />
                {viewingCard.card.reserved && (
                  <TextInput
                    label="Reservation date"
                    placeholder="YYYY-MM-DD"
                    type="date"
                    value={viewingCard.card.reservationDate ? viewingCard.card.reservationDate.slice(0, 10) : ''}
                    onChange={e => {
                      const v = e.currentTarget.value
                      const reservationDate = v ? new Date(v).toISOString() : null
                      setColumns(prev => ({
                        ...prev,
                        [viewingCard.column]: prev[viewingCard.column].map(c => c.id === viewingCard.card.id ? { ...c, reservationDate } : c),
                      }))
                      setViewingCard(val => val ? { ...val, card: { ...val.card, reservationDate } } : val)
                    }}
                  />
                )}
                <Group>
                  {viewingCard.card.requiresReservation && viewingCard.card.reserved && (
                    <Badge color="green">
                      Reservation made{viewingCard.card.reservationDate ? ` · ${new Date(viewingCard.card.reservationDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
                    </Badge>
                  )}
                </Group>
              </Stack>
            )}
            <Group justify="flex-end">
              <Button color="red" onClick={handleDeleteViewingCard}>Delete</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  )
}

export default BacklogBoard


