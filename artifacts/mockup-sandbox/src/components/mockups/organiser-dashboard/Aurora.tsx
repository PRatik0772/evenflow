import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Plus, Calendar, MapPin, MoreHorizontal, ArrowUpRight, CheckCircle2, Ticket, Users } from 'lucide-react';
import './Aurora.css';

const EVENTS = [
  {
    id: 1,
    title: 'The Opera House Sessions',
    date: 'Oct 12 - Oct 14, 2024',
    venue: 'Sydney Opera House, NSW',
    status: 'Live',
    statusClass: 'live',
    revenue: '$142,500',
    sold: '85%',
    capacity: '1,200',
    progress: 85
  },
  {
    id: 2,
    title: 'Gold Coast Food & Wine Festival',
    date: 'Nov 02 - Nov 05, 2024',
    venue: 'Broadwater Parklands, QLD',
    status: 'Published',
    statusClass: 'published',
    revenue: '$84,200',
    sold: '42%',
    capacity: '5,000',
    progress: 42
  },
  {
    id: 3,
    title: 'Sydney Queer Screen Film Fest',
    date: 'Feb 15 - Feb 28, 2025',
    venue: 'Event Cinemas George St, NSW',
    status: 'Draft',
    statusClass: 'draft',
    revenue: '$0',
    sold: '0%',
    capacity: '3,500',
    progress: 0
  }
];

const CHIPS = ['All Events', 'Upcoming', 'Live', 'Draft', 'Past'];

