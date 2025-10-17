type TripMapProps = {
  city: string
  height?: number
}

export default function TripMap({ city, height = 300 }: TripMapProps) {
  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(city)}&output=embed`
  return (
    <div style={{ width: '100%', height, overflow: 'hidden', borderRadius: 8 }}>
      <iframe
        title={`Map of ${city}`}
        src={mapUrl}
        style={{ border: 0, width: '100%', height: '100%' }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}



