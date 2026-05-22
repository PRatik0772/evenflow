import React, { useEffect, useState } from 'react';
import { Zap, LayoutDashboard, Calendar, BarChart3, Settings, Plus, MapPin, Clock, Edit2, QrCode, Eye, ChevronRight, CheckCircle2, Ticket } from 'lucide-react';
import './_group.css';

export default function ObsidianDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans overflow-hidden selection:bg-indigo-500/30">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Syne:wght@600;700;800&display=swap');
        .font-syne { font-family: 'Syne', sans-serif; }
      `}} />

      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[50%] bg-violet-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-[1380px] mx-auto px-6 py-6 h-screen flex flex-col">
        
        {/* Top Nav */}
        <header className="flex items-center justify-between mb-8 animate-fade-in-up">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <Zap className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="font-syne text-2xl tracking-tight font-bold">EventFlow</span>
            </div>
            
            <nav className="hidden lg:flex items-center gap-1 bg-white/[0.03] p-1.5 rounded-full border border-white/[0.05]">
              <a href="#" className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </a>
              <a href="#" className="flex items-center gap-2 px-4 py-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium">
                <Calendar className="w-4 h-4" />
                Events
              </a>
              <a href="#" className="flex items-center gap-2 px-4 py-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </a>
              <a href="#" className="flex items-center gap-2 px-4 py-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium">
                <Settings className="w-4 h-4" />
                Settings
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button className="hidden sm:flex items-center gap-2 btn-gradient px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg">
              <Plus className="w-4 h-4" />
              New Event
            </button>
            <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden ml-2 cursor-pointer hover:border-indigo-500/50 transition-colors">
              <div className="w-full h-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-bold">
                AJ
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar pr-2 pb-6">
            
            {/* Greeting */}
            <div className="mb-8 animate-fade-in-up delay-100">
              <h1 className="font-syne text-4xl font-bold mb-2">Welcome back, Alex.</h1>
              <p className="text-zinc-400">Here's what's happening with your events today.</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Revenue (AUD)', value: '$124,500', trend: '+12%', color: 'from-emerald-400 to-emerald-600' },
                { label: 'Tickets Sold', value: '1,420', trend: '+8%', color: 'from-blue-400 to-blue-600' },
                { label: 'Live Events', value: '3', trend: 'Steady', color: 'from-zinc-400 to-zinc-600' },
                { label: 'Avg Rating', value: '4.8', trend: '+0.2', color: 'from-amber-400 to-amber-600' }
              ].map((stat, i) => (
                <div key={i} className={`glass-card p-5 animate-fade-in-up`} style={{ animationDelay: \`\${(i+1)*100}ms\` }}>
                  <p className="text-sm font-medium text-zinc-400 mb-1">{stat.label}</p>
                  <div className="flex items-end justify-between">
                    <h3 className="font-syne text-3xl font-bold text-gradient animate-count-up">{mounted ? stat.value : '0'}</h3>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/5 text-emerald-400 border border-emerald-500/20">
                      {stat.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Events Slider Section */}
            <div className="mb-4 flex items-center justify-between animate-fade-in-up delay-400">
              <h2 className="font-syne text-2xl font-bold">Active Events</h2>
              <button className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-6 overflow-x-auto custom-scrollbar pb-6 animate-fade-in-up delay-500 snap-x">
              
              {/* Event Card 1 */}
              <div className="glass-card glass-card-hover min-w-[340px] flex-shrink-0 snap-start overflow-hidden flex flex-col">
                <div className="h-32 w-full relative" style={{ background: 'linear-gradient(135deg, #FF0080 0%, #7928CA 100%)' }}>
                  <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold border border-white/10 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                    Published
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-syne text-xl font-bold mb-1 truncate">Vivid Sydney After Party</h3>
                  <div className="flex items-center gap-4 text-xs text-zinc-400 mb-4">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Jun 15, 2024</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Opera Bar, Sydney</span>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-zinc-400">Tickets Sold</span>
                      <span className="font-medium">450 / 500</span>
                    </div>
                    <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-progress-fill" style={{ width: mounted ? '90%' : '0%' }}></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                    <div className="flex gap-2">
                      <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors tooltip" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors" title="Scan">
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-400">Revenue</div>
                      <div className="font-semibold text-emerald-400">$42,500</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Card 2 */}
              <div className="glass-card glass-card-hover min-w-[340px] flex-shrink-0 snap-start overflow-hidden flex flex-col">
                <div className="h-32 w-full relative" style={{ background: 'linear-gradient(135deg, #00DFD8 0%, #007CF0 100%)' }}>
                  <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold border border-white/10 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                    Published
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-syne text-xl font-bold mb-1 truncate">Byron Bay Music Festival</h3>
                  <div className="flex items-center gap-4 text-xs text-zinc-400 mb-4">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Jul 20-22, 2024</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> North Byron Parklands</span>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-zinc-400">Tickets Sold</span>
                      <span className="font-medium">850 / 1000</span>
                    </div>
                    <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-progress-fill" style={{ width: mounted ? '85%' : '0%' }}></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                    <div className="flex gap-2">
                      <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors tooltip" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors" title="Scan">
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-400">Revenue</div>
                      <div className="font-semibold text-emerald-400">$75,000</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Card 3 */}
              <div className="glass-card glass-card-hover min-w-[340px] flex-shrink-0 snap-start overflow-hidden flex flex-col">
                <div className="h-32 w-full relative" style={{ background: 'linear-gradient(135deg, #F5A623 0%, #FF4B2B 100%)' }}>
                  <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold border border-white/10 flex items-center gap-1.5 text-zinc-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-400"></div>
                    Draft
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-syne text-xl font-bold mb-1 truncate">Melbourne Comedy Gala</h3>
                  <div className="flex items-center gap-4 text-xs text-zinc-400 mb-4">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Aug 05, 2024</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Palais Theatre, VIC</span>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-zinc-400">Tickets Sold</span>
                      <span className="font-medium">0 / 250</span>
                    </div>
                    <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-zinc-600 rounded-full" style={{ width: '0%' }}></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                    <div className="flex gap-2">
                      <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors tooltip" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-500 cursor-not-allowed" title="Scan">
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-400">Revenue</div>
                      <div className="font-semibold text-zinc-500">$0</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 flex-shrink-0 flex flex-col gap-6 animate-fade-in-up delay-200">
            
            {/* Create Event CTA */}
            <div className="glass-card p-6 relative overflow-hidden group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="font-syne font-bold text-lg mb-1">Create New Event</h3>
                <p className="text-sm text-zinc-400">Setup your next big experience in minutes.</p>
              </div>
            </div>

            {/* Timeline Strip */}
            <div className="glass-card p-5">
              <h3 className="font-syne font-bold mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Next 7 Days
              </h3>
              <div className="flex justify-between items-center relative before:absolute before:top-1/2 before:-translate-y-1/2 before:left-0 before:right-0 before:h-[1px] before:bg-white/10 before:-z-10">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 bg-[#0a0a0f] px-1">
                    <span className="text-xs text-zinc-500 font-medium">{day}</span>
                    <div className={\`w-3 h-3 rounded-full border-2 \${i === 2 || i === 5 ? 'border-indigo-400 bg-indigo-900/50 shadow-[0_0_8px_rgba(129,140,248,0.5)]' : 'border-zinc-700 bg-zinc-800'}\`}></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Feed */}
            <div className="glass-card p-5 flex-1 flex flex-col">
              <h3 className="font-syne font-bold mb-4">Recent Activity</h3>
              <div className="flex flex-col gap-4">
                
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">New ticket order #4928</p>
                    <p className="text-xs text-zinc-400">Vivid Sydney After Party • 2 mins ago</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Event published</p>
                    <p className="text-xs text-zinc-400">Byron Bay Music Festival • 1 hr ago</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">1k page views reached</p>
                    <p className="text-xs text-zinc-400">Vivid Sydney After Party • 3 hrs ago</p>
                  </div>
                </div>

              </div>
              <button className="mt-auto w-full py-2 text-sm text-zinc-400 hover:text-white transition-colors border border-white/5 rounded-lg hover:bg-white/5">
                View all activity
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
