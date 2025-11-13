/**
 * Type Definitions for Exam Planner Application
 */

export interface Exam {
  id: string;
  title: string;
  date: string; // ISO 8601
  time?: string;
  tag: string; // Hex color
  notes?: string;
  createdAt: string;
  completed?: boolean;
}

export interface TimetableBlock {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end?: string; // HH:MM
  tag: string; // Hex color
}

export interface FocusSettings {
  mode: 'countdown' | 'pomodoro';
  work: number; // minutes
  short: number; // minutes
  long: number; // minutes
  every: number; // cycles until long break
}

export interface PomodoroState {
  work: number;
  short: number;
  long: number;
  every: number;
  phase: 'work' | 'short' | 'long';
  count: number;
}

export interface AppState {
  exams: Exam[];
  timetable: TimetableBlock[];
  focus: FocusSettings | null;
  view: Date;
}

export type StateListener = (state: AppState) => void;

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

export interface ValidationError {
  field: string;
  message: string;
}

export const LIMITS = {
  TITLE_MAX: 100,
  NOTES_MAX: 500,
  EXAMS_MAX: 1000,
  TIMETABLE_MAX: 500,
  STORAGE_MAX: 5 * 1024 * 1024, // 5MB
} as const;

export const STORAGE_KEYS = {
  EXAMS: 'exams_v1',
  TIMETABLE: 'timetable_v2',
  FOCUS: 'focus_settings_v1',
} as const;
