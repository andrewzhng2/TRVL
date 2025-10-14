const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8000'

function getAuthHeaders(): HeadersInit {
  const raw = localStorage.getItem('trvl_session')
  if (!raw) return {}
  try {
    const session = JSON.parse(raw) as SessionRead
    return { Authorization: `Bearer ${session.token}` }
  } catch {
    return {}
  }
}

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

export type BacklogCard = BacklogCardPayload & { 
  id: number
  created_by?: number | null
  created_at?: string | null
  creator?: { id: number; email: string; name: string; picture: string } | null
}

export async function listBacklogCards(): Promise<BacklogCard[]> {
  const res = await fetch(`${API_BASE}/backlog/cards`, {
    headers: getAuthHeaders()
  })
  if (!res.ok) throw new Error('Failed to list backlog cards')
  return res.json()
}

export async function createBacklogCard(payload: BacklogCardPayload): Promise<BacklogCard> {
  const res = await fetch(`${API_BASE}/backlog/cards`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to create backlog card')
  return res.json()
}

export async function updateBacklogCard(id: number, payload: Partial<BacklogCardPayload>): Promise<BacklogCard> {
  const res = await fetch(`${API_BASE}/backlog/cards/${id}`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to update backlog card')
  return res.json()
}

export async function deleteBacklogCard(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/backlog/cards/${id}`, { 
    method: 'DELETE',
    headers: getAuthHeaders()
  })
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

// Trips
export type TripLeg = { id: number; name: string; start_date?: string | null; end_date?: string | null; order_index: number }
export type TripLegCreate = { name: string; start_date?: string | null; end_date?: string | null; order_index?: number }
export type TripLegUpdate = { name?: string; start_date?: string | null; end_date?: string | null; order_index?: number }

export type Trip = { id: number; name: string; start_date?: string | null; end_date?: string | null; legs?: TripLeg[]; created_by?: number | null; creator?: { id: number; email: string; name: string; picture: string } | null }
export type TripCreate = { name: string; start_date?: string | null; end_date?: string | null }

export async function listTrips(): Promise<Trip[]> {
  const res = await fetch(`${API_BASE}/trips/`)
  if (!res.ok) throw new Error('Failed to list trips')
  return res.json()
}

export async function createTrip(payload: TripCreate): Promise<Trip> {
  const res = await fetch(`${API_BASE}/trips/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to create trip')
  return res.json()
}

export async function updateTrip(id: number, payload: Partial<TripCreate>): Promise<Trip> {
  const res = await fetch(`${API_BASE}/trips/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to update trip')
  return res.json()
}

export async function deleteTrip(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/trips/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete trip')
}

// Trip Legs
export async function listTripLegs(tripId: number): Promise<TripLeg[]> {
  const res = await fetch(`${API_BASE}/trips/${tripId}/legs`)
  if (!res.ok) throw new Error('Failed to list trip legs')
  return res.json()
}

export async function createTripLeg(tripId: number, payload: TripLegCreate): Promise<TripLeg> {
  const res = await fetch(`${API_BASE}/trips/${tripId}/legs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to create trip leg')
  return res.json()
}

export async function updateTripLeg(tripId: number, legId: number, payload: TripLegUpdate): Promise<TripLeg> {
  const res = await fetch(`${API_BASE}/trips/${tripId}/legs/${legId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to update trip leg')
  return res.json()
}

export async function deleteTripLeg(tripId: number, legId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/trips/${tripId}/legs/${legId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete trip leg')
}


// Travel Segments
export type TravelSegment = {
  id: number
  edge_type: 'departure' | 'between' | 'return' | 'leg' | 'custom'
  order_index: number
  transport_type: 'plane' | 'train' | 'car' | 'bus' | 'bike' | 'walk' | 'boat' | 'subway'
  from_leg_id?: number | null
  to_leg_id?: number | null
  title?: string
  badge?: string
  start_date?: string | null
  end_date?: string | null
}

export type TravelSegmentCreate = Omit<TravelSegment, 'id'>
export type TravelSegmentUpdate = Partial<Omit<TravelSegment, 'id'>>

export async function listTravelSegments(tripId: number): Promise<TravelSegment[]> {
  const res = await fetch(`${API_BASE}/trips/${tripId}/travel`)
  if (!res.ok) throw new Error('Failed to list travel segments')
  return res.json()
}

export async function createTravelSegment(tripId: number, payload: TravelSegmentCreate): Promise<TravelSegment> {
  const res = await fetch(`${API_BASE}/trips/${tripId}/travel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to create travel segment')
  return res.json()
}

export async function updateTravelSegment(tripId: number, segmentId: number, payload: TravelSegmentUpdate): Promise<TravelSegment> {
  const res = await fetch(`${API_BASE}/trips/${tripId}/travel/${segmentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to update travel segment')
  return res.json()
}

export async function deleteTravelSegment(tripId: number, segmentId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/trips/${tripId}/travel/${segmentId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete travel segment')
}

// Schedule
export type ScheduledEvent = { id?: number; trip_id: number; card_id: number; day_index: number; hour: number }

export async function getSchedule(tripId: number): Promise<ScheduledEvent[]> {
  const res = await fetch(`${API_BASE}/trips/${tripId}/schedule`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('Failed to fetch schedule')
  return res.json()
}

export async function saveSchedule(tripId: number, items: Omit<ScheduledEvent, 'id' | 'trip_id'>[]): Promise<ScheduledEvent[]> {
  const res = await fetch(`${API_BASE}/trips/${tripId}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(items.map(i => ({ ...i, trip_id: tripId }))),
  })
  if (!res.ok) throw new Error('Failed to save schedule')
  return res.json()
}


