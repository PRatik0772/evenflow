import React from 'react';
import './Vivid.css';
import { 
  BarChart3, 
  Calendar, 
  ChevronRight, 
  MoreHorizontal, 
  Plus, 
  Ticket, 
  TrendingUp, 
  Users, 
  MapPin, 
  Clock 
} from 'lucide-react';

export default function VividDashboard() {
  return (
    <div className="vivid-theme min-h-screen text-slate-900 overflow-x-hidden flex flex-col">
      {/* Top Nav */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 via-orange-400 to-yellow-400 flex items-center justify-center">
            <TrendingUp className="text-white w-5 h-5" />
          </div>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 tracking-tight">
            EventFlow
          </span>
        </div>
        
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6 font-medium text-slate-500">
            <a href="#" className="text-slate-900">Dashboard</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Events</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Attendees</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Reports</a>
          </nav>
          <button className="bg-gradient-to-r from-pink-500 to-orange-400 text-white px-5 py-2.5 rounded-full font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-orange-400/30 transition-all duration-200 hover:-translate-y-0.5">
            <Plus className="w-5 h-5" />
            New Event
          </button>
        </div>
      </header>

      {/* Hero Stats */}
      <div className="bg-gradient-to-r from-violet-600 via-pink-500 to-orange-400 px-8 py-12 text-white">
        <div className="max-w-[1380px] mx-auto">
          <h1 className="text-4xl font-bold mb-8 tracking-tight">Welcome back, Sarah</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4 text-white/80 font-medium">
                <TrendingUp className="w-5 h-5" />
                Total Revenue
              </div>
              <div className="text-4xl font-bold mb-2">$142,450</div>
              <div className="text-sm text-emerald-300 font-medium flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> +14.5% from last month
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4 text-white/80 font-medium">
                <Ticket className="w-5 h-5" />
                Tickets Sold
              </div>
              <div className="text-4xl font-bold mb-2">12,483</div>
              <div className="text-sm text-emerald-300 font-medium flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> +8.2% from last month
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4 text-white/80 font-medium">
                <Calendar className="w-5 h-5" />
                Events This Month
              </div>
              <div className="text-4xl font-bold mb-2">8</div>
              <div className="text-sm text-white/70 font-medium">
                3 currently active
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4 text-white/80 font-medium">
                <Users className="w-5 h-5" />
                Avg Check-in Rate
              </div>
              <div className="text-4xl font-bold mb-2">89%</div>
              <div className="text-sm text-emerald-300 font-medium flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> +2.1% from last month
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto p-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Events & Upcoming */}
        <div className="xl:col-span-2 flex flex-col gap-8">
          
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Active Events</h2>
            <button className="text-pink-500 font-semibold hover:text-pink-600 flex items-center gap-1 transition-colors">
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 2x2 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Event Card 1 */}
            <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden group border border-slate-100 flex flex-col h-full">
              <div className="h-32 bg-gradient-to-br from-pink-500 to-orange-400 relative">
                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/30">
                  On Sale
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold mb-2 line-clamp-1 group-hover:text-pink-500 transition-colors">Splendour in the Grass</h3>
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                  <Calendar className="w-4 h-4" /> Jul 21 - Jul 23, 2024
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-6">
                  <MapPin className="w-4 h-4" /> Byron Bay, NSW
                </div>
                
                <div className="mt-auto grid grid-cols-2 gap-4 items-center">
                  <div className="flex items-center gap-4">
                    <div 
                      className="conic-chart w-12 h-12 flex items-center justify-center relative shadow-inner"
                      style={{ '--chart-color': '#ec4899', '--chart-percent': '75%' } as React.CSSProperties}
                    >
                      <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-xs font-bold text-pink-500">
                        75%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold">15k/20k</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Capacity</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">$2.4M</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Revenue</div>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100 p-4 bg-slate-50/50 grid grid-cols-2 gap-3">
                <button className="bg-white border border-slate-200 rounded-xl py-2 text-sm font-bold hover:bg-slate-50 transition-colors">Manage</button>
                <button className="bg-slate-900 text-white rounded-xl py-2 text-sm font-bold hover:bg-slate-800 transition-colors">View Report</button>
              </div>
            </div>

            {/* Event Card 2 */}
            <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden group border border-slate-100 flex flex-col h-full">
              <div className="h-32 bg-gradient-to-br from-violet-600 to-indigo-500 relative">
                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/30 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot" /> Live
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold mb-2 line-clamp-1 group-hover:text-violet-600 transition-colors">Vivid Sydney Closing</h3>
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                  <Calendar className="w-4 h-4" /> Tonight, 8:00 PM
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-6">
                  <MapPin className="w-4 h-4" /> Sydney Opera House
                </div>
                
                <div className="mt-auto grid grid-cols-2 gap-4 items-center">
                  <div className="flex items-center gap-4">
                    <div 
                      className="conic-chart w-12 h-12 flex items-center justify-center relative shadow-inner"
                      style={{ '--chart-color': '#8b5cf6', '--chart-percent': '98%' } as React.CSSProperties}
                    >
                      <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-xs font-bold text-violet-600">
                        98%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold">4.9k/5k</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Capacity</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">$450k</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Revenue</div>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100 p-4 bg-slate-50/50 grid grid-cols-2 gap-3">
                <button className="bg-white border border-slate-200 rounded-xl py-2 text-sm font-bold hover:bg-slate-50 transition-colors">Manage</button>
                <button className="bg-slate-900 text-white rounded-xl py-2 text-sm font-bold hover:bg-slate-800 transition-colors">Scanner</button>
              </div>
            </div>

            {/* Event Card 3 */}
            <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden group border border-slate-100 flex flex-col h-full">
              <div className="h-32 bg-gradient-to-br from-emerald-400 to-teal-500 relative">
                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/30">
                  Draft
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold mb-2 line-clamp-1 group-hover:text-emerald-500 transition-colors">Laneway Festival Melb</h3>
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                  <Calendar className="w-4 h-4" /> Feb 10, 2025
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-6">
                  <MapPin className="w-4 h-4" /> The Park, Melbourne
                </div>
                
                <div className="mt-auto grid grid-cols-2 gap-4 items-center">
                  <div className="flex items-center gap-4">
                    <div 
                      className="conic-chart w-12 h-12 flex items-center justify-center relative shadow-inner opacity-40"
                      style={{ '--chart-color': '#10b981', '--chart-percent': '0%' } as React.CSSProperties}
                    >
                      <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-xs font-bold text-slate-400">
                        0%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-400">0/12k</div>
                      <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Capacity</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-400">$0</div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Revenue</div>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100 p-4 bg-slate-50/50 grid grid-cols-2 gap-3">
                <button className="bg-white border border-slate-200 rounded-xl py-2 text-sm font-bold hover:bg-slate-50 transition-colors col-span-2">Continue Editing</button>
              </div>
            </div>

            {/* Event Card 4 */}
            <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden group border border-slate-100 flex flex-col h-full">
              <div className="h-32 bg-gradient-to-br from-amber-400 to-orange-500 relative">
                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/30">
                  On Sale
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold mb-2 line-clamp-1 group-hover:text-orange-500 transition-colors">Listen Out Brisbane</h3>
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                  <Calendar className="w-4 h-4" /> Sep 30, 2024
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-6">
                  <MapPin className="w-4 h-4" /> Brisbane Showgrounds
                </div>
                
                <div className="mt-auto grid grid-cols-2 gap-4 items-center">
                  <div className="flex items-center gap-4">
                    <div 
                      className="conic-chart w-12 h-12 flex items-center justify-center relative shadow-inner"
                      style={{ '--chart-color': '#f59e0b', '--chart-percent': '42%' } as React.CSSProperties}
                    >
                      <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-xs font-bold text-orange-500">
                        42%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold">10.5k/25k</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Capacity</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">$1.2M</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Revenue</div>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100 p-4 bg-slate-50/50 grid grid-cols-2 gap-3">
                <button className="bg-white border border-slate-200 rounded-xl py-2 text-sm font-bold hover:bg-slate-50 transition-colors">Manage</button>
                <button className="bg-slate-900 text-white rounded-xl py-2 text-sm font-bold hover:bg-slate-800 transition-colors">View Report</button>
              </div>
            </div>

          </div>

          {/* Bottom Section: Upcoming this week */}
          <div className="mt-6">
            <h2 className="text-xl font-bold tracking-tight mb-4">Upcoming Schedule</h2>
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-2 flex gap-2 overflow-x-auto snap-x">
              {[
                { day: 'Mon', date: '12', event: null },
                { day: 'Tue', date: '13', event: 'Staff Briefing' },
                { day: 'Wed', date: '14', event: null },
                { day: 'Thu', date: '15', event: 'Venue Walkthrough' },
                { day: 'Fri', date: '16', event: 'Vivid Opening', active: true },
                { day: 'Sat', date: '17', event: 'Vivid Night 2' },
                { day: 'Sun', date: '18', event: 'Pack Down' },
              ].map((item, i) => (
                <div key={i} className={`min-w-[120px] rounded-xl p-4 snap-start border ${item.active ? 'border-pink-500 bg-pink-50' : 'border-transparent hover:bg-slate-50'} transition-colors`}>
                  <div className={`text-xs font-bold uppercase ${item.active ? 'text-pink-500' : 'text-slate-400'}`}>{item.day}</div>
                  <div className={`text-2xl font-bold mb-3 ${item.active ? 'text-pink-600' : 'text-slate-900'}`}>{item.date}</div>
                  {item.event ? (
                    <div className="text-xs font-bold p-2 bg-white rounded-lg border border-slate-100 shadow-sm leading-tight text-slate-700">
                      {item.event}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-300 italic p-2">No events</div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Activity Sidebar */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200 p-6 border border-slate-100 flex flex-col h-full animate-slide-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
          
          {/* Live Right Now */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse-dot" />
              <h2 className="text-xl font-bold tracking-tight">Live Right Now</h2>
            </div>
            
            <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/30 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-500/30 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
              
              <h3 className="font-bold text-lg mb-1 relative z-10">Vivid Sydney</h3>
              <div className="text-sm text-slate-400 mb-6 relative z-10">Main Gates</div>
              
              <div className="flex items-end justify-between mb-2 relative z-10">
                <div>
                  <div className="text-sm text-slate-400 font-medium mb-1">Checked In</div>
                  <div className="text-4xl font-bold tracking-tight">3,492</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-400 font-medium mb-1">Total</div>
                  <div className="text-xl font-bold">5,000</div>
                </div>
              </div>
              
              <div className="h-3 bg-white/10 rounded-full overflow-hidden relative z-10">
                <div className="h-full bg-gradient-to-r from-violet-400 to-pink-500 rounded-full animate-bar-grow" style={{ '--target-width': '70%' } as React.CSSProperties} />
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold tracking-tight">Recent Orders</h2>
              <button className="p-1 text-slate-400 hover:bg-slate-100 rounded-md transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {[
                { name: 'Michael C.', event: 'Listen Out Brisbane', tickets: 2, amount: '$240', time: '2m ago' },
                { name: 'Sarah W.', event: 'Splendour in the Grass', tickets: 4, amount: '$950', time: '15m ago' },
                { name: 'James T.', event: 'Laneway Festival Melb', tickets: 1, amount: '$165', time: '1h ago' },
                { name: 'Emma R.', event: 'Vivid Sydney', tickets: 2, amount: '$0', time: '2h ago' },
              ].map((order, i) => (
                <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group cursor-pointer border border-transparent hover:border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 group-hover:bg-pink-100 group-hover:text-pink-600 transition-colors">
                      {order.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">{order.name}</div>
                      <div className="text-xs text-slate-500">{order.tickets}x {order.event}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-slate-900">{order.amount}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 justify-end"><Clock className="w-3 h-3" /> {order.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h2 className="text-sm font-bold tracking-tight text-slate-400 mb-4 uppercase">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm transition-colors border border-slate-200">
                Scan Tickets
              </button>
              <button className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm transition-colors border border-slate-200">
                Sell Door Tix
              </button>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
