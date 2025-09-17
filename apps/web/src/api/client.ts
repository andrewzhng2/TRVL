const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8000'

export type BacklogCardPayload = {
  category: 'hotels' | 'activities' | 'food' | 'clubs'
  title: string
  location?: string
  cost?: number | null
  rating?: number | null
  desire_to_go?: number | null
  requires_reservation?: boolean
  description?: string
  reserved?: boolean
  reservation_date?: string | null
  locked_in?: boolean
}

export type BacklogCard = BacklogCardPayload & { id: number }

export async function listBacklogCards(): Promise<BacklogCard[]> {
  const res = await fetch(`${API_BASE}/backlog/cards`)
  if (!res.ok) throw new Error('Failed to list backlog cards')
  return res.json()
}

export async function createBacklogCard(payload: BacklogCardPayload): Promise<BacklogCard> {
  const res = await fetch(`${API_BASE}/backlog/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to create backlog card')
  return res.json()
}

export async function deleteBacklogCard(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/backlog/cards/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete backlog card')
}


// Auth
export type SessionRead = {
  token: string
  user: { id: number; email: string; name: string; picture: string }
}

export async function loginWithGoogle(idToken: string): Promise<SessionRead> {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  })
  if (!res.ok) throw new Error('Login failed')
  return res.json()
}

export async function fetchMe(token: string) {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error('Not authenticated')
  return res.json()
}

export async function logout(token: string) {
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
}


