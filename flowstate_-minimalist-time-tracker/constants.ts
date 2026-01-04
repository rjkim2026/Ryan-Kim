import { AppState, TimerMode, TimerStatus, CategoryData } from './types';

export const CATEGORY_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

export const DEFAULT_DISTRACTION_PRESETS = [
  'Phone', 'Social Media', 'People', 'Tired', 'Random Thoughts', 'Hungry', 'Noise'
];

const createDefaultCategoryData = (): CategoryData => ({
  timerState: {
    mode: TimerMode.FLOW,
    status: TimerStatus.IDLE,
    startTime: null,
    sessionStartTime: null,
    accumulatedTime: 0,
    targetTime: null,
    breakRemaining: null,
    intervals: [],
    completedTasks: [],
  },
  sessions: [],
  dailyLogs: [],
  currentNotes: '',
  tasks: [],
});

export const DEFAULT_APP_STATE: AppState = {
  categories: [
    { id: 'default-1', name: 'Work', color: '#3b82f6' },
    { id: 'default-2', name: 'Study', color: '#8b5cf6' },
    { id: 'default-3', name: 'Exercise', color: '#10b981' },
  ],
  settings: {
    flowDivisor: 5,
    showStreaks: true,
    dailyMinWorkMinutes: 120,
    dailyMaxWorkMinutes: 480,
    idleThresholdMinutes: 180, // 3 hours
    theme: 'dark',
  },
  allTags: ['Deep Work', 'Admin', 'Meeting', 'Reading'],
  analyticsTagFilter: [],
  distractionPresets: DEFAULT_DISTRACTION_PRESETS,
  selectedCategoryId: 'default-1',
  categoryData: {
    'default-1': createDefaultCategoryData(),
    'default-2': createDefaultCategoryData(),
    'default-3': createDefaultCategoryData(),
  },
  stats: {
    longestStreak: 0
  }
};

export const LOCAL_STORAGE_KEY = 'flow_state_app_v3';

export const BEEP_URL = 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg';