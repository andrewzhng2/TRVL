import { Stack, Title, Text, Card, Group, Badge, Menu, ActionIcon, Button, Modal, Select, TextInput } from '@mantine/core'
import { useParams } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { listTrips, listTripLegs, listTravelSegments, createTravelSegment, updateTravelSegment, deleteTravelSegment, type Trip, type TripLeg, type TravelSegment } from '../../api/client'
import { getTripIdFromSlug } from '../../utils/tripUtils'
import { 
  IconPlane, 
  IconTrain, 
  IconCar, 
  IconBus, 
  IconBike, 
  IconWalk, 
  IconShip,
  IconPencil,
  IconTrash,
  IconPlus
} from '@tabler/icons-react'
import { useDisclosure } from '@mantine/hooks'

function TripTravel() {
  const { tripSlug } = useParams<{ tripSlug: string }>()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [legs, setLegs] = useState<TripLeg[]>([])
  const [legsLoading, setLegsLoading] = useState(true)
  const [segments, setSegments] = useState<TravelSegment[]>([])

  type TransportType = 'plane' | 'train' | 'car' | 'bus' | 'bike' | 'walk' | 'boat' | 'subway'
  const defaultTransport: TransportType = 'plane'
  const [departureTransport, setDepartureTransport] = useState<TransportType>(defaultTransport)
  const [returnTransport, setReturnTransport] = useState<TransportType>(defaultTransport)
  const [legTransport, setLegTransport] = useState<Record<number, TransportType>>({})
  const [betweenTransport, setBetweenTransport] = useState<Record<string, TransportType>>({})

  const [addTravelOpen, { open: openAddTravel, close: closeAddTravel }] = useDisclosure(false)
  const [addTravelLoading, setAddTravelLoading] = useState(false)
  const [addTravelError, setAddTravelError] = useState<string | null>(null)
  const [addTravelForm, setAddTravelForm] = useState<{ positionKey: string; transport: TransportType }>(() => ({ positionKey: 'null-null', transport: 'plane' }))
  const [editOpen, { open: openEdit, close: closeEdit }] = useDisclosure(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editing, setEditing] = useState<TravelSegment | null>(null)
  const [editForm, setEditForm] = useState<{ title: string; badge: string; transport: TransportType; start: string | null; end: string | null }>({ title: '', badge: '', transport: 'plane', start: null, end: null })
  const [editCtx, setEditCtx] = useState<{ edgeType: 'departure' | 'leg' | 'between' | 'return' | 'custom'; legId?: number; fromId?: number; toId?: number } | null>(null)

  const transportOptions: { value: TransportType; label: string; Icon: (props: { size?: number }) => ReactNode }[] = [
    { value: 'plane', label: 'Flight', Icon: ({ size = 28 }) => <IconPlane size={size} /> },
    { value: 'train', label: 'Train', Icon: ({ size = 28 }) => <IconTrain size={size} /> },
    { value: 'car', label: 'Car', Icon: ({ size = 28 }) => <IconCar size={size} /> },
    { value: 'bus', label: 'Bus', Icon: ({ size = 28 }) => <IconBus size={size} /> },
    { value: 'bike', label: 'Bike', Icon: ({ size = 28 }) => <IconBike size={size} /> },
    { value: 'walk', label: 'Walk', Icon: ({ size = 28 }) => <IconWalk size={size} /> },
    { value: 'boat', label: 'Cruise', Icon: ({ size = 28 }) => <IconShip size={size} /> },
    { value: 'subway', label: 'Subway', Icon: ({ size = 28 }) => <IconTrain size={size} /> },
  ]

  function TransportPicker({ value, onChange }: { value: TransportType; onChange: (t: TransportType) => void }) {
    const Current = transportOptions.find(o => o.value === value)?.Icon ?? transportOptions[0].Icon
    return (
      <Menu withinPortal position="bottom-start" shadow="sm">
        <Menu.Target>
          <ActionIcon size={56} variant="light" radius="xl" aria-label="Select transport">
            {<Current size={36} />}
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {transportOptions.map(opt => (
            <Menu.Item
              key={opt.value}
              leftSection={opt.Icon({ size: 18 }) as ReactNode}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    )
  }

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

  useEffect(() => {
    if (!trip) return
    const tripId = trip.id
    let cancelled = false
    async function loadLegs() {
      try {
        setLegsLoading(true)
        const data = await listTripLegs(tripId)
        if (!cancelled) setLegs(data)
      } catch (error) {
        console.error('Failed to load trip legs:', error)
      } finally {
        if (!cancelled) setLegsLoading(false)
      }
    }
    async function loadSegments() {
      try {
        const data = await listTravelSegments(tripId)
        if (!cancelled) setSegments(data)
      } catch (error) {
        console.error('Failed to load travel segments:', error)
      }
    }
    loadLegs()
    loadSegments()
    return () => {
      cancelled = true
    }
  }, [trip])

  useEffect(() => {
    if (!segments || segments.length === 0) return
    const dep = segments.find(s => s.edge_type === 'departure')
    if (dep) setDepartureTransport(dep.transport_type as TransportType)
    const ret = segments.find(s => s.edge_type === 'return')
    if (ret) setReturnTransport(ret.transport_type as TransportType)
    const legMap: Record<number, TransportType> = {}
    const betweenMap: Record<string, TransportType> = {}
    segments.forEach(s => {
      if (s.edge_type === 'leg' && s.from_leg_id != null) {
        legMap[s.from_leg_id] = s.transport_type as TransportType
      }
      if (s.edge_type === 'between' && s.from_leg_id != null && s.to_leg_id != null) {
        betweenMap[`${s.from_leg_id}-${s.to_leg_id}`] = s.transport_type as TransportType
      }
    })
    setLegTransport(legMap)
    setBetweenTransport(betweenMap)
  }, [segments])

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
      <Card withBorder radius="md" p="lg" style={{ backgroundColor: '#1D2F6F' }}>
        <Stack gap="sm">
          <Group style={{ alignSelf: 'flex-start' }}>
            <Button 
              size="xl"
              leftSection={<IconPlus size={16} />}
              onClick={() => {
              const sorted = [...legs].sort((a, b) => a.order_index - b.order_index)
              const defaultKey = sorted.length === 0 ? 'null-null' : `${sorted[sorted.length-1].id}-null`
              setAddTravelForm({ positionKey: defaultKey, transport: 'plane' })
              setAddTravelError(null)
              openAddTravel()
            }}
              style={{ backgroundColor: '#2E6CF6', color: '#FFFFFF', fontWeight: 700, padding: '12px 24px' }}
            >
              Add Travel
            </Button>
          </Group>
          <Card withBorder radius="md" p="xl">
            <Group justify="space-between" align="center">
              <Group align="center" gap="md">
                <TransportPicker 
                  value={departureTransport} 
                  onChange={async (t) => {
                    setDepartureTransport(t)
                    try {
                      const existing = segments.find(s => s.edge_type === 'departure')
                      if (existing) {
                        const updated = await updateTravelSegment(trip.id, existing.id, { transport_type: t })
                        setSegments(curr => curr.map(s => s.id === updated.id ? updated : s))
                      } else {
                        const created = await createTravelSegment(trip.id, { edge_type: 'departure', order_index: 0, transport_type: t })
                        setSegments(curr => [...curr, created])
                      }
                    } catch (e) {
                      console.error('Failed to save departure transport', e)
                    }
                  }} 
                />
                <Stack gap={2}>
                  <Group gap="xs">
                    <Text fw={500} style={{ fontSize: '2rem' }}>{(segments.find(s => s.edge_type==='departure')?.title) || 'Departure Travel'}</Text>
                    <Badge size="lg" variant="light">{(segments.find(s => s.edge_type==='departure')?.badge) || 'Start'}</Badge>
                  </Group>
                  <Text size="sm" c="dimmed">Trip start: {(segments.find(s => s.edge_type==='departure')?.start_date) ?? (trip.start_date ?? 'TBD')}</Text>
                </Stack>
              </Group>
              <Group gap="xs">
                <ActionIcon aria-label="Edit" variant="subtle" onClick={() => {
                  const seg = segments.find(s => s.edge_type==='departure') || null
                  setEditing(seg)
                  setEditCtx({ edgeType: 'departure' })
                  setEditError(null)
                  setEditForm({
                    title: seg?.title || 'Departure Travel',
                    badge: seg?.badge || 'Start',
                    transport: departureTransport,
                    start: seg?.start_date ?? (trip.start_date ?? null),
                    end: seg?.end_date ?? null,
                  })
                  openEdit()
                }}>
                  <IconPencil size={36} />
                </ActionIcon>
                <ActionIcon aria-label="Delete" variant="subtle" color="red" onClick={async () => {
                  const seg = segments.find(s => s.edge_type==='departure')
                  if (!seg) return
                  try {
                    await deleteTravelSegment(trip.id, seg.id)
                    setSegments(curr => curr.filter(s => s.id !== seg.id))
                  } catch (e) {
                    console.error('Failed to delete departure segment', e)
                  }
                }}>
                  <IconTrash size={36} />
                </ActionIcon>
              </Group>
            </Group>
          </Card>

          {legsLoading ? (
            <Text>Loading legs...</Text>
          ) : legs.length === 0 ? (
            <>
              <Text c="dimmed" ta="center">No trip legs yet.</Text>
              {(function() { 
                const customs = segments
                  .filter(s => s.edge_type === 'custom' && (s.from_leg_id == null) && (s.to_leg_id == null))
                  .sort((a,b) => a.order_index - b.order_index)
                return (
                  <Stack gap="sm">
                    {customs.map(seg => (
                      <Card key={`custom-${seg.id}`} withBorder radius="md" p="xl">
                        <Group justify="space-between" align="center">
                          <Group align="center" gap="md">
                            <TransportPicker 
                              key={`custompicker-${seg.id}-${seg.transport_type}`}
                              value={seg.transport_type as TransportType}
                              onChange={async (t) => {
                                try {
                                  const updated = await updateTravelSegment(trip.id, seg.id, { transport_type: t })
                                  setSegments(curr => curr.map(s => s.id === updated.id ? updated : s))
                                } catch (e) {
                                  console.error('Failed to save custom transport', e)
                                }
                              }}
                            />
                            <Stack gap={2}>
                            <Group gap="xs">
                              <Text fw={500} style={{ fontSize: '2rem' }}>{seg.title || 'Travel'}</Text>
                              <Badge size="lg" variant="light">{seg.badge || 'Custom'}</Badge>
                            </Group>
                              {(seg.start_date || seg.end_date) && (
                                <Text size="sm" c="dimmed">{seg.start_date ?? ''}{(seg.start_date || seg.end_date) ? ' → ' : ''}{seg.end_date ?? ''}</Text>
                              )}
                            </Stack>
                          </Group>
                          <Group gap="xs">
                            <ActionIcon aria-label="Edit" variant="subtle" onClick={() => {
                              setEditing(seg)
                              setEditCtx({ edgeType: 'custom', fromId: seg.from_leg_id ?? undefined, toId: seg.to_leg_id ?? undefined })
                              setEditError(null)
                              setEditForm({
                                title: seg.title || 'Travel',
                                badge: seg.badge || 'Custom',
                                transport: (seg.transport_type as TransportType),
                                start: seg.start_date ?? null,
                                end: seg.end_date ?? null,
                              })
                              openEdit()
                            }}>
                              <IconPencil size={36} />
                            </ActionIcon>
                            <ActionIcon aria-label="Delete" variant="subtle" color="red" onClick={async () => {
                              try {
                                await deleteTravelSegment(trip.id, seg.id)
                                setSegments(curr => curr.filter(s => s.id !== seg.id))
                              } catch (e) {
                                console.error('Failed to delete travel segment', e)
                              }
                            }}>
                              <IconTrash size={36} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                )
              })()}
            </>
          ) : (
            (() => {
              const sorted = [...legs].sort((a, b) => a.order_index - b.order_index)
              const rows: ReactNode[] = []
              // customs before first leg
              const customsBefore = segments
                .filter(s => s.edge_type === 'custom' && (s.from_leg_id == null) && s.to_leg_id === sorted[0]?.id)
                .sort((a,b) => a.order_index - b.order_index)
              customsBefore.forEach(seg => {
                rows.push(
                  <Card key={`custom-${seg.id}`} withBorder radius="md" p="xl">
                    <Group justify="space-between" align="center">
                      <Group align="center" gap="md">
                        <TransportPicker 
                          key={`custompicker-${seg.id}-${seg.transport_type}`}
                          value={seg.transport_type as TransportType}
                          onChange={async (t) => {
                            try {
                              const updated = await updateTravelSegment(trip.id, seg.id, { transport_type: t })
                              setSegments(curr => curr.map(s => s.id === updated.id ? updated : s))
                            } catch (e) {
                              console.error('Failed to save custom transport', e)
                            }
                          }}
                        />
                        <Stack gap={2}>
                          <Group gap="xs">
                            <Text fw={500} style={{ fontSize: '2rem' }}>Travel</Text>
                            <Badge size="sm" variant="light">Custom</Badge>
                          </Group>
                        </Stack>
                      </Group>
                    </Group>
                  </Card>
                )
              })
              sorted.forEach((leg, index) => {
                rows.push(
                <Card key={`leg-${leg.id}`} withBorder radius="md" p="xl">
                  <Group justify="space-between" align="center">
                    <Group align="center" gap="md">
                      <TransportPicker 
                        key={`legpicker-${leg.id}-${legTransport[leg.id] ?? defaultTransport}`}
                        value={legTransport[leg.id] ?? defaultTransport} 
                        onChange={async (t) => {
                          setLegTransport(prev => ({ ...prev, [leg.id]: t }))
                          try {
                            const existing = segments.find(s => s.edge_type === 'leg' && s.from_leg_id === leg.id)
                            if (existing) {
                              const updated = await updateTravelSegment(trip.id, existing.id, { transport_type: t })
                              setSegments(curr => curr.map(s => s.id === updated.id ? updated : s))
                            } else {
                              const created = await createTravelSegment(trip.id, { edge_type: 'leg', order_index: leg.order_index, transport_type: t, from_leg_id: leg.id, to_leg_id: null })
                              setSegments(curr => [...curr, created])
                            }
                          } catch (e) {
                            console.error('Failed to save leg transport', e)
                          }
                        }} 
                      />
                      <Stack gap={2}>
                        <Group gap="xs">
                          <Text fw={500} style={{ fontSize: '2rem' }}>{(segments.find(s => s.edge_type==='leg' && s.from_leg_id===leg.id)?.title) || leg.name}</Text>
                          <Badge size="lg" variant="light">{(segments.find(s => s.edge_type==='leg' && s.from_leg_id===leg.id)?.badge) || `Leg ${index + 1}`}</Badge>
                        </Group>
                        <Text size="sm" c="dimmed">
                          {(segments.find(s => s.edge_type==='leg' && s.from_leg_id===leg.id)?.start_date) ?? (leg.start_date ?? 'Start')} → {(segments.find(s => s.edge_type==='leg' && s.from_leg_id===leg.id)?.end_date) ?? (leg.end_date ?? 'End')}
                        </Text>
                      </Stack>
                    </Group>
                    <Group gap="xs">
                      <ActionIcon aria-label="Edit" variant="subtle" onClick={() => {
                        const seg = segments.find(s => s.edge_type==='leg' && s.from_leg_id===leg.id) || null
                        setEditing(seg)
                        setEditCtx({ edgeType: 'leg', legId: leg.id })
                        setEditError(null)
                        setEditForm({
                          title: seg?.title || leg.name,
                          badge: seg?.badge || `Leg ${index + 1}`,
                          transport: legTransport[leg.id] ?? defaultTransport,
                          start: seg?.start_date ?? (leg.start_date ?? null),
                          end: seg?.end_date ?? (leg.end_date ?? null),
                        })
                        openEdit()
                      }}>
                        <IconPencil size={36} />
                      </ActionIcon>
                      <ActionIcon aria-label="Delete" variant="subtle" color="red" onClick={async () => {
                        const seg = segments.find(s => s.edge_type==='leg' && s.from_leg_id===leg.id)
                        if (!seg) return
                        try {
                          await deleteTravelSegment(trip.id, seg.id)
                          setSegments(curr => curr.filter(s => s.id !== seg.id))
                        } catch (e) {
                          console.error('Failed to delete leg segment', e)
                        }
                      }}>
                        <IconTrash size={36} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Card>
                )

                if (index < sorted.length - 1) {
                  const next = sorted[index + 1]
                  rows.push(
                    <Card key={`between-${leg.id}-${next.id}`} withBorder radius="md" p="xl">
                      <Group justify="space-between" align="center">
                        <Group align="center" gap="md">
                          <TransportPicker 
                            key={`betweenpicker-${leg.id}-${next.id}-${betweenTransport[`${leg.id}-${next.id}`] ?? defaultTransport}`}
                            value={betweenTransport[`${leg.id}-${next.id}`] ?? defaultTransport}
                            onChange={async (t) => {
                              setBetweenTransport(prev => ({ ...prev, [`${leg.id}-${next.id}`]: t }))
                              try {
                                const existing = segments.find(s => s.edge_type === 'between' && s.from_leg_id === leg.id && s.to_leg_id === next.id)
                                if (existing) {
                                  const updated = await updateTravelSegment(trip.id, existing.id, { transport_type: t })
                                  setSegments(curr => curr.map(s => s.id === updated.id ? updated : s))
                                } else {
                                  const created = await createTravelSegment(trip.id, { edge_type: 'between', order_index: 0, transport_type: t, from_leg_id: leg.id, to_leg_id: next.id })
                                  setSegments(curr => [...curr, created])
                                }
                              } catch (e) {
                                console.error('Failed to save between transport', e)
                              }
                            }}
                          />
                          <Stack gap={2}>
                            <Group gap="xs">
                              <Text fw={500} style={{ fontSize: '2rem' }}>{(segments.find(s => s.edge_type==='between' && s.from_leg_id===leg.id && s.to_leg_id===next.id)?.title) || 'Between'}</Text>
                              <Badge size="lg" variant="light">{(segments.find(s => s.edge_type==='between' && s.from_leg_id===leg.id && s.to_leg_id===next.id)?.badge) || `${leg.name} → ${next.name}`}</Badge>
                            </Group>
                            <Text size="sm" c="dimmed">
                              {(segments.find(s => s.edge_type==='between' && s.from_leg_id===leg.id && s.to_leg_id===next.id)?.start_date) ?? (leg.end_date ?? 'End')} → {(segments.find(s => s.edge_type==='between' && s.from_leg_id===leg.id && s.to_leg_id===next.id)?.end_date) ?? (next.start_date ?? 'Start')}
                            </Text>
                          </Stack>
                        </Group>
                        <Group gap="xs">
                          <ActionIcon aria-label="Edit" variant="subtle" onClick={() => {
                            const seg = segments.find(s => s.edge_type==='between' && s.from_leg_id===leg.id && s.to_leg_id===next.id) || null
                            setEditing(seg)
                            setEditCtx({ edgeType: 'between', fromId: leg.id, toId: next.id })
                            setEditError(null)
                            setEditForm({
                              title: seg?.title || 'Between Travel',
                              badge: seg?.badge || `${leg.name} → ${next.name}`,
                              transport: (betweenTransport[`${leg.id}-${next.id}`] ?? defaultTransport),
                              start: seg?.start_date ?? null,
                              end: seg?.end_date ?? null,
                            })
                            openEdit()
                          }}>
                            <IconPencil size={36} />
                          </ActionIcon>
                          <ActionIcon aria-label="Delete" variant="subtle" color="red" onClick={async () => {
                            const seg = segments.find(s => s.edge_type==='between' && s.from_leg_id===leg.id && s.to_leg_id===next.id)
                            if (!seg) return
                            try {
                              await deleteTravelSegment(trip.id, seg.id)
                              setSegments(curr => curr.filter(s => s.id !== seg.id))
                            } catch (e) {
                              console.error('Failed to delete travel segment', e)
                            }
                          }}>
                            <IconTrash size={36} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    </Card>
                  )
                  // custom segments between leg and next
                  const customs = segments
                    .filter(s => s.edge_type === 'custom' && s.from_leg_id === leg.id && s.to_leg_id === next.id)
                    .sort((a,b) => a.order_index - b.order_index)
                  customs.forEach(seg => {
                    rows.push(
                      <Card key={`custom-${seg.id}`} withBorder radius="md" p="xl">
                        <Group justify="space-between" align="center">
                          <Group align="center" gap="md">
                            <TransportPicker 
                              key={`custompicker-${seg.id}-${seg.transport_type}`}
                              value={seg.transport_type as TransportType}
                              onChange={async (t) => {
                                try {
                                  const updated = await updateTravelSegment(trip.id, seg.id, { transport_type: t })
                                  setSegments(curr => curr.map(s => s.id === updated.id ? updated : s))
                                } catch (e) {
                                  console.error('Failed to save custom transport', e)
                                }
                              }}
                            />
                            <Stack gap={2}>
                            <Group gap="xs">
                              <Text fw={500} style={{ fontSize: '2rem' }}>{seg.title || 'Travel'}</Text>
                              <Badge size="xl" variant="light">{seg.badge || 'Custom'}</Badge>
                            </Group>
                              {(seg.start_date || seg.end_date) && (
                                <Text size="sm" c="dimmed">{seg.start_date ?? ''}{(seg.start_date || seg.end_date) ? ' → ' : ''}{seg.end_date ?? ''}</Text>
                              )}
                            </Stack>
                          </Group>
                          <Group gap="xs">
                            <ActionIcon aria-label="Edit" variant="subtle" onClick={() => {
                                setEditing(seg)
                                setEditCtx({ edgeType: 'custom', fromId: seg.from_leg_id ?? undefined, toId: seg.to_leg_id ?? undefined })
                                setEditError(null)
                                setEditForm({
                                  title: seg.title || 'Travel',
                                  badge: seg.badge || 'Custom',
                                  transport: (seg.transport_type as TransportType),
                                  start: seg.start_date ?? null,
                                  end: seg.end_date ?? null,
                                })
                                openEdit()
                              }}>
                              <IconPencil size={36} />
                            </ActionIcon>
                            <ActionIcon aria-label="Delete" variant="subtle" color="red" onClick={async () => {
                                try {
                                  await deleteTravelSegment(trip.id, seg.id)
                                  setSegments(curr => curr.filter(s => s.id !== seg.id))
                                } catch (e) {
                                  console.error('Failed to delete travel segment', e)
                                }
                              }}>
                              <IconTrash size={36} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Card>
                    )
                  })
                }
              })
              // customs after last leg
              const last = sorted[sorted.length - 1]
              const customsAfter = segments
                .filter(s => s.edge_type === 'custom' && s.from_leg_id === last?.id && (s.to_leg_id == null))
                .sort((a,b) => a.order_index - b.order_index)
              customsAfter.forEach(seg => {
                rows.push(
                  <Card key={`custom-${seg.id}`} withBorder radius="md" p="xl">
                    <Group justify="space-between" align="center">
                      <Group align="center" gap="md">
                        <TransportPicker 
                          key={`custompicker-${seg.id}-${seg.transport_type}`}
                          value={seg.transport_type as TransportType}
                          onChange={async (t) => {
                            try {
                              const updated = await updateTravelSegment(trip.id, seg.id, { transport_type: t })
                              setSegments(curr => curr.map(s => s.id === updated.id ? updated : s))
                            } catch (e) {
                              console.error('Failed to save custom transport', e)
                            }
                          }}
                        />
                            <Stack gap={2}>
                              <Group gap="xs">
                                <Text fw={500} style={{ fontSize: '2rem' }}>{seg.title || 'Travel'}</Text>
                                <Badge size="sm" variant="light">{seg.badge || 'Custom'}</Badge>
                              </Group>
                              {(seg.start_date || seg.end_date) && (
                                <Text size="sm" c="dimmed">{seg.start_date ?? ''}{(seg.start_date || seg.end_date) ? ' → ' : ''}{seg.end_date ?? ''}</Text>
                              )}
                            </Stack>
                          </Group>
                          <Group gap="xs">
                            <ActionIcon aria-label="Edit" variant="subtle" onClick={() => {
                                setEditing(seg)
                                setEditCtx({ edgeType: 'custom', fromId: seg.from_leg_id ?? undefined, toId: seg.to_leg_id ?? undefined })
                                setEditError(null)
                                setEditForm({
                                  title: seg.title || 'Travel',
                                  badge: seg.badge || 'Custom',
                                  transport: (seg.transport_type as TransportType),
                                  start: seg.start_date ?? null,
                                  end: seg.end_date ?? null,
                                })
                                openEdit()
                              }}>
                              <IconPencil size={36} />
                            </ActionIcon>
                            <ActionIcon aria-label="Delete" variant="subtle" color="red" onClick={async () => {
                                try {
                                  await deleteTravelSegment(trip.id, seg.id)
                                  setSegments(curr => curr.filter(s => s.id !== seg.id))
                                } catch (e) {
                                  console.error('Failed to delete travel segment', e)
                                }
                              }}>
                              <IconTrash size={36} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Card>
                )
              })
              return <Stack gap="sm">{rows}</Stack>
            })()
          )}

          <Card withBorder radius="md" p="xl">
            <Group justify="space-between" align="center">
              <Group align="center" gap="md">
                <TransportPicker 
                  value={returnTransport} 
                  onChange={async (t) => {
                    setReturnTransport(t)
                    try {
                      const existing = segments.find(s => s.edge_type === 'return')
                      if (existing) {
                        const updated = await updateTravelSegment(trip.id, existing.id, { transport_type: t })
                        setSegments(curr => curr.map(s => s.id === updated.id ? updated : s))
                      } else {
                        const created = await createTravelSegment(trip.id, { edge_type: 'return', order_index: 9999, transport_type: t })
                        setSegments(curr => [...curr, created])
                      }
                    } catch (e) {
                      console.error('Failed to save return transport', e)
                    }
                  }} 
                />
                <Stack gap={2}>
                  <Group gap="xs">
                    <Text fw={500} style={{ fontSize: '2rem' }}>{(segments.find(s => s.edge_type==='return')?.title) || 'Return Travel'}</Text>
                    <Badge size="lg" variant="light">{(segments.find(s => s.edge_type==='return')?.badge) || 'End'}</Badge>
                  </Group>
                  <Text size="sm" c="dimmed">Trip end: {(segments.find(s => s.edge_type==='return')?.end_date) ?? (trip.end_date ?? 'TBD')}</Text>
          </Stack>
              </Group>
              <Group gap="xs">
                <ActionIcon aria-label="Edit" variant="subtle" onClick={() => {
                  const seg = segments.find(s => s.edge_type==='return') || null
                  setEditing(seg)
                  setEditCtx({ edgeType: 'return' })
                  setEditError(null)
                  setEditForm({
                    title: seg?.title || 'Return Travel',
                    badge: seg?.badge || 'End',
                    transport: returnTransport,
                    start: seg?.start_date ?? null,
                    end: seg?.end_date ?? (trip.end_date ?? null),
                  })
                  openEdit()
                }}>
                  <IconPencil size={36} />
                </ActionIcon>
                <ActionIcon aria-label="Delete" variant="subtle" color="red" onClick={async () => {
                  const seg = segments.find(s => s.edge_type==='return')
                  if (!seg) return
                  try {
                    await deleteTravelSegment(trip.id, seg.id)
                    setSegments(curr => curr.filter(s => s.id !== seg.id))
                  } catch (e) {
                    console.error('Failed to delete return segment', e)
                  }
                }}>
                  <IconTrash size={36} />
                </ActionIcon>
              </Group>
            </Group>
          </Card>
        </Stack>
      </Card>
      <Modal opened={addTravelOpen} onClose={closeAddTravel} title="Add Travel Row" centered>
        <Stack>
          <Select 
            label="Insert position"
            data={(function() {
              const sorted = [...legs].sort((a, b) => a.order_index - b.order_index)
              const options: { value: string; label: string }[] = []
              if (sorted.length === 0) {
                options.push({ value: 'null-null', label: 'Between Departure and Return' })
              } else {
                options.push({ value: `null-${sorted[0].id}` , label: `Before ${sorted[0].name}` })
                for (let i = 0; i < sorted.length - 1; i++) {
                  options.push({ value: `${sorted[i].id}-${sorted[i+1].id}`, label: `Between ${sorted[i].name} and ${sorted[i+1].name}` })
                }
                options.push({ value: `${sorted[sorted.length - 1].id}-null`, label: `After ${sorted[sorted.length - 1].name}` })
              }
              return options
            })()}
            value={addTravelForm.positionKey}
            onChange={(v) => setAddTravelForm(f => ({ ...f, positionKey: String(v ?? 'null-null') }))}
          />
          <Select 
            label="Transport type"
            data={transportOptions.map(o => ({ value: o.value, label: o.label }))}
            value={addTravelForm.transport}
            onChange={(v) => setAddTravelForm(f => ({ ...f, transport: (v as TransportType) ?? 'plane' }))}
          />
          {addTravelError && <Text c="red" size="sm">{addTravelError}</Text>}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeAddTravel}>Cancel</Button>
            <Button 
              loading={addTravelLoading}
              onClick={async () => {
                if (!trip) return
                setAddTravelError(null)
                setAddTravelLoading(true)
                try {
                  const [fromStr, toStr] = addTravelForm.positionKey.split('-')
                  const fromId = fromStr === 'null' ? null : Number(fromStr)
                  const toId = toStr === 'null' ? null : Number(toStr)
                  // find next order within slot
                  const existing = segments
                    .filter(s => s.edge_type === 'custom' && (s.from_leg_id ?? null) === (fromId ?? null) && (s.to_leg_id ?? null) === (toId ?? null))
                  const nextOrder = existing.length === 0 ? 0 : Math.max(...existing.map(s => s.order_index)) + 1
                  const created = await createTravelSegment(trip.id, {
                    edge_type: 'custom',
                    order_index: nextOrder,
                    transport_type: addTravelForm.transport,
                    from_leg_id: fromId,
                    to_leg_id: toId,
                  })
                  setSegments(curr => [...curr, created])
                  closeAddTravel()
                } catch (e) {
                  setAddTravelError((e as Error).message || 'Failed to add travel row')
                } finally {
                  setAddTravelLoading(false)
                }
              }}
            >
              Add Travel
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal opened={editOpen} onClose={closeEdit} title="Edit Travel Row" centered>
        <Stack>
          <TextInput label="Title" value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e?.currentTarget?.value ?? '' }))} />
          <TextInput label="Badge" value={editForm.badge || ''} onChange={e => setEditForm(f => ({ ...f, badge: e?.currentTarget?.value ?? '' }))} />
          <Select 
            label="Transport type"
            data={transportOptions.map(o => ({ value: o.value, label: o.label }))}
            value={editForm.transport}
            onChange={(v) => setEditForm(f => ({ ...f, transport: (v as TransportType) ?? 'plane' }))}
          />
          <Group grow>
            <TextInput label="Start date (YYYY-MM-DD)" value={editForm.start ?? ''} onChange={e => setEditForm(f => ({ ...f, start: e?.currentTarget?.value ?? null }))} />
            <TextInput label="End date (YYYY-MM-DD)" value={editForm.end ?? ''} onChange={e => setEditForm(f => ({ ...f, end: e?.currentTarget?.value ?? null }))} />
          </Group>
          {editError && <Text c="red" size="sm">{editError}</Text>}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeEdit}>Cancel</Button>
            <Button loading={editLoading} onClick={async () => {
              setEditError(null)
              setEditLoading(true)
              try {
                if (editing) {
                  const updated = await updateTravelSegment(trip.id, editing.id, {
                    title: editForm.title,
                    badge: editForm.badge,
                    transport_type: editForm.transport,
                    start_date: editForm.start,
                    end_date: editForm.end,
                  })
                  setSegments(curr => curr.map(s => s.id === updated.id ? updated : s))
                } else if (editCtx) {
                  // create new segment for this context
                  if (editCtx.edgeType === 'departure') {
                    const created = await createTravelSegment(trip.id, {
                      edge_type: 'departure',
                      order_index: 0,
                      transport_type: editForm.transport,
                      from_leg_id: null,
                      to_leg_id: null,
                      title: editForm.title,
                      badge: editForm.badge,
                      start_date: editForm.start,
                      end_date: editForm.end,
                    })
                    setSegments(curr => [...curr, created])
                  } else if (editCtx.edgeType === 'return') {
                    const created = await createTravelSegment(trip.id, {
                      edge_type: 'return',
                      order_index: 9999,
                      transport_type: editForm.transport,
                      from_leg_id: null,
                      to_leg_id: null,
                      title: editForm.title,
                      badge: editForm.badge,
                      start_date: editForm.start,
                      end_date: editForm.end,
                    })
                    setSegments(curr => [...curr, created])
                  } else if (editCtx.edgeType === 'leg' && editCtx.legId != null) {
                    const created = await createTravelSegment(trip.id, {
                      edge_type: 'leg',
                      order_index: 0,
                      transport_type: editForm.transport,
                      from_leg_id: editCtx.legId,
                      to_leg_id: null,
                      title: editForm.title,
                      badge: editForm.badge,
                      start_date: editForm.start,
                      end_date: editForm.end,
                    })
                    setSegments(curr => [...curr, created])
                  } else if (editCtx.edgeType === 'between' && editCtx.fromId != null && editCtx.toId != null) {
                    const created = await createTravelSegment(trip.id, {
                      edge_type: 'between',
                      order_index: 0,
                      transport_type: editForm.transport,
                      from_leg_id: editCtx.fromId,
                      to_leg_id: editCtx.toId,
                      title: editForm.title,
                      badge: editForm.badge,
                      start_date: editForm.start,
                      end_date: editForm.end,
                    })
                    setSegments(curr => [...curr, created])
                  } else if (editCtx.edgeType === 'custom') {
                    // should not happen: custom always exists when editing
                  }
                }
                closeEdit()
              } catch (e) {
                setEditError((e as Error).message || 'Failed to save travel row')
              } finally {
                setEditLoading(false)
              }
            }}>Save</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}

export default TripTravel



