import { useEffect, useRef } from 'react'

export interface MapMarker {
  lat: number
  lng: number
  label: string
  sublabel?: string
  color?: 'blue' | 'green' | 'red' | 'orange' | 'grey'
}

interface LeafletMapProps {
  markers: MapMarker[]
  center?: [number, number]
  zoom?: number
  height?: string
}

declare global {
  interface Window { L: any }
}

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

const COLOR_HEX: Record<string, string> = {
  blue:   '#3b82f6',
  green:  '#22c55e',
  red:    '#ef4444',
  orange: '#f97316',
  grey:   '#94a3b8',
}

function makeSvgIcon(L: any, color: string) {
  const hex = COLOR_HEX[color] ?? COLOR_HEX.blue
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.75 14 22 14 22S28 23.75 28 14C28 6.27 21.73 0 14 0z"
            fill="${hex}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  })
}

export default function LeafletMap({ markers, center = [3.1390, 101.6869], zoom = 11, height = '400px' }: LeafletMapProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<any>(null)
  const markerGroupRef = useRef<any>(null)

  // Load Leaflet CSS once
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link    = document.createElement('link')
      link.id       = 'leaflet-css'
      link.rel      = 'stylesheet'
      link.href     = LEAFLET_CSS
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    }
  }, [])

  // Init map
  useEffect(() => {
    function init() {
      if (!containerRef.current || mapRef.current) return
      const L   = window.L
      const map = L.map(containerRef.current, { zoomControl: true }).setView(center, zoom)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      markerGroupRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
      // Trigger initial marker render
      updateMarkers(L)
    }

    if (window.L) {
      init()
    } else if (!document.getElementById('leaflet-js')) {
      const script    = document.createElement('script')
      script.id       = 'leaflet-js'
      script.src      = LEAFLET_JS
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV/XN/WPcE='
      script.crossOrigin = 'anonymous'
      script.onload = init
      document.head.appendChild(script)
    } else {
      // Script tag exists but not yet loaded — wait
      document.getElementById('leaflet-js')!.addEventListener('load', init)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerGroupRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update markers whenever the prop changes
  useEffect(() => {
    if (!mapRef.current || !window.L) return
    updateMarkers(window.L)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers])

  function updateMarkers(L: any) {
    if (!markerGroupRef.current) return
    markerGroupRef.current.clearLayers()
    markers.forEach(m => {
      if (m.lat == null || m.lng == null) return
      const icon = makeSvgIcon(L, m.color ?? 'blue')
      const popup = `<b>${m.label}</b>${m.sublabel ? `<br/><span style="color:#666;font-size:12px">${m.sublabel}</span>` : ''}`
      L.marker([m.lat, m.lng], { icon }).bindPopup(popup).addTo(markerGroupRef.current)
    })

    // Fit bounds if there are markers
    if (markers.length > 0) {
      const valid = markers.filter(m => m.lat != null && m.lng != null)
      if (valid.length === 1) {
        mapRef.current.setView([valid[0].lat, valid[0].lng], zoom)
      } else if (valid.length > 1) {
        const bounds = L.latLngBounds(valid.map(m => [m.lat, m.lng]))
        mapRef.current.fitBounds(bounds, { padding: [40, 40] })
      }
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden' }}
    />
  )
}
