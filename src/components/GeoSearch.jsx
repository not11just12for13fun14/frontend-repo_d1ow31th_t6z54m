import { useEffect, useMemo, useRef, useState } from 'react'

function GeoSearch({ apiBase, bounds, onSelect }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const controllerRef = useRef(null)

  const search = async (term) => {
    if (!term || term.length < 2) { setResults([]); return }
    try {
      if (controllerRef.current) controllerRef.current.abort()
      controllerRef.current = new AbortController()
      const res = await fetch(`${apiBase}/geo/search?q=${encodeURIComponent(term)}&limit=6`, { signal: controllerRef.current.signal })
      const data = await res.json()
      if (Array.isArray(data.results)) setResults(data.results)
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    const t = setTimeout(() => search(q), 250)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="relative">
      <input
        className="input"
        placeholder="Search address or place"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          {results.map((r, idx) => (
            <button
              key={idx}
              className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
              onClick={() => { setOpen(false); setQ(r.display_name); onSelect({ lat: r.lat, lng: r.lng }) }}
            >
              {r.display_name}
              <div className="text-xs text-gray-400">{r.lat.toFixed(5)}, {r.lng.toFixed(5)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default GeoSearch
