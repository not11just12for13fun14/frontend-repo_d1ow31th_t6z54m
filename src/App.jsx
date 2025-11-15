import { useEffect, useMemo, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, CircleMarker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

// Fix default marker icons for Vite bundling
// Use CDN assets to avoid file-loader issues
// eslint-disable-next-line
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function MiniMap({ bounds, pickup, dropoff, onPick, onDrop, drivers = [] }) {
  const [mode, setMode] = useState('pickup') // 'pickup' | 'dropoff'
  const leafletBounds = [
    [bounds.minLat, bounds.minLng],
    [bounds.maxLat, bounds.maxLng],
  ]
  const center = [
    (bounds.minLat + bounds.maxLat) / 2,
    (bounds.minLng + bounds.maxLng) / 2,
  ]

  function ClickHandler() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng
        const point = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }
        if (mode === 'pickup') onPick(point)
        else onDrop(point)
      },
    })
    return null
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600">Click map to set {mode}</div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button onClick={() => setMode('pickup')} className={`px-2 py-1 rounded ${mode==='pickup'?'bg-blue-600 text-white':'text-gray-700'}`}>Pickup</button>
          <button onClick={() => setMode('dropoff')} className={`px-2 py-1 rounded ${mode==='dropoff'?'bg-indigo-600 text-white':'text-gray-700'}`}>Dropoff</button>
        </div>
      </div>
      <div className="relative w-full h-64 md:h-72 rounded-lg overflow-hidden border">
        <MapContainer
          center={center}
          bounds={leafletBounds}
          maxBounds={leafletBounds}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler />
          {pickup?.lat && pickup?.lng && (
            <Marker position={[pickup.lat, pickup.lng]} />
          )}
          {dropoff?.lat && dropoff?.lng && (
            <Marker position={[dropoff.lat, dropoff.lng]} icon={new L.Icon({
              iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
              shadowSize: [41, 41],
            })} />
          )}
          {Array.isArray(drivers) && drivers.map((d) => (
            d?.location?.lat && d?.location?.lng ? (
              <CircleMarker key={d.id || d._id} center={[d.location.lat, d.location.lng]} radius={6} pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.8 }} />
            ) : null
          ))}
        </MapContainer>
      </div>
      <div className="text-xs text-gray-500 mt-2">Bounds: {bounds.minLat},{bounds.minLng} → {bounds.maxLat},{bounds.maxLng}</div>
    </div>
  )
}

