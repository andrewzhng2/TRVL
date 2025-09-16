import { Group, Stack, Title } from '@mantine/core'
import BacklogBoard from './BacklogBoard'

function Backlog() {
  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Backlog</Title>
      </Group>
      <BacklogBoard />
    </Stack>
  )
}

export default Backlog


