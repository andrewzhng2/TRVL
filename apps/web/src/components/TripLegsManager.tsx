import { 
  ActionIcon, 
  Button, 
  Group, 
  Modal, 
  Stack, 
  Text, 
  TextInput, 
  Title,
  Card,
  Badge,
  Divider
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { IconPencil, IconPlus, IconTrash, IconGripVertical } from '@tabler/icons-react'
import { useDisclosure } from '@mantine/hooks'
import { useEffect, useState } from 'react'
import { 
  listTripLegs, 
  createTripLeg, 
  updateTripLeg, 
  deleteTripLeg, 
  type TripLeg, 
  type TripLegCreate 
} from '../api/client'

interface TripLegsManagerProps {
  tripId: number
  tripName: string
}

function TripLegsManager({ tripId, tripName }: TripLegsManagerProps) {
  const [legs, setLegs] = useState<TripLeg[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, { open: openEdit, close: closeEdit }] = useDisclosure(false)
  const [addOpen, { open: openAdd, close: closeAdd }] = useDisclosure(false)
  const [form, setForm] = useState<{ id: number | null; name: string; start: Date | null; end: Date | null }>({ 
    id: null, 
    name: '', 
    start: null, 
    end: null 
  })
  const [newLeg, setNewLeg] = useState<{ name: string; start: Date | null; end: Date | null }>({ 
    name: '', 
    start: null, 
    end: null 
  })
  const [addLoading, setAddLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  function coerceDate(v: unknown): Date | null {
    if (v == null) return null
    if (v instanceof Date) return v
    if (typeof v === 'string') {
      const isoLocal = /^\d{4}-\d{2}-\d{2}$/
      if (isoLocal.test(v)) {
        const [y, m, d] = v.split('-').map(Number)
        return new Date(y, m - 1, d)
      }
    }
    const d = new Date(v as string)
    return Number.isNaN(d.getTime()) ? null : d
  }

  useEffect(() => {
    loadLegs()
  }, [tripId])

  async function loadLegs() {
    try {
      setLoading(true)
      const legsData = await listTripLegs(tripId)
      setLegs(legsData)
    } catch (error) {
      console.error('Failed to load legs:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateLeg() {
    if (!(newLeg.name ?? '').trim()) return
    setAddError(null)
    setAddLoading(true)
    try {
      const payload: TripLegCreate = {
        name: (newLeg.name ?? '').trim(),
        start_date: newLeg.start ? `${newLeg.start.getFullYear()}-${String(newLeg.start.getMonth() + 1).padStart(2, '0')}-${String(newLeg.start.getDate()).padStart(2, '0')}` : null,
        end_date: newLeg.end ? `${newLeg.end.getFullYear()}-${String(newLeg.end.getMonth() + 1).padStart(2, '0')}-${String(newLeg.end.getDate()).padStart(2, '0')}` : null,
      }
      await createTripLeg(tripId, payload)
      setNewLeg({ name: '', start: null, end: null })
      closeAdd()
      loadLegs()
    } catch (e) {
      console.error('Failed to create leg:', e)
      setAddError((e as Error).message || 'Failed to create leg')
    } finally {
      setAddLoading(false)
    }
  }

  function openAddLeg() {
    setAddError(null)
    setNewLeg({ name: '', start: null, end: null })
    openAdd()
  }

  function openEditLeg(leg: TripLeg) {
    setEditError(null)
    setForm({
      id: leg.id,
      name: leg.name,
      start: leg.start_date ? coerceDate(leg.start_date) : null,
      end: leg.end_date ? coerceDate(leg.end_date) : null,
    })
    openEdit()
  }

  async function handleSaveEdit() {
    if (form.id == null || !(form.name ?? '').trim()) return
    setEditError(null)
    setEditLoading(true)
    try {
      const payload = {
        name: (form.name ?? '').trim(),
        start_date: form.start ? `${form.start.getFullYear()}-${String(form.start.getMonth() + 1).padStart(2, '0')}-${String(form.start.getDate()).padStart(2, '0')}` : null,
        end_date: form.end ? `${form.end.getFullYear()}-${String(form.end.getMonth() + 1).padStart(2, '0')}-${String(form.end.getDate()).padStart(2, '0')}` : null,
      }
      await updateTripLeg(tripId, form.id, payload)
      closeEdit()
      loadLegs()
    } catch (e) {
      console.error('Failed to update leg:', e)
      setEditError((e as Error).message || 'Failed to update leg')
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDeleteLeg(legId: number) {
    try {
      await deleteTripLeg(tripId, legId)
      loadLegs()
    } catch (e) {
      console.error('Failed to delete leg:', e)
    }
  }

  if (loading) {
    return <div>Loading legs...</div>
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Title order={4}>Trip Legs</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openAddLeg} size="sm">
          Add Leg
        </Button>
      </Group>

      {legs.length === 0 ? (
        <Card withBorder radius="md" p="lg">
          <Text c="dimmed" ta="center">
            No legs added yet. Add legs to break down your {tripName} trip into segments.
          </Text>
        </Card>
      ) : (
        <Stack gap="sm">
          {legs.map((leg, index) => (
            <Card key={leg.id} withBorder radius="md" p="md">
              <Group justify="space-between" align="center">
                <Group gap="md">
                  <IconGripVertical size={16} color="gray" />
                  <Stack gap={2}>
                    <Group gap="xs">
                      <Text fw={500}>{leg.name}</Text>
                      <Badge size="sm" variant="light">
                        Leg {index + 1}
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {leg.start_date ?? 'Start'} → {leg.end_date ?? 'End'}
                    </Text>
                  </Stack>
                </Group>
                <Group gap="xs">
                  <ActionIcon variant="subtle" onClick={() => openEditLeg(leg)} aria-label="Edit Leg">
                    <IconPencil size={16} />
                  </ActionIcon>
                  <ActionIcon 
                    variant="subtle" 
                    color="red" 
                    onClick={() => handleDeleteLeg(leg.id)} 
                    aria-label="Delete Leg"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      {/* Add Leg Modal */}
      <Modal opened={addOpen} onClose={closeAdd} title="Add Trip Leg" centered>
        <Stack>
          <TextInput 
            label="Leg Name" 
            placeholder="e.g., Shanghai" 
            value={newLeg.name ?? ''} 
            onChange={e => {
              const v = e.currentTarget.value ?? ''
              setNewLeg(f => ({ ...f, name: v }))
            }} 
          />
          <Group grow>
            <DateInput 
              label="Start date" 
              value={newLeg.start} 
              onChange={d => setNewLeg(f => ({ ...f, start: coerceDate(d) }))} 
            />
            <DateInput 
              label="End date" 
              value={newLeg.end} 
              onChange={d => setNewLeg(f => ({ ...f, end: coerceDate(d) }))} 
            />
          </Group>
          {addError && <Text c="red" size="sm">{addError}</Text>}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeAdd}>Cancel</Button>
            <Button 
              disabled={!((newLeg.name ?? '').trim()) || addLoading} 
              loading={addLoading} 
              onClick={handleCreateLeg}
            >
              Add Leg
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit Leg Modal */}
      <Modal opened={editOpen} onClose={closeEdit} title="Edit Trip Leg" centered>
        <Stack>
          <TextInput 
            label="Leg Name" 
            value={form.name ?? ''} 
            onChange={e => {
              const v = e.currentTarget.value ?? ''
              setForm(f => ({ ...f, name: v }))
            }} 
          />
          <Group grow>
            <DateInput 
              label="Start date" 
              value={form.start} 
              onChange={d => setForm(f => ({ ...f, start: coerceDate(d) }))} 
            />
            <DateInput 
              label="End date" 
              value={form.end} 
              onChange={d => setForm(f => ({ ...f, end: coerceDate(d) }))} 
            />
          </Group>
          {editError && <Text c="red" size="sm">{editError}</Text>}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeEdit}>Cancel</Button>
            <Button 
              disabled={!((form.name ?? '').trim()) || editLoading} 
              loading={editLoading} 
              onClick={handleSaveEdit}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}

export default TripLegsManager
