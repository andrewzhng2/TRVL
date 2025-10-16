import { Center, Loader, Paper, Stack, Text, Title } from '@mantine/core'
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { joinTripByInvite } from '../../api/client'
import { generateTripSlug } from '../../utils/tripUtils'

function InviteJoin() {
  const { tripId, code } = useParams<{ tripId: string; code: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending')
  const [message, setMessage] = useState<string>('Joining trip...')

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const idNum = Number(tripId)
        if (!Number.isFinite(idNum) || !code) throw new Error('Invalid invite link')
        const trip = await joinTripByInvite(idNum, code)
        if (cancelled) return
        setStatus('success')
        setMessage('Joined! Redirecting...')
        const slug = generateTripSlug(trip.name)
        setTimeout(() => navigate(`/${slug}`), 600)
      } catch (e) {
        if (cancelled) return
        setStatus('error')
        setMessage((e as Error).message || 'Failed to join trip')
      }
    }
    run()
    return () => { cancelled = true }
  }, [tripId, code, navigate])

  return (
    <Center h="70dvh">
      <Paper withBorder p="lg" radius="md" w={420}>
        <Stack align="center">
          <Title order={3}>Invite</Title>
          {status === 'pending' && <Loader />}
          <Text>{message}</Text>
        </Stack>
      </Paper>
    </Center>
  )
}

export default InviteJoin
