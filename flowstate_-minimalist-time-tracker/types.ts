export enum TimerMode {
  FLOW = 'FLOW',
  COUNTDOWN = 'COUNTDOWN'
}

export enum TimerStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  BREAK = 'BREAK'
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  text: string;
  isCompleted: boolean;
  notes?: string;
}

export interface CompletedTaskRecord {
  title: string;
  note?: string;
  completedAt: number;
}

export interface Session {
  id: string;
  categoryId: string;
  startTime: number;
  endTime: number;
  duration: number; // focused work time in ms
  totalElapsed: number; // total time from session start to end in ms
  sessionStartTime: number; // the very first start of this chain
  notes: string;
  mode: TimerMode;
  isFlagged?: boolean;
  rating?: number; // 1-5
  tags: string[];
  distractions: string[];
  distractionNote?: string;
  completedTasks: CompletedTaskRecord[];
}

export interface SessionLogEntry {
  id: string;
  timestamp: number;
  duration: number; // in milliseconds
  sessionNumber: number;
}

export interface Settings {
  flowDivisor: number;
  showStreaks: boolean;
  dailyMinWorkMinutes: number;
  dailyMaxWorkMinutes: number;
  idleThresholdMinutes: number;
  theme: 'light' | 'dark';
}

export interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  startTime: number | null;
  sessionStartTime: number | null; // Tracks the very first start of the current session
  accumulatedTime: number; // ms
  targetTime: number | null; // ms
  breakRemaining: number | null; // ms
  intervals: number[]; // Track finished work intervals in the current session
  completedTasks: CompletedTaskRecord[]; // Tasks completed during the current session
}

export interface CategoryData {
  timerState: TimerState;
  sessions: Session[];
  dailyLogs: SessionLogEntry[]; // Note: keeping for compatibility, but moving to use 'sessions' for the log UI
  currentNotes: string;
  tasks: Task[];
}

export interface AppState {
  categories: Category[];
  settings: Settings;
  selectedCategoryId: string;
  categoryData: Record<string, CategoryData>;
  allTags: string[];
  analyticsTagFilter: string[]; // Persistent tag filters
  distractionPresets: string[];
  stats: {
    longestStreak: number;
  };
}