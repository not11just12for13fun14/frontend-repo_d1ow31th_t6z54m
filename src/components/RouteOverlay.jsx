import { Polyline } from 'react-leaflet'

function RouteOverlay({ path }) {
  if (!Array.isArray(path) || path.length === 0) return null
  const positions = path.map(p => [p.lat, p.lng])
  return (
    <Polyline positions={positions} pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.8 }} />
  )
}

export default RouteOverlay
