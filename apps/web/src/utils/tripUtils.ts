/**
 * Utility functions for trip-related operations
 */

export function generateTripSlug(tripName: string): string {
  return tripName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

export function getTripIdFromSlug(slug: string, trips: Array<{ id: number; name: string }>): number | null {
  const trip = trips.find(t => generateTripSlug(t.name) === slug)
  return trip?.id || null
}
