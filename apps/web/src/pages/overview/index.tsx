import { Stack, Title, Text, Card, Group, Badge, Menu, ActionIcon, Button, Modal, Select, Textarea, TextInput } from '@mantine/core'
import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { listTrips, type Trip } from '../../api/client'
import { getTripIdFromSlug } from '../../utils/tripUtils'
import { IconDeviceFloppy, IconPencil, IconX } from '@tabler/icons-react'

function TripMain() {
  const { tripSlug } = useParams<{ tripSlug: string }>()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  // Editable overview content (persisted per-trip in localStorage)
  const [welcomeLine, setWelcomeLine] = useState('')
  const [navigationLine, setNavigationLine] = useState('')
  const [description, setDescription] = useState('')
  const [members, setMembers] = useState('')

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

  // Load saved overview content for this trip, if any
  useEffect(() => {
    if (!trip) return
    try {
      const raw = localStorage.getItem(`trip_overview_${trip.id}`)
      if (raw) {
        const parsed = JSON.parse(raw) as { welcome?: string; navigation?: string; bullets?: string[]; description?: string; members?: string }
        setWelcomeLine((parsed.welcome ?? '').trim())
        setNavigationLine((parsed.navigation ?? '').trim())
        const desc = typeof parsed.description === 'string'
          ? parsed.description
          : Array.isArray(parsed.bullets)
            ? parsed.bullets.filter(Boolean).map(v => String(v).trim()).join('\n')
            : ''
        setDescription(desc)
        setMembers((parsed.members ?? '').trim())
      } else {
        setWelcomeLine('')
        setNavigationLine('')
        setDescription('')
        setMembers('')
      }
    } catch {
      // ignore parse errors
    }
  }, [trip])

  function saveOverview() {
    if (!trip) return
    const payload = {
      welcome: welcomeLine,
      navigation: navigationLine,
      description,
      members,
    }
    localStorage.setItem(`trip_overview_${trip.id}`, JSON.stringify(payload))
    setEditing(false)
  }

  function cancelEditing() {
    // Reload the saved content to discard in-progress edits
    if (!trip) return setEditing(false)
    const raw = localStorage.getItem(`trip_overview_${trip.id}`)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { welcome?: string; navigation?: string; bullets?: string[]; description?: string; members?: string }
        setWelcomeLine((parsed.welcome ?? '').trim())
        setNavigationLine((parsed.navigation ?? '').trim())
        const desc = typeof parsed.description === 'string'
          ? parsed.description
          : Array.isArray(parsed.bullets)
            ? parsed.bullets.filter(Boolean).map(v => String(v).trim()).join('\n')
            : ''
        setDescription(desc)
        setMembers((parsed.members ?? '').trim())
      } catch {
        // ignore
      }
    }
    setEditing(false)
  }

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

  // Default placeholder content
  const defaultWelcome = `Welcome to your ${trip.name} trip! This is the main dashboard where you can get an overview of your trip planning progress.`
  const defaultNavigation = 'Use the navigation on the left to access different sections of your trip planning:'
  const defaultBullets = [
    'Backlog - Manage your list of activities and places to visit',
    'Schedule - Plan your daily itinerary',
    'Travel - Organize transportation and logistics',
    'Packing - Create and manage your packing lists',
  ]
  const defaultDescription = `• ${defaultBullets[0]}\n• ${defaultBullets[1]}\n• ${defaultBullets[2]}\n• ${defaultBullets[3]}`

  return (
    <Stack gap="md">
      <Card withBorder radius="md" p="lg" style={{ backgroundColor: '#1D2F6F' }}>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Text
              fw={700}
              size="xl"
              style={{
                color: '#FFFFFF',
                fontSize: '1.5rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Trip Overview - {trip.name}
            </Text>
            {editing ? (
              <Group gap="xs">
                <ActionIcon variant="light" color="green" onClick={saveOverview} aria-label="Save overview">
                  <IconDeviceFloppy size={16} />
                </ActionIcon>
                <ActionIcon variant="light" color="red" onClick={cancelEditing} aria-label="Cancel editing">
                  <IconX size={16} />
                </ActionIcon>
              </Group>
            ) : (
              <ActionIcon color="white" variant="subtle" onClick={() => setEditing(true)} aria-label="Edit overview">
                <IconPencil size={16} />
              </ActionIcon>
            )}
          </Group>

          <div style={{ alignSelf: 'flex-start' }}>
            <Badge color="blue" variant="light" size="xl" style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}>
              {trip.start_date && trip.end_date
                ? `${trip.start_date} → ${trip.end_date}`
                : 'No dates set'
              }
            </Badge>
          </div>

          {editing ? (
            <Card withBorder radius="md" p="md">
              <Stack gap="sm">
                <Textarea
                  label="Title"
                  placeholder={defaultWelcome}
                  value={welcomeLine}
                  onChange={(e) => setWelcomeLine(e.currentTarget.value)}
                  autosize
                  minRows={2}
                />

                <Textarea
                  label="Trip Members"
                  value={members}
                  onChange={(e) => setMembers(e.currentTarget.value)}
                  autosize
                  minRows={2}
                />

                <Textarea
                  label="Weather/Temperature"
                  placeholder={defaultNavigation}
                  value={navigationLine}
                  onChange={(e) => setNavigationLine(e.currentTarget.value)}
                  autosize
                  minRows={2}
                />

                <Textarea
                  label="Description"
                  placeholder={defaultDescription}
                  value={description}
                  onChange={(e) => setDescription(e.currentTarget.value)}
                  autosize
                  minRows={4}
                />
              </Stack>
            </Card>
          ) : (
            <Card withBorder radius="md" p="md">
              <Stack gap="xs">
                <Text fw={700}>
                  {welcomeLine?.trim() ? welcomeLine : defaultWelcome}
                </Text>
                {members?.trim() ? (
                  <Text size="sm">Trip Members: {members}</Text>
                ) : null}
                <Text size="sm" c="dimmed">
                  {navigationLine?.trim() ? navigationLine : defaultNavigation}
                </Text>
                {description?.trim() ? (
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {description}
                  </Text>
                ) : (
                  <Stack gap="xs">
                    <Text size="sm">• <strong>Backlog</strong> - Manage your list of activities and places to visit</Text>
                    <Text size="sm">• <strong>Schedule</strong> - Plan your daily itinerary</Text>
                    <Text size="sm">• <strong>Travel</strong> - Organize transportation and logistics</Text>
                    <Text size="sm">• <strong>Packing</strong> - Create and manage your packing lists</Text>
                  </Stack>
                )}
              </Stack>
            </Card>
          )}
        </Stack>
      </Card>
    </Stack>
  )
}

export default TripMain



