
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, isSameDay, startOfDay, endOfDay } from 'date-fns';

export const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const h = hours > 0 ? `${hours}:` : '';
  const m = `${minutes < 10 && hours > 0 ? '0' : ''}${minutes}:`;
  const s = seconds < 10 ? `0${seconds}` : `${seconds}`;

  return `${h}${m}${s}`;
};

export const formatDurationFull = (ms: number): string => {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const getDailyStats = (sessions: any[], day: Date) => {
  return sessions
    .filter(s => isSameDay(new Date(s.startTime), day))
    .reduce((acc, s) => acc + s.duration, 0);
};

export const calculateMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[half];
  return (sorted[half - 1] + sorted[half]) / 2.0;
};

export const playNotification = () => {
  const audio = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_7314757c2c.mp3');
  audio.play().catch(e => console.log('Audio play failed', e));
};

/**
 * Splits a session if it crosses midnight.
 */
export const splitSessionByMidnight = (session: any): any[] => {
  const start = new Date(session.startTime);
  const end = new Date(session.endTime);
  
  if (isSameDay(start, end)) return [session];

  const sessions = [];
  let currentStart = start;

  while (!isSameDay(currentStart, end)) {
    const currentEnd = endOfDay(currentStart);
    sessions.push({
      ...session,
      id: generateId(),
      startTime: currentStart.getTime(),
      endTime: currentEnd.getTime(),
      duration: currentEnd.getTime() - currentStart.getTime(),
    });
    currentStart = startOfDay(new Date(currentStart.getTime() + 86400000));
  }

  sessions.push({
    ...session,
    id: generateId(),
    startTime: currentStart.getTime(),
    endTime: end.getTime(),
    duration: end.getTime() - currentStart.getTime(),
  });

  return sessions;
};

export const exportToJSON = (data: any) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flowstate_export_${format(new Date(), 'yyyyMMdd')}.json`;
  a.click();
};

export const exportToCSV = (sessions: any[], categories: any[]) => {
  const headers = ['ID', 'Category', 'StartTime', 'EndTime', 'Duration(ms)', 'Rating', 'Tags', 'Distractions', 'Notes'];
  const rows = sessions.map(s => {
    const cat = categories.find(c => c.id === s.categoryId)?.name || 'Unknown';
    return [
      s.id,
      cat,
      format(new Date(s.startTime), 'yyyy-MM-dd HH:mm:ss'),
      format(new Date(s.endTime), 'yyyy-MM-dd HH:mm:ss'),
      s.duration,
      s.rating || '',
      (s.tags || []).join(';'),
      (s.distractions || []).join(';'),
      (s.notes || '').replace(/"/g, '""')
    ];
  });

  const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flowstate_export_${format(new Date(), 'yyyyMMdd')}.csv`;
  a.click();
};