function App() {
  const apiBase = useMemo(() => (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'), [])

  // Rider
  const [riderName, setRiderName] = useState('')
  const [riderPhone, setRiderPhone] = useState('')
  const [riderId, setRiderId] = useState('')
  const [riderKey, setRiderKey] = useState('')

  // Driver (current driver session for console actions)
  const [drivers, setDrivers] = useState([])
  const [driverForm, setDriverForm] = useState({ name: '', phone: '', make: '', model: '', plate: '', color: '' })
  const [currentDriverId, setCurrentDriverId] = useState('')
  const [currentDriverKey, setCurrentDriverKey] = useState('')
  const [driverLocation, setDriverLocation] = useState({ lat: '', lng: '' })

  // Ride booking
  const [pickup, setPickup] = useState({ lat: '', lng: '' })
  const [dropoff, setDropoff] = useState({ lat: '', lng: '' })
  const [distanceKm, setDistanceKm] = useState('')
  const [durationMin, setDurationMin] = useState('')
  const [fare, setFare] = useState('')
  const [surge, setSurge] = useState('1.0')
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const mapBounds = { minLat: 12.80, maxLat: 13.20, minLng: 77.3, maxLng: 77.85 } // Bengaluru-ish box

  const notify = (msg, timeout = 3000) => {
    setMessage(msg)
    if (timeout) setTimeout(() => setMessage(''), timeout)
  }

  // Polling
  useEffect(() => {
    loadDrivers(); loadRides()
    const t = setInterval(() => { loadDrivers(); loadRides() }, 5000)
    return () => clearInterval(t)
  }, [])

  const loadDrivers = async () => {
    try {
      const res = await fetch(`${apiBase}/drivers`)
      const data = await res.json()
      setDrivers(data)
    } catch (e) { console.error(e) }
  }

  const loadRides = async () => {
    try {
      const res = await fetch(`${apiBase}/rides`)
      const data = await res.json()
      setRides(data)
    } catch (e) { console.error(e) }
  }

  const createRider = async () => {
    if (!riderName || !riderPhone) return notify('Enter rider name and phone')
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/riders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: riderName, phone: riderPhone, rating: 5 }),
      })
      const data = await res.json()
      if (res.ok && data.id) {
        setRiderId(data.id); setRiderKey(data.api_key)
        notify('Rider created')
      } else notify('Failed to create rider')
    } catch { notify('Error creating rider') }
    finally { setLoading(false) }
  }

  const createDriver = async () => {
    const { name, phone, make, model, plate, color } = driverForm
    if (!name || !phone || !make || !model || !plate) return notify('Complete driver and vehicle details')
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/drivers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, vehicle: { make, model, plate, color }, is_available: true }),
      })
      const data = await res.json()
      if (res.ok) {
        notify('Driver added')
        setDriverForm({ name: '', phone: '', make: '', model: '', plate: '', color: '' })
        await loadDrivers()
        if (data.id && data.api_key) { setCurrentDriverId(data.id); setCurrentDriverKey(data.api_key) }
      } else notify('Failed to add driver')
    } catch { notify('Error adding driver') }
    finally { setLoading(false) }
  }

  const fetchFare = async () => {
    if (!distanceKm) return estimateFareLocal()
    try {
      const res = await fetch(`${apiBase}/pricing/estimate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distance_km: Number(distanceKm), duration_min: durationMin ? Number(durationMin) : undefined })
      })
      const data = await res.json()
      if (res.ok && data.fare) { setFare(String(data.fare)); setSurge(String(data.surge_multiplier || 1.0)) }
      else estimateFareLocal()
    } catch { estimateFareLocal() }
  }

  const estimateFareLocal = () => {
    const d = parseFloat(distanceKm)
    const dur = parseFloat(durationMin)
    if (isNaN(d)) return setFare('')
    const est = Math.round((2.0 + 1.2 * d + (isNaN(dur)?0:0.2*dur)) * 100) / 100
    setFare(est.toString()); setSurge('1.0')
  }

  useEffect(() => { fetchFare() }, [distanceKm, durationMin])

  const requestRide = async () => {
    if (!riderId || !riderKey) return notify('Create/set a rider and API key')
    if (!pickup.lat || !pickup.lng || !dropoff.lat || !dropoff.lng) return notify('Set pickup and dropoff')
    setLoading(true)
    try {
      const body = {
        rider_id: riderId,
        pickup: { lat: Number(pickup.lat), lng: Number(pickup.lng) },
        dropoff: { lat: Number(dropoff.lat), lng: Number(dropoff.lng) },
        distance_km: distanceKm ? Number(distanceKm) : undefined,
        duration_min: durationMin ? Number(durationMin) : undefined,
        fare_estimate: fare ? Number(fare) : undefined,
        status: 'requested',
      }
      const res = await fetch(`${apiBase}/rides`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': riderKey },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok && data.id) {
        notify('Ride requested')
        setDistanceKm(''); setDurationMin('')
        await loadRides()
      } else notify('Failed to request ride')
    } catch { notify('Error requesting ride') }
    finally { setLoading(false) }
  }

  const assignDriver = async (rideId, driverId) => {
    if (!currentDriverKey || !driverId || (currentDriverId && currentDriverId !== driverId)) {
      setCurrentDriverId(driverId)
    }
    try {
      const res = await fetch(`${apiBase}/rides/${rideId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-API-Key': currentDriverKey },
        body: JSON.stringify({ driver_id: driverId, status: 'assigned' }),
      })
      if (res.ok) { notify('Driver assigned'); loadRides() }
      else notify('Assign failed')
    } catch { notify('Error assigning driver') }
  }

  const advanceStatus = async (ride, status) => {
    const next = status || ({ requested: 'assigned', assigned: 'ongoing', ongoing: 'completed', completed: 'completed', cancelled: 'cancelled' }[ride.status] || 'completed')
    try {
      const headers = { 'Content-Type': 'application/json' }
      // driver progresses, rider can cancel
      if (next === 'cancelled') headers['X-API-Key'] = riderKey
      else headers['X-API-Key'] = currentDriverKey
      const res = await fetch(`${apiBase}/rides/${ride.id}`, { method: 'PATCH', headers, body: JSON.stringify({ status: next }) })
      if (res.ok) { notify(`Ride status → ${next}`); loadRides() }
      else notify('Update failed')
    } catch { notify('Error updating ride') }
  }

  const updateDriverLoc = async () => {
    if (!currentDriverId || !currentDriverKey) return notify('Set driver id & key')
    if (!driverLocation.lat || !driverLocation.lng) return notify('Enter driver lat/lng')
    try {
      const res = await fetch(`${apiBase}/drivers/${currentDriverId}/location`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-API-Key': currentDriverKey },
        body: JSON.stringify({ lat: Number(driverLocation.lat), lng: Number(driverLocation.lng) })
      })
      const data = await res.json(); if (data.updated) notify('Driver location updated'); else notify('No change')
      loadDrivers()
    } catch { notify('Error updating location') }
  }

  const findNearby = async () => {
    if (!pickup.lat || !pickup.lng) return notify('Set pickup first')
    try {
      const res = await fetch(`${apiBase}/drivers/nearby?lat=${pickup.lat}&lng=${pickup.lng}&radius_km=5`)
      const data = await res.json()
      if (Array.isArray(data)) setDrivers(data)
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <header className="px-6 py-4 border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500" />
            <h1 className="text-2xl font-bold text-gray-800">Payana</h1>
          </div>
          <div className="text-sm text-gray-500">API: {apiBase}</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1 bg-white rounded-xl shadow-sm border p-5 space-y-5">
          <h2 className="text-lg font-semibold">Your Rider</h2>
          <div className="grid grid-cols-2 gap-3">
            <input className="col-span-2 input" placeholder="Rider name" value={riderName} onChange={(e) => setRiderName(e.target.value)} />
            <input className="col-span-2 input" placeholder="Phone" value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)} />
            <button disabled={loading} onClick={createRider} className="col-span-2 btn-primary">Save Rider</button>
            <input className="col-span-2 input" placeholder="Existing Rider ID" value={riderId} onChange={(e) => setRiderId(e.target.value)} />
            <input className="col-span-2 input" placeholder="Rider API Key" value={riderKey} onChange={(e) => setRiderKey(e.target.value)} />
          </div>

          <h2 className="text-lg font-semibold pt-4">Add Driver</h2>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Name" value={driverForm.name} onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })} />
            <input className="input" placeholder="Phone" value={driverForm.phone} onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })} />
            <input className="input" placeholder="Make" value={driverForm.make} onChange={(e) => setDriverForm({ ...driverForm, make: e.target.value })} />
            <input className="input" placeholder="Model" value={driverForm.model} onChange={(e) => setDriverForm({ ...driverForm, model: e.target.value })} />
            <input className="input" placeholder="Plate" value={driverForm.plate} onChange={(e) => setDriverForm({ ...driverForm, plate: e.target.value })} />
            <input className="input" placeholder="Color" value={driverForm.color} onChange={(e) => setDriverForm({ ...driverForm, color: e.target.value })} />
            <button disabled={loading} onClick={createDriver} className="col-span-2 btn-secondary">Add Driver</button>
            <input className="col-span-2 input" placeholder="Current Driver ID" value={currentDriverId} onChange={(e) => setCurrentDriverId(e.target.value)} />
            <input className="col-span-2 input" placeholder="Driver API Key" value={currentDriverKey} onChange={(e) => setCurrentDriverKey(e.target.value)} />
            <div className="grid grid-cols-2 gap-2 col-span-2">
              <input className="input" placeholder="Driver lat" value={driverLocation.lat} onChange={(e) => setDriverLocation({ ...driverLocation, lat: e.target.value })} />
              <input className="input" placeholder="Driver lng" value={driverLocation.lng} onChange={(e) => setDriverLocation({ ...driverLocation, lng: e.target.value })} />
              <button onClick={updateDriverLoc} className="col-span-2 btn-muted">Update Driver Location</button>
            </div>
          </div>
        </section>

        <section className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-5 space-y-5">
          <h2 className="text-lg font-semibold">Book a Ride</h2>
          <MiniMap bounds={mapBounds} pickup={pickup} dropoff={dropoff} onPick={(p)=>setPickup(p)} onDrop={(d)=>setDropoff(d)} drivers={drivers} />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input className="input" placeholder="Pickup lat" value={pickup.lat} onChange={(e) => setPickup({ ...pickup, lat: e.target.value })} />
                <input className="input" placeholder="Pickup lng" value={pickup.lng} onChange={(e) => setPickup({ ...pickup, lng: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className="input" placeholder="Dropoff lat" value={dropoff.lat} onChange={(e) => setDropoff({ ...dropoff, lat: e.target.value })} />
                <input className="input" placeholder="Dropoff lng" value={dropoff.lng} onChange={(e) => setDropoff({ ...dropoff, lng: e.target.value })} />
              </div>
              <div className="grid grid-cols-4 gap-3 items-center">
                <input className="input col-span-2" placeholder="Distance (km)" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} />
                <input className="input" placeholder="Duration (min)" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
                <button disabled={loading} onClick={requestRide} className="btn-primary">Request</button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border bg-gray-50">
                <div className="text-sm text-gray-600">Estimated Fare</div>
                <div className="text-2xl font-semibold">{fare ? `$${fare}` : '-'}</div>
                <div className="text-xs text-gray-500">Surge x{surge}</div>
              </div>
              <h3 className="font-medium text-gray-700">Nearby Drivers</h3>
              <button className="btn-muted" onClick={findNearby}>Find nearby (5km)</button>
              <div className="max-h-40 overflow-auto border rounded-lg divide-y">
                {drivers.length === 0 && <div className="p-3 text-sm text-gray-500">No drivers</div>}
                {drivers.map((d) => (
                  <div key={d.id || d._id} className="p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{d.name}</div>
                      <div className="text-xs text-gray-500">{d.vehicle?.make} {d.vehicle?.model} • {d.vehicle?.plate}</div>
                      {d.location && <div className="text-xs text-gray-400">{d.location.lat}, {d.location.lng}</div>}
                    </div>
                    <button className="btn-secondary" onClick={() => assignDriver(selectedRideIdForAssign(rides), d.id || d._id)}>Assign</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h3 className="font-medium text-gray-700 pt-4">Recent Rides</h3>
          <div className="overflow-auto border rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Rider</th>
                  <th className="text-left p-2">Driver</th>
                  <th className="text-left p-2">Fare</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rides.length === 0 && (
                  <tr><td colSpan={6} className="p-3 text-center text-gray-500">No rides yet</td></tr>
                )}
                {rides.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 font-mono text-xs">{r.id}</td>
                    <td className="p-2 capitalize">{r.status}</td>
                    <td className="p-2">{r.rider_id?.slice(0,6)}...</td>
                    <td className="p-2">{r.driver_id ? r.driver_id.slice(0,6)+'...' : (
                      <select className="input" onChange={(e) => assignDriver(r.id, e.target.value)} defaultValue="">
                        <option value="" disabled>Assign driver</option>
                        {drivers.map(d => <option key={d.id || d._id} value={d.id || d._id}>{d.name}</option>)}
                      </select>
                    )}</td>
                    <td className="p-2">{r.fare_estimate ? `$${r.fare_estimate}` : '-'}</td>
                    <td className="p-2 flex gap-2 flex-wrap">
                      <button onClick={() => advanceStatus(r)} className="btn-secondary">Next</button>
                      <button onClick={() => advanceStatus(r, 'cancelled')} className="btn-muted">Cancel</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 pt-2">
            <a href="/test" className="btn-muted">Connectivity Test</a>
            <button onClick={() => { loadDrivers(); loadRides(); }} className="btn-muted">Refresh</button>
          </div>
        </section>
      </main>

      {message && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full shadow-lg text-sm">{message}</div>
      )}

      <style>{`
        .input { @apply w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50; }
        .btn-primary { @apply bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition; }
        .btn-secondary { @apply bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm transition; }
        .btn-muted { @apply bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-sm transition border; }
      `}</style>
    </div>
  )
}

function selectedRideIdForAssign(rides){
  // choose most recent requested ride for quick assign
  const r = rides.find(r => r.status === 'requested') || rides[0]
  return r ? r.id : ''
}

export default App
