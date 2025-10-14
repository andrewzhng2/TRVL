import { ActionIcon, Button, Card, Group, Modal, Stack, Text, TextInput, Title } from '@mantine/core'
import '@mantine/core/styles.css';
import { DateInput } from '@mantine/dates'
import { IconMapPin, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { useDisclosure } from '@mantine/hooks'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createTrip, listTrips, updateTrip, deleteTrip, type Trip } from '../../api/client'
import { generateTripSlug } from '../../utils/tripUtils'
import TripLegsManager from '../../components/TripLegsManager'
import TripMap from '../../components/TripMap'

function TripsPage() {
  function coerceDate(v: unknown): Date | null {
    if (v == null) return null
    if (v instanceof Date) return v
    if (typeof v === 'string') {
      // Handle YYYY-MM-DD as LOCAL date to avoid UTC shift
      const isoLocal = /^\d{4}-\d{2}-\d{2}$/
      if (isoLocal.test(v)) {
        const [y, m, d] = v.split('-').map(Number)
        return new Date(y, m - 1, d)
      }
    }
    const d = new Date(v as string)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const [editOpen, { open: openEdit, close: closeEdit }] = useDisclosure(false)
  const [addOpen, { open: openAdd, close: closeAdd }] = useDisclosure(false)
  const [form, setForm] = useState<{ id: number | null; name: string; start: Date | null; end: Date | null }>({ id: null, name: '', start: null, end: null })
  const [newTrip, setNewTrip] = useState<{ name: string; start: Date | null; end: Date | null }>({ name: '', start: null, end: null })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [trips, setTrips] = useState<Trip[]>([])
  const [openMapTripIds, setOpenMapTripIds] = useState<Set<number>>(() => new Set())
  const [starVersion, setStarVersion] = useState(0)

  useEffect(() => {
    let mounted = true
    listTrips()
      .then(ts => {
        if (!mounted) return
        setTrips(ts)
        if (ts.length > 0) setOpenMapTripIds(new Set([ts[0].id]))
      })
      .catch(() => { /* ignore for now */ })
    return () => { mounted = false }
  }, [])

  async function handleCreateTrip() {
    if (!(newTrip.name ?? '').trim()) return
    setAddError(null)
    setAddLoading(true)
    try {
      const payload = {
        name: (newTrip.name ?? '').trim(),
        start_date: newTrip.start ? `${newTrip.start.getFullYear()}-${String(newTrip.start.getMonth() + 1).padStart(2, '0')}-${String(newTrip.start.getDate()).padStart(2, '0')}` : null,
        end_date: newTrip.end ? `${newTrip.end.getFullYear()}-${String(newTrip.end.getMonth() + 1).padStart(2, '0')}-${String(newTrip.end.getDate()).padStart(2, '0')}` : null,
      }
      const created = await createTrip(payload)
      setTrips(prev => [created, ...prev])
      setNewTrip({ name: '', start: null, end: null })
      setAddLoading(false)
      closeAdd()
    } catch (e) {
      setAddLoading(false)
      setAddError((e as Error).message || 'Failed to create trip')
    }
  }

  function openEditTrip(t: Trip) {
    setForm({
      id: t.id,
      name: t.name,
      start: t.start_date ? coerceDate(t.start_date) : null,
      end: t.end_date ? coerceDate(t.end_date) : null,
    })
    openEdit()
  }

  async function handleSaveEdit() {
    if (form.id == null || !(form.name ?? '').trim()) return
    const payload = {
      name: (form.name ?? '').trim(),
      start_date: form.start ? `${form.start.getFullYear()}-${String(form.start.getMonth() + 1).padStart(2, '0')}-${String(form.start.getDate()).padStart(2, '0')}` : null,
      end_date: form.end ? `${form.end.getFullYear()}-${String(form.end.getMonth() + 1).padStart(2, '0')}-${String(form.end.getDate()).padStart(2, '0')}` : null,
    }
    const updated = await updateTrip(form.id, payload)
    setTrips(prev => prev.map(t => (t.id === updated.id ? updated : t)))
    closeEdit()
  }

  async function handleDeleteTrip() {
    if (form.id == null) return
    setDeleteLoading(true)
    try {
      await deleteTrip(form.id)
      setTrips(prev => prev.filter(t => t.id !== form.id))
      closeEdit()
    } catch (e) {
      console.error('Failed to delete trip:', e)
    } finally {
      setDeleteLoading(false)
    }
  }

  function getTripCity(trip: Trip): string {
    // Prefer starred leg name if available via localStorage
    try {
      const key = `trvl_starred_leg_${trip.id}`
      const raw = localStorage.getItem(key)
      let starredId: number | null = null
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { id?: number; name?: string } | number
          if (typeof parsed === 'number') starredId = parsed
          else if (parsed && typeof parsed.id === 'number') starredId = parsed.id
        } catch {
          const num = Number(raw)
          if (Number.isFinite(num)) starredId = num
        }
      }
      if (starredId != null && trip.legs && trip.legs.length > 0) {
        const starred = trip.legs.find(l => l.id === starredId)
        const name = (starred?.name || '').trim()
        if (name) return name
      }
    } catch {
      // ignore localStorage access/parse errors
    }

    const legCity = trip.legs && trip.legs.length > 0 ? (trip.legs[0]?.name || '').trim() : ''
    if (legCity) return legCity
    const name = (trip.name || '').trim()
    if (!name) return 'Trip'
    const commaIdx = name.indexOf(',')
    if (commaIdx > 0) return name.slice(0, commaIdx).trim()
    const match = name.match(/^[^0-9:\-–—]+/)
    const candidate = (match ? match[0] : name).trim()
    return candidate || name
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Title order={2}>Trips</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openAdd} w={160}>Add Trip</Button>
      </Group>

      {trips.map(trip => (
        <Card key={trip.id} withBorder radius="md" p="lg" className="trip-card">
          <div className="trip-card-header">
            <Group justify="space-between" align="center">
              <Group gap={28}>
                <Title order={4} c="white">{trip.name || 'Untitled trip'}</Title>
                <ActionIcon variant="white" onClick={() => openEditTrip(trip)} aria-label="Edit Trip">
                  <IconPencil size={16} />
                </ActionIcon>
              </Group>
              <Text size="sm" c="white">
                Created by: {trip.creator?.name || 'Unknown'}
              </Text>
            </Group>
          </div>
          <Group justify="space-between" align="center">
            <Stack gap={2}>
              <Group gap={12} align="center">
                <Text c="black">{trip.start_date ?? 'Start'} → {trip.end_date ?? 'End'}</Text>
                <ActionIcon 
                  color="blue"
                  radius="md"
                  variant={openMapTripIds.has(trip.id) ? 'filled' : 'outline'} 
                  aria-label={`Show map for ${getTripCity(trip)}`}
                  onClick={() => setOpenMapTripIds(prev => { const next = new Set(prev); if (next.has(trip.id)) next.delete(trip.id); else next.add(trip.id); return next; })}
                >
                  <IconMapPin size={16} />
                </ActionIcon>
              </Group>
              {trip.legs && trip.legs.length > 0 && (
                <Text size="sm" c="black">
                  {trip.legs.length} leg{trip.legs.length !== 1 ? 's' : ''}: {trip.legs.map(leg => leg.name).join(', ')}
                </Text>
              )}
            </Stack>
            <Group>
              <Button component={Link} to={`/${generateTripSlug(trip.name)}`} variant="light">Overview</Button>
              <Button component={Link} to={`/${generateTripSlug(trip.name)}/backlog`} variant="light">Backlog</Button>
              <Button component={Link} to={`/${generateTripSlug(trip.name)}/schedule`}>Schedule</Button>
            </Group>
          </Group>
          {openMapTripIds.has(trip.id) && (
            <div style={{ marginTop: 12 }}>
              <TripMap key={`map-${trip.id}-${starVersion}`} city={getTripCity(trip)} />
            </div>
          )}
        </Card>
      ))}

      <Modal opened={editOpen} onClose={closeEdit} title="Edit Trip" centered size="lg">
        <Stack>
          <TextInput label="Name" value={form.name ?? ''} onChange={e => {
            const v = e.currentTarget.value ?? ''
            setForm(f => ({ ...f, name: v }))
          }} />
          <Group grow>
            <DateInput label="Start date" value={form.start} onChange={d => setForm(f => ({ ...f, start: coerceDate(d) }))} />
            <DateInput label="End date" value={form.end} onChange={d => setForm(f => ({ ...f, end: coerceDate(d) }))} />
          </Group>
          
          {form.id && (
            <TripLegsManager 
              tripId={form.id} 
              tripName={form.name || 'Trip'} 
              onStarChange={() => setStarVersion(v => v + 1)}
            />
          )}
          
          <Group justify="space-between">
            <Button 
              color="red" 
              variant="outline" 
              leftSection={<IconTrash size={16} />}
              onClick={handleDeleteTrip}
              loading={deleteLoading}
            >
              Delete
            </Button>
            <Group>
              <Button variant="subtle" onClick={closeEdit}>Cancel</Button>
              <Button disabled={!((form.name ?? '').trim())} onClick={handleSaveEdit}>Save</Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={addOpen} onClose={closeAdd} title="Add Trip" centered>
        <Stack>
          <TextInput label="Name" placeholder="e.g., Tokyo" value={newTrip.name ?? ''} onChange={e => {
            const v = e.currentTarget.value ?? ''
            setNewTrip(f => ({ ...f, name: v }))
          }} />
          <Group grow>
            <DateInput label="Start date" value={newTrip.start} onChange={d => setNewTrip(f => ({ ...f, start: coerceDate(d) }))} />
            <DateInput label="End date" value={newTrip.end} onChange={d => setNewTrip(f => ({ ...f, end: coerceDate(d) }))} />
          </Group>
          {addError && <Text c="red">{addError}</Text>}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeAdd}>Cancel</Button>
            <Button disabled={!((newTrip.name ?? '').trim()) || addLoading} loading={addLoading} onClick={handleCreateTrip}>Create</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}

export default TripsPage


