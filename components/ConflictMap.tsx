'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import type { Icon, DivIcon } from 'leaflet'

interface ConflictEvent {
  id: string | number
  latitude: number
  longitude: number
  area_name: string
  summary: string
  attack_category: string
  primary_source_url: string
  ai_score: number
  event_timestamp: string
}

interface ConflictMapProps {
  events: ConflictEvent[]
  selectedEvent: ConflictEvent | null
  setSelectedEvent: (event: ConflictEvent) => void
  categoryColors: Record<string, string>
}

export default function ConflictMap({ 
  events, 
  selectedEvent, 
  setSelectedEvent, 
  categoryColors 
}: ConflictMapProps) {
  const [L, setL] = useState<any>(null)

  useEffect(() => {
    // Dynamically import leaflet to avoid SSR issues
    import('leaflet').then((leaflet) => {
      setL(leaflet.default || leaflet)
    })
  }, [])

  const createCustomIcon = (category: string): DivIcon | null => {
    if (!L || !L.divIcon) return null
    const color = categoryColors[category] || '#6b7280'
    
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 1px solid black; box-shadow: 0 0 10px ${color};"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    })
  }

  if (!L) {
    return (
      <div className="h-full w-full bg-[#0a0a0a] flex items-center justify-center text-neutral-600 font-mono text-sm">
        CALIBRATING MAP ENGINE...
      </div>
    )
  }

  return (
    <MapContainer 
      center={[40.0, 35.0]} 
      zoom={3} 
      className="h-full w-full z-0"
      zoomControl={false}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {events.map((event) => {
        if (!event.latitude || !event.longitude) return null;

        const customIcon = createCustomIcon(event.attack_category)
        if (!customIcon) return null

        return (
          <Marker 
            key={event.id}
            position={[event.latitude, event.longitude]}
            icon={customIcon as any}
            eventHandlers={{
              click: () => setSelectedEvent(event),
            }}
          >
            {selectedEvent?.id === event.id && (
              <Popup className="custom-dark-popup" closeButton={false}>
                <div className="bg-[#161616] p-1 max-w-[280px] text-gray-300 font-mono">
                  <h4 className="font-bold text-white uppercase mb-2 border-b border-neutral-700 pb-2">
                    {event.area_name}
                  </h4>
                  <p className="text-xs mb-3 text-neutral-400">{event.summary}</p>
                  <a 
                    href={event.primary_source_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] text-cyan-500 hover:text-cyan-400 border border-cyan-900 bg-cyan-950/30 px-3 py-1.5 rounded block text-center uppercase tracking-widest"
                  >
                    Access Source Intel
                  </a>
                </div>
              </Popup>
            )}
          </Marker>
        );
      })}
    </MapContainer>
  )
}
