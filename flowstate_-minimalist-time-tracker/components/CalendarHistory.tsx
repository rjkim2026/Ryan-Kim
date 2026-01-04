import React, { useState, useMemo } from 'react';
import { Session, Category } from '../types';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameDay, addMonths, subMonths, isSameMonth
} from 'date-fns';
import { formatTime, formatDurationFull } from '../utils';

interface CalendarHistoryProps {
  sessions: Session[];
  categories: Category[];
  onClose: () => void;
}

const CalendarHistory: React.FC<CalendarHistoryProps> = ({ sessions, categories, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const sessionsOnSelectedDay = useMemo(() => {
    if (!selectedDay) return [];
    return sessions.filter(s => isSameDay(new Date(s.startTime), selectedDay))
      .sort((a, b) => b.startTime - a.startTime);
  }, [sessions, selectedDay]);

  const totalDurationOnDay = sessionsOnSelectedDay.reduce((acc, s) => acc + s.duration, 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-all duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-slate-800">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">History Explorer</h2>
            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all text-gray-600 dark:text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <span className="px-3 text-sm font-bold text-gray-700 dark:text-slate-200 min-w-[120px] text-center">{format(currentMonth, 'MMMM yyyy')}</span>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all text-gray-600 dark:text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Calendar Grid */}
          <div className="flex-1 p-6 border-r border-gray-100 dark:border-slate-800 overflow-y-auto custom-scrollbar">
             <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-inner">
               {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                 <div key={day} className="bg-gray-50 dark:bg-slate-900/50 p-2 text-center text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase">
                   {day}
                 </div>
               ))}
               {days.map(day => {
                 const daySessions = sessions.filter(s => isSameDay(new Date(s.startTime), day));
                 const isCurrentMonth = isSameMonth(day, monthStart);
                 const isSelected = selectedDay && isSameDay(day, selectedDay);
                 const dayTime = daySessions.reduce((acc, s) => acc + s.duration, 0);

                 return (
                   <button
                     key={day.toISOString()}
                     onClick={() => setSelectedDay(day)}
                     className={`h-24 p-2 relative transition-all group ${
                       isCurrentMonth ? 'bg-white dark:bg-slate-900' : 'bg-gray-50 dark:bg-slate-950 text-gray-300 dark:text-slate-700'
                     } ${isSelected ? 'ring-2 ring-blue-500 z-10 shadow-lg dark:shadow-none' : 'hover:bg-blue-50/30 dark:hover:bg-blue-900/10'}`}
                   >
                     <span className={`text-xs font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-slate-400'}`}>
                       {format(day, 'd')}
                     </span>
                     
                     <div className="mt-1 flex flex-wrap gap-0.5">
                        {daySessions.slice(0, 12).map(s => {
                          const cat = categories.find(c => c.id === s.categoryId);
                          return (
                            <div 
                              key={s.id} 
                              className="w-1.5 h-1.5 rounded-full" 
                              style={{ backgroundColor: cat?.color || '#cbd5e1' }}
                            />
                          );
                        })}
                        {daySessions.length > 12 && <span className="text-[8px] font-bold text-gray-400 dark:text-slate-600">+</span>}
                     </div>

                     {dayTime > 0 && (
                       <div className="absolute bottom-2 right-2">
                         <span className="text-[10px] font-black text-gray-400 dark:text-slate-600">{Math.round(dayTime / 3600000)}h</span>
                       </div>
                     )}
                   </button>
                 );
               })}
             </div>
          </div>

          {/* Day Detail */}
          <div className="w-full md:w-80 bg-gray-50 dark:bg-slate-950 flex flex-col overflow-hidden">
            <div className="p-6 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
              <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Selected Day</p>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">{selectedDay ? format(selectedDay, 'EEEE, MMM dd') : 'Select a day'}</h3>
              {totalDurationOnDay > 0 && (
                <div className="mt-2 text-sm font-bold text-blue-600 dark:text-blue-400">
                  Total: {formatDurationFull(totalDurationOnDay)}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {sessionsOnSelectedDay.length > 0 ? (
                sessionsOnSelectedDay.map(s => {
                  const cat = categories.find(c => c.id === s.categoryId);
                  return (
                    <div key={s.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat?.color || '#ccc' }} />
                        <span className="text-xs font-bold text-gray-800 dark:text-slate-200">{cat?.name || 'Deleted'}</span>
                      </div>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
                            {format(new Date(s.startTime), 'h:mm a').toLowerCase()} - {format(new Date(s.endTime), 'h:mm a').toLowerCase()}
                        </span>
                        <span className="text-sm font-black text-gray-900 dark:text-white">{formatTime(s.duration)}</span>
                      </div>
                      {s.notes && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 italic mt-2 border-t border-gray-50 dark:border-slate-800 pt-2 leading-relaxed">
                          "{s.notes}"
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                  <span className="text-4xl mb-4">🌙</span>
                  <p className="text-sm font-bold text-gray-400 dark:text-slate-500">Rest day. No sessions logged.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarHistory;