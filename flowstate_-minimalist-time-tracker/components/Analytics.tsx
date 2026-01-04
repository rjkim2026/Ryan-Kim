import React, { useMemo, useState } from 'react';
import { Session, Category } from '../types';
import { formatDurationFull, calculateMedian, formatTime, exportToJSON, exportToCSV } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell
} from 'recharts';
import { 
  startOfDay, endOfDay, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameDay
} from 'date-fns';

interface AnalyticsProps {
  sessions: Session[];
  categories: Category[];
  selectedCategoryId: string;
  tagFilter: string[];
  onUpdateTagFilter: (tags: string[]) => void;
  onUpdateSessionNote: (sessionId: string, note: string) => void;
}

const Analytics: React.FC<AnalyticsProps> = ({ 
  sessions, 
  categories, 
  selectedCategoryId, 
  tagFilter,
  onUpdateTagFilter,
  onUpdateSessionNote 
}) => {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');

  // Collect all unique tags from ALL sessions to populate the filter list
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    sessions.forEach(s => s.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [sessions]);

  const toggleFilterTag = (tag: string) => {
    if (tagFilter.includes(tag)) {
      onUpdateTagFilter(tagFilter.filter(t => t !== tag));
    } else {
      onUpdateTagFilter([...tagFilter, tag]);
    }
  };

  const clearTagFilter = () => onUpdateTagFilter([]);

  const filteredSessions = useMemo(() => {
    const categorySessions = sessions.filter(s => s.categoryId === selectedCategoryId);
    // OR logic: session matches any of the selected tags. Empty filter = all sessions.
    if (tagFilter.length === 0) return categorySessions;
    return categorySessions.filter(s => s.tags?.some(t => tagFilter.includes(t)));
  }, [sessions, selectedCategoryId, tagFilter]);

  const heatmapData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      total: 0
    }));

    filteredSessions.forEach(s => {
      const hour = new Date(s.startTime).getHours();
      hours[hour].total += s.duration;
    });

    const max = Math.max(...hours.map(h => h.total), 1);
    return hours.map(h => ({ ...h, intensity: h.total / max }));
  }, [filteredSessions]);

  const stats = useMemo(() => {
    if (filteredSessions.length === 0) return null;

    const totalTime = filteredSessions.reduce((acc, s) => acc + s.duration, 0);
    const durations = filteredSessions.map(s => s.duration);
    const longestSession = Math.max(...durations);
    const avgSession = totalTime / filteredSessions.length;
    const medianSession = calculateMedian(durations);

    const dayMap: Record<string, number> = {};
    filteredSessions.forEach(s => {
      const d = format(new Date(s.startTime), 'yyyy-MM-dd');
      dayMap[d] = (dayMap[d] || 0) + s.duration;
    });
    
    let maxDay = "";
    let maxTime = 0;
    Object.entries(dayMap).forEach(([day, time]) => {
      if (time > maxTime) {
        maxTime = time;
        maxDay = day;
      }
    });

    return {
      totalTime,
      longestSession,
      avgSession,
      medianSession,
      maxDay: maxDay ? format(new Date(maxDay), 'MMM dd, yyyy') : 'N/A',
      maxDayTime: maxTime
    };
  }, [filteredSessions]);

  const distributionData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: 0
    }));

    filteredSessions.forEach(s => {
      const startHour = new Date(s.startTime).getHours();
      hours[startHour].count += 1;
    });

    return hours.map(h => {
        const dummyDate = new Date();
        dummyDate.setHours(h.hour, 0, 0, 0);
        return {
            hour: format(dummyDate, 'h a').toLowerCase(),
            count: h.count
        }
    });
  }, [filteredSessions]);

  const weeklyData = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const daySessions = filteredSessions.filter(s => isSameDay(new Date(s.startTime), day));
      const hours = daySessions.reduce((acc, s) => acc + s.duration, 0) / (1000 * 3600);
      return {
        name: format(day, 'EEE'),
        hours: Number(hours.toFixed(2))
      };
    });
  }, [filteredSessions]);

  const activeColor = categories.find(c => c.id === selectedCategoryId)?.color || '#3b82f6';

  return (
    <div className="space-y-8">
      {/* Tag Filtering Controls */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Filter by Tag</h3>
           {tagFilter.length > 0 && (
             <button 
               onClick={clearTagFilter}
               className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline"
             >
               Clear Filters
             </button>
           )}
        </div>
        <div className="flex flex-wrap gap-2">
          {availableTags.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No tags available yet. Complete sessions with tags to see them here.</p>
          ) : (
            availableTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleFilterTag(tag)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                  tagFilter.includes(tag)
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                    : 'border-slate-100 dark:border-slate-700 text-slate-500 hover:border-blue-200'
                }`}
              >
                {tag}
              </button>
            ))
          )}
        </div>
      </div>

      {!stats ? (
        <div className="p-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
          <span className="text-4xl mb-4 block">📉</span>
          <p className="text-gray-500 font-bold">No sessions match the current filters.</p>
          <p className="text-xs text-slate-400 mt-2">Try selecting different tags or category.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Focus" value={formatDurationFull(stats.totalTime)} icon="⏱️" />
            <StatCard title="Median Duration" value={formatDurationFull(stats.medianSession)} icon="📏" />
            <StatCard title="Avg. Session" value={formatDurationFull(stats.avgSession)} icon="📊" />
            <StatCard title="Longest Focus" value={formatDurationFull(stats.longestSession)} icon="🔥" />
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="text-sm font-bold mb-4 text-gray-400 uppercase tracking-widest">Activity Heatmap (By Hour)</h3>
            <div className="grid grid-cols-12 md:grid-cols-24 gap-1">
              {heatmapData.map(h => {
                const dummyDate = new Date();
                dummyDate.setHours(h.hour, 0, 0, 0);
                const label = format(dummyDate, 'h a').toLowerCase();
                return (
                    <div 
                    key={h.hour} 
                    className="h-10 rounded-sm group relative"
                    style={{ 
                        backgroundColor: h.intensity > 0 ? activeColor : 'transparent',
                        opacity: h.intensity > 0 ? Math.max(0.1, h.intensity) : 0.05,
                        border: h.intensity === 0 ? '1px solid currentColor' : 'none'
                    }}
                    >
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] p-2 rounded whitespace-nowrap z-10">
                        {label} - {formatDurationFull(h.total)}
                    </div>
                    </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
              <h3 className="text-sm font-bold mb-6 text-gray-400 uppercase tracking-widest">Weekly Activity (Hours)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="hours" fill={activeColor} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
              <h3 className="text-sm font-bold mb-6 text-gray-400 uppercase tracking-widest">Focus Start Distribution</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 8}} dy={10} interval={2} />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="count" fill={activeColor} radius={[2, 2, 0, 0]} opacity={0.6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Export Section */}
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => exportToJSON({ sessions, categories })}
              className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center space-x-2"
            >
              <span>💾</span>
              <span>Export JSON</span>
            </button>
            <button 
              onClick={() => exportToCSV(sessions, categories)}
              className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center space-x-2"
            >
              <span>📄</span>
              <span>Export CSV</span>
            </button>
          </div>

          {/* History List */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Recent Sessions</h3>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-slate-700 max-h-96 overflow-y-auto">
              {filteredSessions.slice(0, 20).map(session => (
                <div key={session.id} className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${session.isFlagged ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-gray-800 dark:text-slate-200">{format(new Date(session.startTime), 'MMM dd, h:mm a').toLowerCase()}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${session.mode === 'FLOW' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {session.mode}
                      </span>
                      {session.isFlagged && <span className="text-amber-600 text-[10px] font-bold">⚠️ Flagged</span>}
                      {session.rating && <span className="text-amber-400 text-[10px] font-bold">⭐ {session.rating}</span>}
                    </div>
                    <span className="text-xs font-black text-gray-900 dark:text-white">{formatTime(session.duration)}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(session.tags || []).map(tag => (
                      <span key={tag} className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md">{tag}</span>
                    ))}
                  </div>

                  {editingSessionId === session.id ? (
                    <div className="mt-2 flex space-x-2">
                      <input 
                        autoFocus
                        className="flex-1 px-3 py-1 text-xs border border-gray-200 dark:border-slate-700 bg-transparent rounded-lg outline-none focus:ring-1 focus:ring-blue-400"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onUpdateSessionNote(session.id, editNote);
                            setEditingSessionId(null);
                          }
                        }}
                      />
                      <button onClick={() => {
                        onUpdateSessionNote(session.id, editNote);
                        setEditingSessionId(null);
                      }} className="text-xs font-bold text-blue-600">Save</button>
                    </div>
                  ) : (
                    <p 
                      onClick={() => {
                        setEditingSessionId(session.id);
                        setEditNote(session.notes);
                      }}
                      className={`text-xs mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 rounded p-1 transition-all ${session.notes ? 'text-gray-600 dark:text-slate-400 italic' : 'text-gray-300 dark:text-slate-600'}`}
                    >
                      {session.notes || "Add a note..."}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon }: { title: string, value: string, icon: string }) => (
  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-start space-x-4">
    <div className="text-2xl">{icon}</div>
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</p>
      <p className="text-lg font-black text-gray-800 dark:text-white">{value}</p>
    </div>
  </div>
);

export default Analytics;