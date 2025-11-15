import { useEffect, useMemo, useState } from 'react'

function App() {
  const apiBase = useMemo(() => (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'), [])

  // Rider creation (simple auth-less identity for demo)
  const [riderName, setRiderName] = useState('')
  const [riderPhone, setRiderPhone] = useState('')
  const [riderId, setRiderId] = useState('')

  // Drivers
  const [drivers, setDrivers] = useState([])
  const [driverForm, setDriverForm] = useState({ name: '', phone: '', make: '', model: '', plate: '', color: '' })

  // Ride booking
  const [pickup, setPickup] = useState({ lat: '', lng: '' })
  const [dropoff, setDropoff] = useState({ lat: '', lng: '' })
  const [distanceKm, setDistanceKm] = useState('')
  const [fare, setFare] = useState('')
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const notify = (msg, timeout = 3000) => {
    setMessage(msg)
    if (timeout) setTimeout(() => setMessage(''), timeout)
  }

  // Fetch initial data
  useEffect(() => {
    loadDrivers()
    loadRides()
  }, [])

  const loadDrivers = async () => {
    try {
      const res = await fetch(`${apiBase}/drivers`)
      const data = await res.json()
      setDrivers(data)
    } catch (e) {
      console.error(e)
    }
  }

  const loadRides = async () => {
    try {
      const res = await fetch(`${apiBase}/rides`)
      const data = await res.json()
      setRides(data)
    } catch (e) {
      console.error(e)
    }
  }

  const createRider = async () => {
    if (!riderName || !riderPhone) return notify('Enter rider name and phone')
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/riders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: riderName, phone: riderPhone, rating: 5 }),
      })
      const data = await res.json()
      if (res.ok && data.id) {
        setRiderId(data.id)
        notify('Rider created')
      } else {
        notify('Failed to create rider')
      }
    } catch (e) {
      notify('Error creating rider')
    } finally {
      setLoading(false)
    }
  }

  const createDriver = async () => {
    const { name, phone, make, model, plate, color } = driverForm
    if (!name || !phone || !make || !model || !plate) return notify('Complete driver and vehicle details')
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/drivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          vehicle: { make, model, plate, color },
          is_available: true,
        }),
      })
      if (res.ok) {
        notify('Driver added')
        setDriverForm({ name: '', phone: '', make: '', model: '', plate: '', color: '' })
        loadDrivers()
      } else {
        notify('Failed to add driver')
      }
    } catch (e) {
      notify('Error adding driver')
    } finally {
      setLoading(false)
    }
  }

  const estimateFare = () => {
    const d = parseFloat(distanceKm)
    if (isNaN(d)) return setFare('')
    const est = Math.round((2.0 + 1.2 * d) * 100) / 100
    setFare(est.toString())
  }

  useEffect(() => {
    estimateFare()
  }, [distanceKm])

  const requestRide = async () => {
    if (!riderId) return notify('Create or set a rider first')
    if (!pickup.lat || !pickup.lng || !dropoff.lat || !dropoff.lng) return notify('Enter pickup and dropoff coordinates')
    setLoading(true)
    try {
      const body = {
        rider_id: riderId,
        pickup: { lat: Number(pickup.lat), lng: Number(pickup.lng) },
        dropoff: { lat: Number(dropoff.lat), lng: Number(dropoff.lng) },
        distance_km: distanceKm ? Number(distanceKm) : undefined,
        fare_estimate: fare ? Number(fare) : undefined,
        status: 'requested',
      }
      const res = await fetch(`${apiBase}/rides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok && data.id) {
        notify('Ride requested')
        setPickup({ lat: '', lng: '' })
        setDropoff({ lat: '', lng: '' })
        setDistanceKm('')
        loadRides()
      } else {
        notify('Failed to request ride')
      }
    } catch (e) {
      notify('Error requesting ride')
    } finally {
      setLoading(false)
    }
  }

  const assignDriver = async (rideId, driverId) => {
    try {
      const res = await fetch(`${apiBase}/rides/${rideId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: driverId, status: 'assigned' }),
      })
      if (res.ok) {
        notify('Driver assigned')
        loadRides()
      }
    } catch (e) {
      notify('Error assigning driver')
    }
  }

  const advanceStatus = async (ride) => {
    const next = {
      requested: 'assigned',
      assigned: 'ongoing',
      ongoing: 'completed',
      completed: 'completed',
      cancelled: 'cancelled',
    }[ride.status] || 'completed'

    try {
      const res = await fetch(`${apiBase}/rides/${ride.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) {
        notify(`Ride status → ${next}`)
        loadRides()
      }
    } catch (e) {
      notify('Error updating ride')
    }
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

      <main className="max-w-6xl mx-auto p-6 grid md:grid-cols-3 gap-6">
        <section className="md:col-span-1 bg-white rounded-xl shadow-sm border p-5 space-y-5">
          <h2 className="text-lg font-semibold">Your Rider</h2>
          <div className="grid grid-cols-2 gap-3">
            <input className="col-span-2 input" placeholder="Rider name" value={riderName} onChange={(e) => setRiderName(e.target.value)} />
            <input className="col-span-2 input" placeholder="Phone" value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)} />
            <button disabled={loading} onClick={createRider} className="col-span-2 btn-primary">Save Rider</button>
            <input className="col-span-2 input" placeholder="Existing Rider ID (optional)" value={riderId} onChange={(e) => setRiderId(e.target.value)} />
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
          </div>
        </section>

        <section className="md:col-span-2 bg-white rounded-xl shadow-sm border p-5 space-y-5">
          <h2 className="text-lg font-semibold">Book a Ride</h2>
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
              <div className="grid grid-cols-3 gap-3 items-center">
                <input className="input" placeholder="Distance (km)" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} />
                <input className="input" placeholder="Fare estimate" value={fare} onChange={(e) => setFare(e.target.value)} />
                <button disabled={loading} onClick={requestRide} className="btn-primary">Request Ride</button>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-medium text-gray-700">Available Drivers</h3>
              <div className="max-h-48 overflow-auto border rounded-lg divide-y">
                {drivers.length === 0 && <div className="p-3 text-sm text-gray-500">No drivers yet</div>}
                {drivers.map((d) => (
                  <div key={d.id || d._id} className="p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{d.name}</div>
                      <div className="text-xs text-gray-500">{d.vehicle?.make} {d.vehicle?.model} • {d.vehicle?.plate}</div>
                    </div>
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
                    <td className="p-2">
                      <button onClick={() => advanceStatus(r)} className="btn-secondary">Next status</button>
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

export default App
