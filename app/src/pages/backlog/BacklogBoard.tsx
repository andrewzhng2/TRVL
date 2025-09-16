import { Paper, SimpleGrid, Stack, Title } from '@mantine/core'

type BacklogColumnProps = {
  title: string
}

function BacklogColumn({ title }: BacklogColumnProps) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Stack gap="sm">
        <Title order={4}>{title}</Title>
      </Stack>
    </Paper>
  )
}

function BacklogBoard() {
  return (
    <SimpleGrid cols={4} spacing="md">
      <BacklogColumn title="Hotels" />
      <BacklogColumn title="Activities" />
      <BacklogColumn title="Food" />
      <BacklogColumn title="Clubs" />
    </SimpleGrid>
  )
}

export default BacklogBoard


