'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { Search, Bell, Settings, User } from 'lucide-react'

// Dynamically import the map so Vercel doesn't crash during build (SSR Fix)
const ConflictMap = dynamic(() => import('@/components/ConflictMap'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#0a0a0a] flex items-center justify-center text-neutral-600 font-mono text-sm">INITIALIZING SATELLITE LINK...</div>
})

const categoryColors: Record<string, string> = {
  'Kinetic: Air & Missile': '#ef4444',
  'Kinetic: Ground Combat': '#ef4444',
  'Kinetic: Naval': '#ef4444',
  'Unmanned / Drone Activity': '#f97316',
  'Cyber & Electronic Warfare': '#06b6d4',
  'Terrorism & Insurgency': '#dc2626',
  'Infrastructure & Sabotage': '#f59e0b',
  'Military Movement & Buildup': '#8b5cf6',
  'Civil Unrest & Protest': '#eab308',
  'Diplomatic & Economic': '#10b981',
  'Humanitarian Crisis': '#ec4899',
  'Other': '#6b7280',
}

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

export default function Dashboard() {
  const [events, setEvents] = useState<ConflictEvent[]>([])
  const [filter, setFilter] = useState('ALL')
  const [selectedEvent, setSelectedEvent] = useState<ConflictEvent | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    async function fetchEvents() {
      const { data, error } = await supabase
        .from('conflict_events')
        .select('*')
        .order('event_timestamp', { ascending: false })
        .limit(100)
      
      if (data) setEvents(data)
      if (error) console.error(error)
    }
    fetchEvents()
  }, [])

  const filteredEvents = events.filter(e => {
    if (filter === 'ALL') return true
    if (filter === 'KINETIC') return e.attack_category.includes('Kinetic')
    if (filter === 'CYBER') return e.attack_category.includes('Cyber')
    if (filter === 'UNREST') return e.attack_category.includes('Unrest')
    if (filter === 'DIPLOMATIC') return e.attack_category.includes('Diplomatic')
    return true
  })

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] text-gray-300 flex flex-col font-mono overflow-hidden">
      
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#111] z-10">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-white tracking-widest">GLOBAL CONFLICT ANALYZER</h1>
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search nodes, regions..." 
              className="bg-[#1a1a1a] border border-neutral-700 rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:border-cyan-500 w-64"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 border border-green-900 bg-green-950/30 px-3 py-1 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-500 tracking-wider">LIVE SYSTEM STATUS</span>
          </div>
          <Bell className="w-5 h-5 hover:text-white cursor-pointer" />
          <Settings className="w-5 h-5 hover:text-white cursor-pointer" />
          <User className="w-5 h-5 hover:text-white cursor-pointer" />
        </div>
      </header>

      {/* FILTER BAR */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-neutral-800 bg-[#0f0f0f] z-10 overflow-x-auto">
        <span className="text-xs text-gray-500 tracking-widest shrink-0">FILTERS:</span>
        {['ALL', 'KINETIC', 'CYBER', 'UNREST', 'DIPLOMATIC'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1 text-xs rounded-full border tracking-wider transition-colors shrink-0 ${
              filter === f ? 'bg-gray-200 text-black border-gray-200' : 'border-neutral-700 hover:border-gray-400'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* LEFT SIDEBAR */}
        <div className="w-full md:w-[400px] border-r border-neutral-800 bg-[#111] flex flex-col z-10 h-full absolute md:relative transition-transform">
          <div className="px-4 py-3 border-b border-neutral-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs tracking-widest font-bold text-white">LIVE EVENT FEED</span>
            </div>
            <span className="text-xs text-neutral-500">{filteredEvents.length} ACTIVE NODES</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {filteredEvents.map(event => {
              const color = categoryColors[event.attack_category] || '#6b7280'
              return (
                <div 
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="p-4 border border-neutral-800 rounded-md bg-[#161616] hover:border-neutral-600 cursor-pointer transition-all hover:bg-[#1a1a1a]"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span 
                      className="text-[10px] px-2 py-0.5 rounded border" 
                      style={{ color: color, borderColor: color }}
                    >
                      {event.attack_category.toUpperCase()}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {isMounted && formatDistanceToNow(new Date(event.event_timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <h3 className="text-white font-bold mb-2 uppercase">{event.area_name}</h3>
                  <p className="text-sm text-neutral-400 line-clamp-3 mb-4">{event.summary}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500 tracking-wider">CONFIDENCE</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full" style={{ width: `${event.ai_score}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: color }}>{event.ai_score}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* MAP AREA */}
        <div className="flex-1 relative bg-[#0a0a0a] z-0">
          <ConflictMap 
            events={filteredEvents}
            selectedEvent={selectedEvent}
            setSelectedEvent={setSelectedEvent}
            categoryColors={categoryColors}
          />
        </div>
      </div>
    </div>
  )
}