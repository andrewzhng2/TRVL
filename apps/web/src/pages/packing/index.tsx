import { Stack, Title, Card, Group, Table, TextInput, Checkbox, Button, ActionIcon, Paper, Text } from '@mantine/core'
import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { listTrips, type Trip } from '../../api/client'
import { getTripIdFromSlug } from '../../utils/tripUtils'
import { IconTrash, IconPlus, IconPencil, IconCheck, IconX } from '@tabler/icons-react'

function TripPacking() {
  const { tripSlug } = useParams<{ tripSlug: string }>()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [people, setPeople] = useState<PersonPacking[]>([])

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

  // Load existing people for this trip (with migration from older single-person storage)
  useEffect(() => {
    if (!trip?.id) return
    const storageKey = `packing:${trip.id}`
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed?.people)) {
          setPeople(parsed.people as PersonPacking[])
          return
        }
        const v1Name = typeof parsed?.personName === 'string' ? parsed.personName : ''
        const v1Items = Array.isArray(parsed?.items) ? (parsed.items as ChecklistItem[]) : []
        const migrated: PersonPacking[] = [
          { id: generateStableId(), name: v1Name, items: v1Items }
        ]
        setPeople(migrated)
        localStorage.setItem(storageKey, JSON.stringify({ version: 2, people: migrated }))
        return
      }
      // Initialize with one empty person column
      setPeople([{ id: generateStableId(), name: '', items: [] }])
    } catch (error) {
      console.error('Failed to load packing board:', error)
      setPeople([{ id: generateStableId(), name: '', items: [] }])
    }
  }, [trip?.id])

  // Persist people when they change
  useEffect(() => {
    if (!trip?.id) return
    try {
      const storageKey = `packing:${trip.id}`
      localStorage.setItem(storageKey, JSON.stringify({ version: 2, people }))
    } catch (error) {
      console.error('Failed to save packing board:', error)
    }
  }, [trip?.id, people])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!trip) {
    return (
      <Stack>
        <Title order={2}>Trip Not Found</Title>
      </Stack>
    )
  }

  function handleAddPerson() {
    setPeople(prev => [...prev, { id: generateStableId(), name: '', items: [] }])
  }

  function handleChangePersonName(personId: string, name: string) {
    setPeople(prev => prev.map(p => (p.id === personId ? { ...p, name } : p)))
  }

  function handleAddItem(personId: string, text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    setPeople(prev => prev.map(p => (
      p.id === personId
        ? { ...p, items: [{ id: generateStableId(), text: trimmed, checked: false }, ...p.items] }
        : p
    )))
  }

  function handleToggleItem(personId: string, itemId: string, checked: boolean) {
    setPeople(prev => prev.map(p => (
      p.id === personId
        ? { ...p, items: p.items.map(it => (it.id === itemId ? { ...it, checked } : it)) }
        : p
    )))
  }

  function handleRemoveItem(personId: string, itemId: string) {
    setPeople(prev => prev.map(p => (
      p.id === personId
        ? { ...p, items: p.items.filter(it => it.id !== itemId) }
        : p
    )))
  }

  function handleRemovePerson(personId: string) {
    setPeople(prev => prev.filter(p => p.id !== personId))
  }

  return (
    <Stack gap="md">
      <Card withBorder radius="md" p="lg" style={{ backgroundColor: '#FFFFFF' }}>
        <Stack gap="sm">
          <Group style={{ alignSelf: 'flex-start' }}>
            <Button
              size="xl"
              leftSection={<IconPlus size={16} />}
              onClick={handleAddPerson}
              style={{ backgroundColor: '#2E6CF6', color: '#FFFFFF', fontWeight: 700, padding: '12px 24px' }}
            >
              Add Person
            </Button>
          </Group>

          <Card
            withBorder
            radius="md"
            p="lg"
            style={{ width: '100%', minHeight: '100vh' }}
          >
            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
              {people.map(person => (
                <div key={person.id} style={{ width: '25%', minWidth: 360, flex: '0 0 25%' }}>
                  <PersonColumn
                    person={person}
                    onChangeName={name => handleChangePersonName(person.id, name)}
                    onAddItem={text => handleAddItem(person.id, text)}
                    onToggleItem={(itemId, checked) => handleToggleItem(person.id, itemId, checked)}
                    onRemoveItem={itemId => handleRemoveItem(person.id, itemId)}
                    onRemovePerson={() => handleRemovePerson(person.id)}
                  />
                </div>
              ))}
            </div>
          </Card>
        </Stack>
      </Card>
    </Stack>
  )
}

