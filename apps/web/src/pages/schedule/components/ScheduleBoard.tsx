import { Paper, SimpleGrid, Stack, Title } from '@mantine/core'

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

function DayColumn({ name }: { name: typeof days[number] }) {
  return (
    <Paper withBorder p="sm" radius="md" h="100%">
      <Stack gap="sm" h="100%">
        <Title order={4}>{name}</Title>
      </Stack>
    </Paper>
  )
}

function ScheduleBoard() {
  return (
    <SimpleGrid cols={7} spacing="md" h="100%">
      {days.map((d) => (
        <DayColumn key={d} name={d} />
      ))}
    </SimpleGrid>
  )
}

export default ScheduleBoard


