import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  AppState, TimerMode, TimerStatus, Category, Session, TimerState, Settings, CategoryData, Task, SessionLogEntry, CompletedTaskRecord 
} from './types';
import { 
  DEFAULT_APP_STATE, LOCAL_STORAGE_KEY 
} from './constants';
import { 
  formatTime, generateId, playNotification, formatDurationFull, getDailyStats, splitSessionByMidnight 
} from './utils';
import Sidebar from './components/Sidebar';
import CircularProgress from './components/CircularProgress';
import Analytics from './components/Analytics';
import SettingsModal from './components/SettingsModal';
import CalendarHistory from './components/CalendarHistory';
import SessionCompleteModal from './components/SessionCompleteModal';
import { isSameDay, subDays, differenceInCalendarDays, format, startOfDay } from 'date-fns';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return DEFAULT_APP_STATE;
    const parsed = JSON.parse(saved);
    if (!parsed.categoryData) return DEFAULT_APP_STATE;
    
    // Migration checks
    Object.keys(parsed.categoryData).forEach(id => {
      if (parsed.categoryData[id].currentNotes === undefined) parsed.categoryData[id].currentNotes = '';
      if (parsed.categoryData[id].tasks === undefined) parsed.categoryData[id].tasks = [];
      if (parsed.categoryData[id].timerState.intervals === undefined) {
        parsed.categoryData[id].timerState.intervals = [];
      }
      if (parsed.categoryData[id].timerState.sessionStartTime === undefined) {
        parsed.categoryData[id].timerState.sessionStartTime = null;
      }
      if (parsed.categoryData[id].timerState.completedTasks === undefined) {
        parsed.categoryData[id].timerState.completedTasks = [];
      }
      if (parsed.categoryData[id].dailyLogs === undefined) {
        parsed.categoryData[id].dailyLogs = [];
      }
    });
    if (!parsed.allTags) parsed.allTags = DEFAULT_APP_STATE.allTags;
    if (parsed.analyticsTagFilter === undefined) parsed.analyticsTagFilter = [];
    if (!parsed.distractionPresets) parsed.distractionPresets = DEFAULT_APP_STATE.distractionPresets;
    if (!parsed.settings.theme) parsed.settings.theme = DEFAULT_APP_STATE.settings.theme;

    return parsed;
  });

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedLogSession, setSelectedLogSession] = useState<Session | null>(null);
  const [pendingSession, setPendingSession] = useState<{ 
    catId: string; 
    start: number; 
    end: number; 
    duration: number; 
    totalElapsed: number;
    sessionStartTime: number;
    mode: TimerMode;
    segmentCount: number;
  } | null>(null);
  const [countdownMinutes, setCountdownMinutes] = useState(25);
  const [customBreakMinutes, setCustomBreakMinutes] = useState(5);
  const [newTaskText, setNewTaskText] = useState('');
  
  const timerIntervalRef = useRef<number | null>(null);

  // Persistence effect
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState));
  }, [appState]);

  // Theme management effect
  useEffect(() => {
    if (appState.settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [appState.settings.theme]);

  // Active Category Shortcuts
  const selectedId = appState.selectedCategoryId;
  const activeCategory = useMemo(() => 
    appState.categories.find(c => c.id === selectedId) || appState.categories[0],
    [appState.categories, selectedId]
  );
  
  const activeData = useMemo(() => appState.categoryData[selectedId] || {
    timerState: { ...DEFAULT_APP_STATE.categoryData['default-1'].timerState },
    sessions: [],
    dailyLogs: [],
    currentNotes: '',
    tasks: []
  }, [appState.categoryData, selectedId]);

  const activeTimer = activeData.timerState;
  
  // New Today's Sessions Source of Truth
  const todaySessions = useMemo(() => {
    return (activeData.sessions || [])
      .filter(s => isSameDay(new Date(s.endTime), new Date()))
      .sort((a, b) => b.endTime - a.endTime);
  }, [activeData.sessions]);

  // Global Session Aggregation
  const allSessions = useMemo<Session[]>(() => 
    (Object.values(appState.categoryData) as CategoryData[]).flatMap(d => d.sessions),
    [appState.categoryData]
  );

  // Streak Calculation
  const streaks = useMemo(() => {
    const dates = allSessions.map(s => startOfDay(new Date(s.startTime)).getTime());
    const sortedUniqueDates: number[] = Array.from(new Set<number>(dates)).sort((a: number, b: number) => b - a);
    
    if (sortedUniqueDates.length === 0) return { current: 0, longest: appState.stats.longestStreak || 0 };

    const yesterday = startOfDay(subDays(new Date(), 1)).getTime();

    if (sortedUniqueDates[0] < yesterday) {
      return { current: 0, longest: appState.stats.longestStreak || 0 };
    }

    let current = 1;
    for (let i = 0; i < sortedUniqueDates.length - 1; i++) {
      const currentDay = new Date(sortedUniqueDates[i]);
      const nextDay = new Date(sortedUniqueDates[i + 1]);
      if (differenceInCalendarDays(currentDay, nextDay) === 1) {
        current++;
      } else {
        break;
      }
    }

    return {
      current,
      longest: Math.max(current, appState.stats.longestStreak || 0)
    };
  }, [allSessions, appState.stats.longestStreak]);

  useEffect(() => {
    if (streaks.longest > (appState.stats.longestStreak || 0)) {
      setAppState(prev => ({
        ...prev,
        stats: { ...prev.stats, longestStreak: streaks.longest }
      }));
    }
  }, [streaks.longest, appState.stats.longestStreak]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        toggleTimer();
      } else if (e.key === 'b' || e.key === 'B') {
        if (activeTimer.status === TimerStatus.RUNNING && activeTimer.mode === TimerMode.FLOW) {
          toggleTimer();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        resetTimer();
      } else if (/^[1-9]$/.test(e.key)) {
        const index = parseInt(e.key) - 1;
        if (appState.categories[index]) {
          setAppState(prev => ({ ...prev, selectedCategoryId: appState.categories[index].id }));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, activeTimer, appState.categories]);

  // Timer Tick Logic
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setCurrentTime(now);

      const nextCategoryData = { ...appState.categoryData };

      Object.keys(nextCategoryData).forEach(catId => {
        const { timerState } = nextCategoryData[catId];
        
        if (timerState.status === TimerStatus.RUNNING) {
          if (timerState.mode === TimerMode.COUNTDOWN && timerState.targetTime) {
            const elapsed = timerState.accumulatedTime + (now - (timerState.startTime || now));
            if (elapsed >= timerState.targetTime) {
              handleCompleteForCategory(catId, now);
            }
          }
        } else if (timerState.status === TimerStatus.BREAK && timerState.breakRemaining !== null) {
          const elapsedSinceStart = now - (timerState.startTime || now);
          const remaining = timerState.breakRemaining - elapsedSinceStart;
          if (remaining <= 0) {
            handleBreakEndForCategory(catId);
          }
        }
      });
    };

    const handleCompleteForCategory = (catId: string, now: number) => {
      playNotification();
      handleEndSessionForCategory(catId, now);
    };

    const handleBreakEndForCategory = (catId: string) => {
      playNotification();
      setAppState(prev => ({
        ...prev,
        categoryData: {
          ...prev.categoryData,
          [catId]: {
            ...prev.categoryData[catId],
            timerState: { ...prev.categoryData[catId].timerState, status: TimerStatus.IDLE, startTime: null, breakRemaining: null }
          }
        }
      }));
    };

    const handleEndSessionForCategory = (catId: string, now: number) => {
      setAppState(prev => {
        const data = prev.categoryData[catId];
        const { timerState } = data;
        const workInCurrentInterval = timerState.status === TimerStatus.RUNNING 
          ? now - (timerState.startTime || now)
          : 0;
        
        const intervals = timerState.intervals || [];
        const totalFocused = intervals.reduce((a, b) => a + b, 0) + workInCurrentInterval + timerState.accumulatedTime;
        const segmentCount = intervals.length + ((workInCurrentInterval + timerState.accumulatedTime) > 0 ? 1 : 0);
        
        const finalSessionStartTime = timerState.sessionStartTime || timerState.startTime || now;
        const totalElapsed = now - finalSessionStartTime;

        if (totalFocused > 1000) {
          setPendingSession({ 
            catId, 
            start: finalSessionStartTime, 
            end: now, 
            duration: totalFocused, 
            totalElapsed,
            sessionStartTime: finalSessionStartTime,
            mode: timerState.mode,
            segmentCount: Math.max(1, segmentCount)
          });
        }

        return {
          ...prev,
          categoryData: {
            ...prev.categoryData,
            [catId]: {
              ...data,
              timerState: {
                ...timerState,
                status: TimerStatus.IDLE,
                startTime: null,
                sessionStartTime: null,
                accumulatedTime: 0,
                targetTime: null,
                breakRemaining: null,
                intervals: [],
                completedTasks: []
              }
            }
          }
        };
      });
    };

    const hasAnyActive = (Object.values(appState.categoryData) as CategoryData[]).some(d => 
      d.timerState.status === TimerStatus.RUNNING || d.timerState.status === TimerStatus.BREAK
    );

    if (hasAnyActive) {
      timerIntervalRef.current = window.setInterval(tick, 100);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [appState.categoryData]);

  const getElapsed = useCallback(() => {
    if (activeTimer.status === TimerStatus.RUNNING && activeTimer.startTime) {
      const delta = Math.max(0, currentTime - activeTimer.startTime);
      return activeTimer.accumulatedTime + delta;
    }
    if (activeTimer.status === TimerStatus.BREAK && activeTimer.startTime) {
      const elapsedSinceBreakStart = Math.max(0, currentTime - activeTimer.startTime);
      return Math.max(0, (activeTimer.breakRemaining || 0) - elapsedSinceBreakStart);
    }
    return activeTimer.accumulatedTime;
  }, [activeTimer, currentTime]);

  const toggleTimer = () => {
    const now = Date.now();
    setCurrentTime(now);
    setAppState(prev => {
      const data = prev.categoryData[selectedId];
      const { timerState } = data;
      const intervals = timerState.intervals || [];
      
      let nextState: TimerState;

      if (timerState.status === TimerStatus.RUNNING) {
        const interval = now - (timerState.startTime || now);
        if (timerState.mode === TimerMode.FLOW) {
          // Flowmodoro: RUNNING -> BREAK
          nextState = {
            ...timerState,
            status: TimerStatus.BREAK,
            startTime: now,
            accumulatedTime: 0,
            intervals: [...intervals, interval],
            breakRemaining: interval / prev.settings.flowDivisor
          };
        } else {
          // Countdown: RUNNING -> PAUSED
          nextState = {
            ...timerState,
            status: TimerStatus.PAUSED,
            startTime: null,
            accumulatedTime: timerState.accumulatedTime + interval
          };
        }
      } else if (timerState.status === TimerStatus.BREAK) {
        nextState = {
          ...timerState,
          status: TimerStatus.RUNNING,
          startTime: now,
          accumulatedTime: 0,
          breakRemaining: null
        };
      } else {
        nextState = {
          ...timerState,
          status: TimerStatus.RUNNING,
          startTime: now,
          sessionStartTime: timerState.sessionStartTime || now, // Set session start on first press
          accumulatedTime: timerState.mode === TimerMode.FLOW ? 0 : timerState.accumulatedTime,
          targetTime: timerState.mode === TimerMode.COUNTDOWN 
            ? (timerState.targetTime || countdownMinutes * 60 * 1000) 
            : null
        };
      }

      return {
        ...prev,
        categoryData: {
          ...prev.categoryData,
          [selectedId]: { ...data, timerState: nextState }
        }
      };
    });
  };

  const handleEndSession = () => {
    const now = Date.now();
    const { timerState } = activeData;
    const workInCurrentInterval = timerState.status === TimerStatus.RUNNING 
      ? now - (timerState.startTime || now)
      : 0;
    
    const intervals = timerState.intervals || [];
    const totalFocused = intervals.reduce((a, b) => a + b, 0) + workInCurrentInterval + timerState.accumulatedTime;
    const segmentCount = intervals.length + ((workInCurrentInterval + timerState.accumulatedTime) > 0 ? 1 : 0);
    
    const finalSessionStartTime = timerState.sessionStartTime || timerState.startTime || now;
    const totalElapsed = now - finalSessionStartTime;

    setAppState(prev => {
      const data = prev.categoryData[selectedId];
      
      if (totalFocused > 1000) {
        setPendingSession({ 
          catId: selectedId, 
          start: finalSessionStartTime, 
          end: now, 
          duration: totalFocused, 
          totalElapsed,
          sessionStartTime: finalSessionStartTime,
          mode: timerState.mode,
          segmentCount: Math.max(1, segmentCount)
        });
      }

      return {
        ...prev,
        categoryData: {
          ...prev.categoryData,
          [selectedId]: {
            ...data,
            timerState: {
              ...timerState,
              status: TimerStatus.IDLE,
              startTime: null,
              sessionStartTime: null,
              accumulatedTime: 0,
              targetTime: null,
              breakRemaining: null,
              intervals: [],
              completedTasks: []
            }
          }
        }
      };
    });
  };

  const resetTimer = () => {
    setAppState(prev => ({
      ...prev,
      categoryData: {
        ...prev.categoryData,
        [selectedId]: {
          ...prev.categoryData[selectedId],
          timerState: { 
            ...prev.categoryData[selectedId].timerState, 
            status: TimerStatus.IDLE, 
            startTime: null, 
            sessionStartTime: null,
            accumulatedTime: 0, 
            breakRemaining: null, 
            targetTime: null,
            intervals: [],
            completedTasks: []
          }
        }
      }
    }));
  };

  const handleSaveSessionData = (meta: { rating: number; tags: string[]; distractions: string[]; distractionNote: string }) => {
    if (!pendingSession) return;
    const { catId, start, end, duration, totalElapsed, sessionStartTime, mode } = pendingSession;
    const { settings } = appState;
    const currentNotes = appState.categoryData[catId].currentNotes;
    const completedTasks = appState.categoryData[catId].timerState.completedTasks || [];
    
    const isFlagged = duration > (settings.idleThresholdMinutes * 60 * 1000);
    const newSessionBase: Session = {
      id: generateId(),
      categoryId: catId,
      startTime: start,
      endTime: end,
      duration,
      totalElapsed,
      sessionStartTime,
      notes: currentNotes.trim(),
      mode,
      isFlagged,
      completedTasks,
      ...meta
    };

    const sessions = splitSessionByMidnight(newSessionBase);

    setAppState(prev => {
      const nextData = { ...prev.categoryData };
      nextData[catId].sessions = [...sessions, ...(nextData[catId].sessions || [])];
      nextData[catId].currentNotes = '';
      return { ...prev, categoryData: nextData };
    });

    setPendingSession(null);
  };

  const skipBreak = () => {
    setAppState(prev => ({
      ...prev,
      categoryData: {
        ...prev.categoryData,
        [selectedId]: {
          ...prev.categoryData[selectedId],
          timerState: { ...prev.categoryData[selectedId].timerState, status: TimerStatus.IDLE, startTime: null, breakRemaining: null }
        }
      }
    }));
  };

  const extendBreak = (ms: number) => {
    setAppState(prev => ({
      ...prev,
      categoryData: {
        ...prev.categoryData,
        [selectedId]: {
          ...prev.categoryData[selectedId],
          timerState: { ...prev.categoryData[selectedId].timerState, breakRemaining: (prev.categoryData[selectedId].timerState.breakRemaining || 0) + ms }
        }
      }
    }));
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const newTask: Task = { id: generateId(), text: newTaskText.trim(), isCompleted: false };
    setAppState(prev => ({
      ...prev,
      categoryData: {
        ...prev.categoryData,
        [selectedId]: { ...prev.categoryData[selectedId], tasks: [...prev.categoryData[selectedId].tasks, newTask] }
      }
    }));
    setNewTaskText('');
  };

  const toggleTask = (taskId: string) => {
    setAppState(prev => {
      const data = prev.categoryData[selectedId];
      const taskIndex = data.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return prev;
      
      const task = data.tasks[taskIndex];
      const isBecomingCompleted = !task.isCompleted;
      
      let nextTimerState = { ...data.timerState };
      
      // If task is being checked off and the session is active, record it
      if (isBecomingCompleted && data.timerState.status !== TimerStatus.IDLE) {
        const record: CompletedTaskRecord = {
          title: task.text,
          note: task.notes,
          completedAt: Date.now()
        };
        nextTimerState.completedTasks = [...(nextTimerState.completedTasks || []), record];
      }
      
      const nextTasks = data.tasks.map((t, i) => i === taskIndex ? { ...t, isCompleted: isBecomingCompleted } : t);
      
      return {
        ...prev,
        categoryData: {
          ...prev.categoryData,
          [selectedId]: { ...data, tasks: nextTasks, timerState: nextTimerState }
        }
      };
    });
  };

  const deleteTask = (taskId: string) => {
    setAppState(prev => ({
      ...prev,
      categoryData: {
        ...prev.categoryData,
        [selectedId]: {
          ...prev.categoryData[selectedId],
          tasks: prev.categoryData[selectedId].tasks.filter(t => t.id !== taskId)
        }
      }
    }));
  };

  const updateSessionNote = (sessionId: string, note: string) => {
    setAppState(prev => {
      const nextCategoryData = { ...prev.categoryData };
      Object.keys(nextCategoryData).forEach(catId => {
        nextCategoryData[catId].sessions = nextCategoryData[catId].sessions.map(s => s.id === sessionId ? { ...s, notes: note } : s);
      });
      return { ...prev, categoryData: nextCategoryData };
    });
  };

  const handleUpdateCurrentNote = (val: string) => {
    setAppState(prev => ({
      ...prev,
      categoryData: { ...prev.categoryData, [selectedId]: { ...prev.categoryData[selectedId], currentNotes: val } }
    }));
  };

  const handleUpdateAllTags = (tags: string[]) => {
    setAppState(prev => ({ ...prev, allTags: tags }));
  };

  const handleUpdateDistractionPresets = (presets: string[]) => {
    setAppState(prev => ({ ...prev, distractionPresets: presets }));
  };

  const handleUpdateTagFilter = (tags: string[]) => {
    setAppState(prev => ({ ...prev, analyticsTagFilter: tags }));
  };

  const displayMs = useMemo(() => {
    const elapsed = getElapsed();
    if (activeTimer.mode === TimerMode.COUNTDOWN) {
      if (activeTimer.status === TimerStatus.BREAK) return elapsed;
      const target = activeTimer.targetTime || (countdownMinutes * 60 * 1000);
      if (activeTimer.status === TimerStatus.IDLE) return countdownMinutes * 60 * 1000;
      return Math.max(0, target - elapsed);
    }
    return elapsed;
  }, [getElapsed, activeTimer.mode, activeTimer.status, activeTimer.targetTime, countdownMinutes]);

  const isCountingDown = activeTimer.mode === TimerMode.COUNTDOWN || activeTimer.status === TimerStatus.BREAK;
  const roundedDisplayMs = isCountingDown ? Math.ceil(displayMs / 1000) * 1000 : displayMs;

  const totalFocusedToday = useMemo(() => todaySessions.reduce((acc, s) => acc + s.duration, 0), [todaySessions]);
  const firstSession = useMemo(() => todaySessions.length > 0 ? todaySessions[todaySessions.length - 1] : null, [todaySessions]);
  const lastSession = useMemo(() => todaySessions[0], [todaySessions]);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden text-gray-800 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      <Sidebar 
        categories={appState.categories}
        selectedCategoryId={selectedId}
        onSelectCategory={(id) => setAppState(prev => ({ ...prev, selectedCategoryId: id }))}
        onAddCategory={(cat) => setAppState(prev => ({ 
          ...prev, 
          categories: [...prev.categories, cat],
          categoryData: { ...prev.categoryData, [cat.id]: { timerState: { mode: TimerMode.FLOW, status: TimerStatus.IDLE, startTime: null, sessionStartTime: null, accumulatedTime: 0, targetTime: null, breakRemaining: null, intervals: [], completedTasks: [] }, sessions: [], dailyLogs: [], currentNotes: '', tasks: [] } }
        }))}
        onDeleteCategory={(id) => setAppState(prev => {
          const { [id]: _, ...restData } = prev.categoryData;
          return { ...prev, categories: prev.categories.filter(c => c.id !== id), categoryData: restData, selectedCategoryId: prev.selectedCategoryId === id ? prev.categories[0].id : prev.selectedCategoryId };
        })}
        onRenameCategory={(id, name, color) => setAppState(prev => ({ 
          ...prev, categories: prev.categories.map(c => c.id === id ? { ...c, name, color: color || c.color } : c) 
        }))}
        onOpenSettings={() => setShowSettings(true)}
        onOpenCalendar={() => setShowCalendar(true)}
        streak={streaks.current}
        longestStreak={streaks.longest}
        showStreaks={appState.settings.showStreaks}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col items-center relative transition-colors duration-300">
              
              <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl mb-12 w-fit relative z-10 transition-colors duration-300">
                <button 
                  onClick={() => setAppState(prev => ({ ...prev, categoryData: { ...prev.categoryData, [selectedId]: { ...prev.categoryData[selectedId], timerState: { ...prev.categoryData[selectedId].timerState, mode: TimerMode.FLOW }} } }))}
                  className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${activeTimer.mode === TimerMode.FLOW ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-400 dark:text-slate-50'}`}
                >
                  Flowmodoro
                </button>
                <button 
                  onClick={() => setAppState(prev => ({ ...prev, categoryData: { ...prev.categoryData, [selectedId]: { ...prev.categoryData[selectedId], timerState: { ...prev.categoryData[selectedId].timerState, mode: TimerMode.COUNTDOWN }} } }))}
                  className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${activeTimer.mode === TimerMode.COUNTDOWN ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-400 dark:text-slate-50'}`}
                >
                  Countdown
                </button>
              </div>

              <div className="relative mb-12 transform hover:scale-[1.02] transition-transform duration-500 z-10">
                <CircularProgress 
                  progress={
                    activeTimer.status === TimerStatus.BREAK ? (activeTimer.breakRemaining ? (currentTime - (activeTimer.startTime || currentTime)) / activeTimer.breakRemaining : 0) : activeTimer.mode === TimerMode.COUNTDOWN ? (1 - (getElapsed() / (activeTimer.targetTime || (countdownMinutes * 60 * 1000)))) : (getElapsed() % 3600000) / 3600000
                  }
                  color={activeTimer.status === TimerStatus.BREAK ? '#10b981' : activeCategory.color}
                  size={340}
                  strokeWidth={16}
                >
                  <div className="text-center">
                    <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">
                      {activeTimer.status === TimerStatus.BREAK ? 'Taking a Break' : `Focused on ${activeCategory.name}`}
                    </p>
                    <p className="text-7xl font-black tabular-nums tracking-tighter text-gray-900 dark:text-white">
                      {formatTime(roundedDisplayMs)}
                    </p>
                    {activeTimer.status === TimerStatus.IDLE && activeTimer.mode === TimerMode.COUNTDOWN && (
                      <div className="mt-4 flex items-center justify-center space-x-2">
                        <input 
                          type="number" 
                          value={countdownMinutes} 
                          onChange={(e) => setCountdownMinutes(Number(e.target.value))}
                          className="w-12 text-center bg-gray-50 dark:bg-slate-800 p-1 rounded text-lg border-b-2 border-transparent focus:border-blue-400 outline-none font-black dark:text-white transition-colors duration-300"
                        />
                        <span className="text-gray-400 font-black text-sm uppercase">min</span>
                      </div>
                    )}
                  </div>
                </CircularProgress>
              </div>

              <div className="flex flex-col items-center space-y-6 mb-12 z-10">
                <div className="flex items-center space-x-6">
                  {activeTimer.status === TimerStatus.BREAK ? (
                    <>
                      <button onClick={skipBreak} className="px-8 py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-black rounded-2xl hover:bg-gray-200 transition-all active:scale-95 text-xs uppercase">Skip</button>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => extendBreak(customBreakMinutes * 60 * 1000)} className="px-8 py-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-black rounded-2xl hover:bg-emerald-100 transition-all active:scale-95 text-xs uppercase">+{customBreakMinutes} Min</button>
                        <input 
                          type="number"
                          className="w-12 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-center text-xs font-bold dark:text-white outline-none"
                          value={customBreakMinutes}
                          onChange={(e) => setCustomBreakMinutes(Number(e.target.value))}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <button onClick={toggleTimer} className={`w-24 h-24 rounded-[2rem] flex items-center justify-center text-white shadow-2xl transition-all active:scale-90 ${activeTimer.status === TimerStatus.RUNNING ? 'bg-orange-500 shadow-orange-100' : 'bg-blue-600 shadow-blue-100'}`}>
                        {activeTimer.status === TimerStatus.RUNNING ? <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-12 h-12 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                      </button>
                    </>
                  )}
                </div>

                {(activeTimer.status !== TimerStatus.IDLE || activeTimer.accumulatedTime > 0 || (activeTimer.intervals && activeTimer.intervals.length > 0)) && (
                  <button 
                    onClick={handleEndSession} 
                    className="px-8 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-black text-sm uppercase hover:bg-red-100 transition-all active:scale-95 flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
                    <span>End Session</span>
                  </button>
                )}
              </div>

              <div className="w-full max-w-md z-10">
                <textarea placeholder="Briefly describe your task..." className="w-full p-5 bg-slate-50 dark:bg-slate-800 dark:text-white border border-gray-100 dark:border-slate-700 rounded-[1.5rem] text-sm font-medium resize-none focus:ring-4 focus:ring-blue-50 outline-none transition-all h-24" value={activeData.currentNotes} onChange={(e) => handleUpdateCurrentNote(e.target.value)} />
              </div>

              {/* Session Log Section */}
              <div className="w-full mt-12 border-t border-slate-100 dark:border-slate-800 pt-10">
                 <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Today's Session Log</h3>
                    <div className="flex gap-4 text-xs font-bold">
                        <div className="flex flex-col">
                            <span className="text-slate-400 uppercase text-[10px]">Total Sessions</span>
                            <span className="text-slate-800 dark:text-white">{todaySessions.length}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-slate-400 uppercase text-[10px]">Focused Today</span>
                            <span className="text-slate-800 dark:text-white">{formatDurationFull(totalFocusedToday)}</span>
                        </div>
                        {firstSession && (
                            <div className="flex flex-col">
                                <span className="text-slate-400 uppercase text-[10px]">Started</span>
                                <span className="text-slate-800 dark:text-white">{format(new Date(firstSession.startTime), 'h:mm a').toLowerCase()}</span>
                            </div>
                        )}
                        {lastSession && (
                            <div className="flex flex-col">
                                <span className="text-slate-400 uppercase text-[10px]">Last Ended</span>
                                <span className="text-slate-800 dark:text-white">{format(new Date(lastSession.endTime), 'h:mm a').toLowerCase()}</span>
                            </div>
                        )}
                    </div>
                 </div>

                 <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {todaySessions.length === 0 ? (
                        <div className="py-8 text-center text-slate-300 dark:text-slate-700 text-sm font-bold italic">
                            No logs for today yet. Use "End Session" to save a block.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {todaySessions.map((session, idx) => (
                                <button 
                                  key={session.id} 
                                  onClick={() => setSelectedLogSession(session)}
                                  className="w-full flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-400 transition-all group"
                                >
                                    <div className="flex items-center space-x-4">
                                        <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-black text-blue-600 dark:text-blue-400">
                                            {todaySessions.length - idx}
                                        </span>
                                        <div className="text-left">
                                            <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                                              {formatTime(session.duration)} Focus
                                              <span className="ml-2 text-[10px] font-normal text-slate-400 italic">({formatTime(session.totalElapsed || 0)} elapsed)</span>
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                                              Completed at {format(new Date(session.endTime), 'h:mm a').toLowerCase()}
                                            </p>
                                        </div>
                                    </div>
                                    <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                    )}
                 </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col h-full overflow-hidden transition-colors duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">To-Do List</h3>
                <span className="px-2.5 py-1 bg-gray-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase">{activeData.tasks.length > 0 ? activeData.tasks.filter(t => !t.isCompleted).length : 0} active</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2 custom-scrollbar">
                {!activeData.tasks || activeData.tasks.length === 0 ? <div className="h-48 flex flex-col items-center justify-center text-center opacity-30">📝<p className="text-xs font-bold text-gray-400">No tasks for {activeCategory.name} yet.</p></div> : activeData.tasks.map(task => (
                  <div key={task.id} className="group bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl flex items-start space-x-3 transition-all hover:bg-slate-100/50 dark:hover:bg-slate-800">
                    <button onClick={() => toggleTask(task.id)} className={`mt-1 w-5 h-5 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all ${task.isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700'}`}>{task.isCompleted && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}</button>
                    <div className="flex-1 min-w-0 font-bold text-sm text-gray-700 dark:text-slate-300 truncate">{task.text}</div>
                    <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                ))}
              </div>
              <div className="mt-auto">
                <div className="relative">
                  <input type="text" placeholder="Add a new task..." className="w-full pl-4 pr-12 py-3 bg-gray-50 dark:bg-slate-800 dark:text-white border border-gray-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} />
                  <button onClick={addTask} className="absolute right-2 top-2 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></button>
                </div>
              </div>
            </div>
          </div>

          <Analytics 
            sessions={allSessions} 
            categories={appState.categories} 
            selectedCategoryId={selectedId} 
            tagFilter={appState.analyticsTagFilter}
            onUpdateTagFilter={handleUpdateTagFilter}
            onUpdateSessionNote={updateSessionNote} 
          />
        </div>
      </main>

      {showSettings && <SettingsModal settings={appState.settings} onUpdate={(s) => setAppState(prev => ({ ...prev, settings: s }))} onClose={() => setShowSettings(false)} />}
      {showCalendar && <CalendarHistory sessions={allSessions} categories={appState.categories} onClose={() => setShowCalendar(false)} />}
      
      {selectedLogSession && (
        <SessionDetailModal 
          session={selectedLogSession} 
          categoryName={activeCategory.name}
          onClose={() => setSelectedLogSession(null)} 
        />
      )}

      {pendingSession && (
        <SessionCompleteModal 
          allTags={appState.allTags} 
          distractionPresets={appState.distractionPresets}
          onSave={handleSaveSessionData} 
          onUpdateAllTags={handleUpdateAllTags}
          onUpdateDistractionPresets={handleUpdateDistractionPresets}
          onCancel={() => handleSaveSessionData({ rating: 0, tags: [], distractions: [], distractionNote: '' })}
          totalDuration={pendingSession.duration}
          segmentCount={pendingSession.segmentCount}
        />
      )}
    </div>
  );
};

// Sub-component for session detail view
const SessionDetailModal: React.FC<{ session: Session; categoryName: string; onClose: () => void }> = ({ session, categoryName, onClose }) => {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 max-h-[90vh]">
        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">Session Details</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">{categoryName} • {format(new Date(session.startTime), 'MMM dd, yyyy')}</p>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Focused Time</p>
              <p className="text-xl font-black text-blue-600 dark:text-blue-400">{formatTime(session.duration)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Elapsed</p>
              <p className="text-xl font-black text-slate-700 dark:text-slate-200">{formatTime(session.totalElapsed || 0)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Started At</p>
              <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{format(new Date(session.startTime), 'h:mm a').toLowerCase()}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ended At</p>
              <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{format(new Date(session.endTime), 'h:mm a').toLowerCase()}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rating</p>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} className={`text-xl ${star <= (session.rating || 0) ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}>⭐</span>
                  ))}
                </div>
              </div>
              {session.mode && (
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mode</p>
                   <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-lg uppercase">{session.mode}</span>
                </div>
              )}
            </div>

            {session.completedTasks?.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tasks completed this session</p>
                <div className="space-y-2">
                  {session.completedTasks.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center space-x-3">
                        <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t.title}</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{format(new Date(t.completedAt), 'h:mm a').toLowerCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {session.tags?.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {session.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {session.distractions?.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Distractions</p>
                <div className="flex flex-wrap gap-2">
                  {session.distractions.map(d => (
                    <span key={d} className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg">{d}</span>
                  ))}
                </div>
                {session.distractionNote && (
                  <p className="mt-2 text-xs text-slate-500 italic">Note: {session.distractionNote}</p>
                )}
              </div>
            )}

            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Notes</p>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300 min-h-[60px]">
                {session.notes || <span className="text-slate-400 italic">No notes captured for this session.</span>}
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-[0.98] mt-4"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;