export default function AuroraDashboard() {
  const [activeChip, setActiveChip] = useState(0);
  const chipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const activeElement = chipRefs.current[activeChip];
    if (activeElement) {
      setIndicatorStyle({
        left: activeElement.offsetLeft,
        width: activeElement.offsetWidth,
      });
    }
  }, [activeChip]);

  return (
    <div className="aurora-dashboard">
      {/* Top Nav */}
      <nav className="flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded aurora-gradient animate-shimmer shadow-inner flex items-center justify-center text-white font-bold text-sm">
            EF
          </div>
          <span className="aurora-heading text-2xl tracking-tight text-gray-900 mt-1">EventFlow</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search events, attendees..." 
              className="pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-full text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <button className="relative text-gray-500 hover:text-gray-900 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
          </button>
          <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-200 cursor-pointer">
            <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Sarah&backgroundColor=f3f4f6" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <button className="flex items-center gap-2 px-5 py-2 rounded-full border border-gray-200 text-sm font-medium hover:border-transparent hover:text-white relative overflow-hidden group transition-all">
            <div className="absolute inset-0 aurora-gradient opacity-0 group-hover:opacity-100 transition-opacity z-0"></div>
            <span className="relative z-10 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Event
            </span>
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-[1380px] mx-auto px-8 py-10">
        {/* Header */}
        <header className="mb-12 animate-fade-in-slide" style={{ animationDelay: '0.1s' }}>
          <p className="text-gray-500 text-sm font-medium mb-2 tracking-wide uppercase">Tuesday, Oct 10</p>
          <h1 className="aurora-heading text-5xl text-gray-900 mb-8">Good evening, Sarah.</h1>
          
          <div className="chip-filter">
            <div className="chip-indicator" style={{ transform: `translateX(${indicatorStyle.left}px)`, width: `${indicatorStyle.width}px` }}></div>
            {CHIPS.map((chip, i) => (
              <div 
                key={chip}
                ref={el => chipRefs.current[i] = el}
                className={`chip ${activeChip === i ? 'active' : ''}`}
                onClick={() => setActiveChip(i)}
              >
                {chip}
              </div>
            ))}
          </div>
        </header>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column - Event Feed */}
          <div className="lg:col-span-8 space-y-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900">Your Events</h2>
              <button className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors">
                View all <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {EVENTS.map((event, index) => (
              <div 
                key={event.id} 
                className="event-card p-6 pl-8 animate-fade-in-slide"
                style={{ 
                  animationDelay: `${0.2 + (index * 0.1)}s`,
                  '--card-status-color': event.statusClass === 'live' ? '#8B5CF6' : event.statusClass === 'published' ? '#10B981' : '#F59E0B'
                } as React.CSSProperties}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-2 h-2 rounded-full status-dot-${event.statusClass}`}></div>
                      <span className="text-xs font-semibold tracking-wider uppercase text-gray-500">{event.status}</span>
                    </div>
                    <h3 className="aurora-heading text-3xl text-gray-900 mb-2">{event.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {event.date}</span>
                      <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {event.venue}</span>
                    </div>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-100 flex items-end justify-between">
                  <div className="flex gap-8">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Gross Revenue</p>
                      <p className="text-xl font-medium text-gray-900">{event.revenue}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Tickets Sold</p>
                      <p className="text-xl font-medium text-gray-900">{event.sold} <span className="text-sm text-gray-400 font-normal">/ {event.capacity}</span></p>
                    </div>
                  </div>
                  
                  <div className="w-48">
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                      <span>Sales Progress</span>
                      <span>{event.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full status-bar-${event.statusClass}`} 
                        style={{ width: `${event.progress}%`, transition: 'width 1s ease-out' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-4 space-y-8 animate-fade-in-slide" style={{ animationDelay: '0.4s' }}>
            
            {/* Revenue Widget */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-purple-500/10 transition-colors"></div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Revenue This Month</h3>
              <div className="flex items-end gap-3 mb-6">
                <p className="aurora-heading text-5xl text-gray-900 tracking-tight">$226,700</p>
                <span className="flex items-center text-emerald-500 text-sm font-medium mb-2 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <ArrowUpRight className="w-3 h-3 mr-1" /> +14.2%
                </span>
              </div>
              
              <div className="sparkline-container">
                {[4, 7, 5, 8, 12, 15, 10, 18, 24, 20, 28, 32].map((val, i) => (
                  <div 
                    key={i} 
                    className="sparkline-bar animate-bar-rise" 
                    style={{ height: `${val * 3}%`, animationDelay: `${0.5 + (i * 0.05)}s` }}
                  ></div>
                ))}
              </div>
            </div>

            {/* Performance Overview */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
              <div className="chart-bar-container">
                {[40, 60, 45, 80, 55, 90, 75].map((val, i) => (
                  <div 
                    key={i} 
                    className={`chart-bar animate-bar-rise ${i === 5 ? 'highlight' : ''}`}
                    style={{ height: `${val}%`, animationDelay: `${0.6 + (i * 0.1)}s` }}
                  >
                    {i === 5 && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-white/50"></div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 text-xs text-gray-400">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span className="text-blue-600 font-medium">Sat</span>
                <span>Sun</span>
              </div>
            </div>

            {/* Upcoming Mini Calendar */}
            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center justify-between">
                Schedule <button className="text-blue-600 hover:text-blue-700 font-normal">View Calendar</button>
              </h3>
              <div className="space-y-4">
                <div className="flex gap-4 group cursor-pointer">
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-gray-50 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <span className="text-xs uppercase font-semibold">Oct</span>
                    <span className="text-lg font-bold leading-none">12</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Doors Open: Opera House</p>
                    <p className="text-sm text-gray-500">6:30 PM • Main Hall</p>
                  </div>
                </div>
                <div className="flex gap-4 group cursor-pointer">
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-gray-50 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <span className="text-xs uppercase font-semibold">Oct</span>
                    <span className="text-lg font-bold leading-none">15</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Final Settlement: TechWeek</p>
                    <p className="text-sm text-gray-500">10:00 AM • Automated</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Bottom Floating Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-gray-200/50 shadow-2xl shadow-gray-200/50 rounded-full px-8 py-3 flex items-center gap-12 z-50 animate-fade-in-slide" style={{ animationDelay: '0.8s' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Ticket className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Live Scans</p>
            <p className="font-semibold text-gray-900 leading-none animate-tick-up" style={{ animationDelay: '1s' }}>1,248</p>
          </div>
        </div>
        <div className="w-px h-8 bg-gray-200"></div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Active Users</p>
            <p className="font-semibold text-gray-900 leading-none animate-tick-up" style={{ animationDelay: '1.2s' }}>4,922</p>
          </div>
        </div>
        <div className="w-px h-8 bg-gray-200"></div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">System Status</p>
            <p className="font-semibold text-gray-900 leading-none flex items-center gap-1.5">
              Operational <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
