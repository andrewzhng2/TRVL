import { useEffect, useRef } from 'react'
import { MarkerClusterer } from '@googlemaps/markerclusterer'

export type ItineraryStop = {
  title: string
  location: string
  id?: number | string
}

function getCacheKey(query: string, context?: string): string {
  const ctx = context ? `|ctx:${context.trim().toLowerCase()}` : ''
  return `geocode:v1:${query.trim().toLowerCase()}${ctx}`
}

async function geocodeCached(
  geocoder: google.maps.Geocoder,
  address: string,
  context?: string,
): Promise<google.maps.LatLngLiteral | null> {
  const key = getCacheKey(address, context)
  try {
    const cached = localStorage.getItem(key)
    if (cached) return JSON.parse(cached) as google.maps.LatLngLiteral
  } catch { /* ignore */ }
  return new Promise<google.maps.LatLngLiteral | null>((resolve) => {
    const q = context ? `${address}, ${context}` : address
    geocoder.geocode({ address: q }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const loc = results[0].geometry.location
        const coord = { lat: loc.lat(), lng: loc.lng() }
        try { localStorage.setItem(key, JSON.stringify(coord)) } catch { /* ignore */ }
        resolve(coord)
      } else {
        resolve(null)
      }
    })
  })
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildInfoHtml(label: string, title: string, photoUrl?: string): string {
  const image = photoUrl
    ? `<div style="margin-top:8px"><img src="${photoUrl}" alt="${title}" style="width:200px;height:200px;object-fit:cover;border-radius:8px;display:block" /></div>`
    : ''
  return (
    `<div style="min-width:240px;padding-right:24px;margin:0;line-height:1.2;white-space:normal;overflow-wrap:anywhere">` +
      `<div style="display:flex;align-items:center;gap:8px">` +
        `<span style="background:#2E6CF6;color:#fff;border-radius:12px;padding:2px 8px;font-weight:700;">${label}</span>` +
        `<span style="font-weight:600">${title}</span>` +
      `</div>` +
      image +
    `</div>`
  )
}

function getPhotoCacheKey(query: string, coord?: google.maps.LatLngLiteral): string {
  const lat = coord ? `|lat:${coord.lat.toFixed(4)}` : ''
  const lng = coord ? `|lng:${coord.lng.toFixed(4)}` : ''
  return `placephoto:v1:${query.trim().toLowerCase()}${lat}${lng}`
}

async function fetchFirstPlacePhotoUrl(
  places: google.maps.places.PlacesService,
  query: string,
  coord?: google.maps.LatLngLiteral,
): Promise<string | null> {
  const key = getPhotoCacheKey(query, coord)
  try {
    const cached = localStorage.getItem(key)
    if (cached) return cached
  } catch { /* ignore */ }
  return new Promise<string | null>((resolve) => {
    const request: google.maps.places.FindPlaceFromQueryRequest = {
      query,
      fields: ['photos', 'name', 'place_id', 'geometry'],
    }
    if (coord) request.locationBias = new google.maps.LatLng(coord.lat, coord.lng)
    places.findPlaceFromQuery(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0] && results[0].photos && results[0].photos.length > 0) {
        const url = results[0].photos[0].getUrl({ maxWidth: 220, maxHeight: 220 })
        try { localStorage.setItem(key, url) } catch { /* ignore */ }
        resolve(url)
      } else {
        resolve(null)
      }
    })
  })
}

export default function ItineraryMap({ stops, geocodeContext }: { stops: ItineraryStop[]; geocodeContext?: string }) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const markers: google.maps.Marker[] = []
    let clusterer: MarkerClusterer | null = null
    let directionsRenderer: google.maps.DirectionsRenderer | null = null
    let cancelled = false

    async function init() {
      try {
        if (!mapRef.current || cancelled) return
        const map = new google.maps.Map(mapRef.current, { center: { lat: 0, lng: 0 }, zoom: 12, clickableIcons: false })
        const geocoder = new google.maps.Geocoder()

        const bounds = new google.maps.LatLngBounds()
        let label = 1
        const coords: google.maps.LatLngLiteral[] = []
        const info = new google.maps.InfoWindow()
        const places = (google.maps as unknown as { places?: unknown }).places
          ? new google.maps.places.PlacesService(map)
          : null
        for (const stop of stops) {
          if (!stop.location || !stop.location.trim()) continue
          const coord = await geocodeCached(geocoder, stop.location, geocodeContext)
          if (!coord) continue
          const marker = new google.maps.Marker({ position: coord, label: String(label++), title: stop.title })
          marker.addListener('click', async () => {
            const safe = escapeHtml(stop.title)
            const labelText = String(marker.getLabel() ?? '')
            // show title immediately
            info.setContent(buildInfoHtml(labelText, safe))
            info.open({ map, anchor: marker })
            // then try to fetch a place photo
            if (places) {
              const parts = [stop.title, stop.location, geocodeContext].filter(Boolean) as string[]
              const q = parts.join(', ')
              const photoUrl = await fetchFirstPlacePhotoUrl(places, q, coord)
              if (photoUrl) {
                info.setContent(buildInfoHtml(labelText, safe, photoUrl))
                info.open({ map, anchor: marker })
              }
            }
          })
          markers.push(marker)
          coords.push(coord)
          bounds.extend(coord)
        }
        if (!bounds.isEmpty()) map.fitBounds(bounds)
        if (markers.length > 0) clusterer = new MarkerClusterer({ map, markers })

        // draw directions in stop order
        if (coords.length >= 2) {
          const svc = new google.maps.DirectionsService()
          directionsRenderer = new google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            preserveViewport: true,
            polylineOptions: { strokeColor: '#2E6CF6', strokeOpacity: 0.9, strokeWeight: 5 },
          })
          const origin = coords[0]
          const destination = coords[coords.length - 1]
          const waypoints = coords.slice(1, -1).map(c => ({ location: c, stopover: true }))
          svc.route({ origin, destination, waypoints, optimizeWaypoints: false, travelMode: google.maps.TravelMode.DRIVING }, (res, status) => {
            if (!cancelled && status === 'OK' && res) directionsRenderer!.setDirections(res)
          })
        }
      } catch (e) { console.error('Failed to load Google Maps', e) }
    }

    init()
    return () => {
      cancelled = true
      clusterer?.clearMarkers()
      markers.forEach(m => m.setMap(null))
      directionsRenderer?.setMap(null)
    }
  }, [stops, geocodeContext])

  return <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 8, overflow: 'hidden' }} />
}


