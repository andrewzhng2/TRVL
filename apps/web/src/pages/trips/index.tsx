import { Card, Group, Stack, Text, Title, Button } from '@mantine/core'
import { Link } from 'react-router-dom'

function TripsPage() {
  return (
    <Stack gap="md">
      <Title order={2}>Trips</Title>
      <Card withBorder radius="md" p="lg">
        <Group justify="space-between" align="center">
          <Stack gap={2}>
            <Title order={4}>Dubai</Title>
            <Text c="dimmed">Browse backlog and schedule</Text>
          </Stack>
          <Group>
            <Button component={Link} to="/dubai/backlog" variant="light">Backlog</Button>
            <Button component={Link} to="/dubai/schedule">Schedule</Button>
          </Group>
        </Group>
      </Card>
    </Stack>
  )
}

export default TripsPage