export default TripPacking

type ChecklistItem = {
  id: string
  text: string
  checked: boolean
}

type PersonPacking = {
  id: string
  name: string
  items: ChecklistItem[]
}

function generateStableId(): string {
  const cryptoObj = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID()
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function PersonColumn({
  person,
  onChangeName,
  onAddItem,
  onToggleItem,
  onRemoveItem,
  onRemovePerson,
}: {
  person: PersonPacking
  onChangeName: (name: string) => void
  onAddItem: (text: string) => void
  onToggleItem: (itemId: string, checked: boolean) => void
  onRemoveItem: (itemId: string) => void
  onRemovePerson: () => void
}) {
  const [newItemText, setNewItemText] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(person.name)

  useEffect(() => { setNameDraft(person.name) }, [person.name])

  function saveName() {
    onChangeName(nameDraft)
    setIsEditingName(false)
  }

  return (
    <Paper withBorder radius="md" p="sm" style={{ backgroundColor: '#1D2F6F' }}>
      <Table style={{ tableLayout: 'fixed', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ padding: 8 }}>
              <Group justify="space-between" align="center">
                {isEditingName ? (
                  <Group gap={8} wrap="nowrap" style={{ width: '100%' }}>
                    <TextInput
                      placeholder="Enter name"
                      value={nameDraft}
                      onChange={e => setNameDraft(e.currentTarget.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); saveName() }
                        if (e.key === 'Escape') { e.preventDefault(); setIsEditingName(false); setNameDraft(person.name) }
                      }}
                    />
                    <ActionIcon color="green" variant="light" onClick={saveName} aria-label="Save name">
                      <IconCheck size={16} />
                    </ActionIcon>
                    <ActionIcon color="gray" variant="subtle" onClick={() => { setIsEditingName(false); setNameDraft(person.name) }} aria-label="Cancel">
                      <IconX size={16} />
                    </ActionIcon>
                  </Group>
                ) : (
                  <div style={{ position: 'relative', width: '100%' }}>
                    <Text
                      size="xl"
                      fw={700}
                      style={{
                        textAlign: 'center',
                        width: '100%',
                        color: '#FFFFFF',
                        fontSize: '1.5rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {person.name || 'Person'}
                    </Text>
                    <Group gap={4} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-57%)' }}>
                      <ActionIcon color="white" variant="subtle" onClick={() => setIsEditingName(true)} aria-label="Edit name">
                        <IconPencil size={16} />
                      </ActionIcon>
                      <ActionIcon color="red" variant="subtle" onClick={onRemovePerson} aria-label="Remove person">
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </div>
                )}
              </Group>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Paper withBorder radius="sm" p="sm" style={{ minHeight: 180 }}>
                <Stack gap="sm">
                  <Text size="sm" fw={600}>Checklist</Text>

                  <Stack gap={6}>
                    {person.items.length === 0 ? (
                      <div style={{ color: 'var(--mantine-color-dimmed)' }}>No items yet. Use the field below to add items.</div>
                    ) : (
                      person.items.map(item => (
                        <Group key={item.id} justify="space-between" align="center">
                          <Checkbox
                            color="green"
                            checked={item.checked}
                            onChange={e => onToggleItem(item.id, e.currentTarget.checked)}
                            label={item.text}
                          />
                          <ActionIcon color="red" variant="subtle" onClick={() => onRemoveItem(item.id)} aria-label="Remove item">
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      ))
                    )}
                  </Stack>

                  <Group mt="xs">
                    <TextInput
                      placeholder="Add item..."
                      value={newItemText}
                      onChange={e => setNewItemText(e.currentTarget.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          onAddItem(newItemText)
                          setNewItemText('')
                        }
                      }}
                    />
                    <Button leftSection={<IconPlus size={16} />} onClick={() => { onAddItem(newItemText); setNewItemText('') }}>
                      Add
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            </td>
          </tr>
        </tbody>
      </Table>
    </Paper>
  )
}


