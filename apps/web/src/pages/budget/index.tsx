import { ActionIcon, Button, Card, Group, Paper, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { listTrips, type Trip } from '../../api/client'
import { getTripIdFromSlug } from '../../utils/tripUtils'
import { IconCheck, IconPencil, IconPlus, IconTrash, IconX } from '@tabler/icons-react'

function TripBudget() {
  const { tripSlug } = useParams<{ tripSlug: string }>()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [people, setPeople] = useState<PersonBudget[]>([])

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

  // Load existing people for this trip
  useEffect(() => {
    if (!trip?.id) return
    const storageKey = `budget:${trip.id}`
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed?.people)) {
          setPeople(parsed.people as PersonBudget[])
          return
        }
      }
      setPeople([{ id: generateStableId(), name: '', items: [] }])
    } catch (error) {
      console.error('Failed to load budget board:', error)
      setPeople([{ id: generateStableId(), name: '', items: [] }])
    }
  }, [trip?.id])

  // Persist people when they change
  useEffect(() => {
    if (!trip?.id) return
    try {
      const storageKey = `budget:${trip.id}`
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, people }))
    } catch (error) {
      console.error('Failed to save budget board:', error)
    }
  }, [trip?.id, people])

  const overallTotal = useMemo(() => {
    return people.reduce((sum, p) => sum + p.items.reduce((s, it) => s + (Number(it.amount) || 0), 0), 0)
  }, [people])

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

  function handleAddItem(personId: string, text: string, amount: number) {
    const trimmed = text.trim()
    if (!trimmed) return
    const normalized = Number.isFinite(amount) && amount >= 0 ? amount : 0
    setPeople(prev => prev.map(p => (
      p.id === personId
        ? { ...p, items: [{ id: generateStableId(), text: trimmed, amount: normalized }, ...p.items] }
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
      <Group justify="space-between" align="center">
        <Title order={2}>Budget / Expenses - {trip.name}</Title>
        <Group>
          <Text fw={600} c="white">Total: {formatCurrency(overallTotal)}</Text>
          <Button leftSection={<IconPlus size={16} />} onClick={handleAddPerson}>Add person</Button>
        </Group>
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
              <PersonBudgetColumn
                person={person}
                onChangeName={name => handleChangePersonName(person.id, name)}
                onAddItem={(text, amount) => handleAddItem(person.id, text, amount)}
                onRemoveItem={itemId => handleRemoveItem(person.id, itemId)}
                onRemovePerson={() => handleRemovePerson(person.id)}
              />
            </div>
          ))}
        </div>
      </Card>
    </Stack>
  )
}

export default TripBudget

type ExpenseItem = {
  id: string
  text: string
  amount: number
}

type PersonBudget = {
  id: string
  name: string
  items: ExpenseItem[]
}

function generateStableId(): string {
  const cryptoObj = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID()
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function formatCurrency(value: number): string {
  const n = Number(value) || 0
  return `$${n.toFixed(2)}`
}

function PersonBudgetColumn({
  person,
  onChangeName,
  onAddItem,
  onRemoveItem,
  onRemovePerson,
}: {
  person: PersonBudget
  onChangeName: (name: string) => void
  onAddItem: (text: string, amount: number) => void
  onRemoveItem: (itemId: string) => void
  onRemovePerson: () => void
}) {
  const [newItemText, setNewItemText] = useState('')
  const [newItemAmount, setNewItemAmount] = useState<string>('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(person.name)

  useEffect(() => { setNameDraft(person.name) }, [person.name])

  function saveName() {
    onChangeName(nameDraft)
    setIsEditingName(false)
  }

  const subtotal = useMemo(() => person.items.reduce((s, it) => s + (Number(it.amount) || 0), 0), [person.items])

  return (
    <Paper withBorder radius="md" p="sm" style={{ backgroundColor: '#1D2F6F' }}>
      <Table style={{ tableLayout: 'fixed', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ padding: 8 }} colSpan={2}>
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
            <td colSpan={2}>
              <Paper withBorder radius="sm" p="sm" style={{ backgroundColor: '#FFFFFF' }}>
                <Stack gap="sm">
                  <Text fw={700}>Expenses</Text>
                  {person.items.length === 0 ? (
                    <div style={{ color: 'var(--mantine-color-dimmed)' }}>No expenses yet. Use the field below to add items.</div>
                  ) : (
                    person.items.map(item => (
                      <Group key={item.id} justify="space-between" align="center">
                        <Text>{item.text}</Text>
                        <Group gap={8} align="center">
                          <Text>{formatCurrency(item.amount)}</Text>
                          <ActionIcon color="red" variant="subtle" onClick={() => onRemoveItem(item.id)} aria-label="Remove item">
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    ))
                  )}
                  <Group mt="xs" wrap="nowrap" align="center">
                    <TextInput
                      placeholder="Add expense..."
                      value={newItemText}
                      onChange={e => setNewItemText(e.currentTarget.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          onAddItem(newItemText, parseFloat(newItemAmount))
                          setNewItemText('')
                          setNewItemAmount('')
                        }
                      }}
                      style={{ flex: 1, minWidth: 140 }}
                    />
                    <TextInput
                      type="number"
                      placeholder="$"
                      value={newItemAmount}
                      min={0}
                      step={0.01}
                      onChange={e => setNewItemAmount(e.currentTarget.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          onAddItem(newItemText, parseFloat(newItemAmount))
                          setNewItemText('')
                          setNewItemAmount('')
                        }
                      }}
                      style={{ width: 80 }}
                    />
                    <ActionIcon
                      color="blue"
                      radius="md"
                      variant="filled"
                      size={36}
                      onClick={() => { onAddItem(newItemText, parseFloat(newItemAmount)); setNewItemText(''); setNewItemAmount('') }}
                      aria-label="Add expense"
                    >
                      <IconPlus size={18} />
                    </ActionIcon>
                  </Group>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <Text fw={600}>Subtotal: {formatCurrency(subtotal)}</Text>
                  </div>
                </Stack>
              </Paper>
            </td>
          </tr>
        </tbody>
      </Table>
    </Paper>
  )
}



