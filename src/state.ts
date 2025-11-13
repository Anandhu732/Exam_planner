/**
 * State Management Module - Centralized application state
 */

import type { AppState, StateListener, Exam, TimetableBlock, FocusSettings } from './types';
import { STORAGE_KEYS, LIMITS } from './types';
import { storage } from './storage';
import { extractDateString, showToast } from './utils';

class StateManager {
  private state: AppState;
  private listeners: Set<StateListener> = new Set();

  constructor() {
    // Initialize state from storage
    this.state = {
      exams: storage.load<Exam[]>(STORAGE_KEYS.EXAMS, []),
      timetable: storage.load<TimetableBlock[]>(STORAGE_KEYS.TIMETABLE, []),
      focus: storage.load<FocusSettings | null>(STORAGE_KEYS.FOCUS, null),
      view: new Date(),
    };
  }

  /**
   * Get current state (immutable)
   */
  getState(): Readonly<AppState> {
    return Object.freeze({ ...this.state });
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notify(): void {
    const immutableState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(immutableState);
      } catch (error) {
        console.error('State listener error:', error);
      }
    });
  }

  /**
   * Persist state to storage
   */
  private persist(): void {
    storage.save(STORAGE_KEYS.EXAMS, this.state.exams);
    storage.save(STORAGE_KEYS.TIMETABLE, this.state.timetable);
    storage.save(STORAGE_KEYS.FOCUS, this.state.focus);
  }

  /**
   * Add exam with validation
   */
  addExam(exam: Exam): boolean {
    // Check limits
    if (this.state.exams.length >= LIMITS.EXAMS_MAX) {
      showToast(`Maximum ${LIMITS.EXAMS_MAX} exams reached!`, 5000);
      return false;
    }

    // Check for duplicates (same title and date) - normalize dates for comparison
    const newExamDate = extractDateString(exam.date);
    const isDuplicate = this.state.exams.some((e) => {
      const existingDate = extractDateString(e.date);
      return e.title.toLowerCase() === exam.title.toLowerCase() && existingDate === newExamDate;
    });

    if (isDuplicate) {
      showToast('Similar exam already exists!', 3000);
    }

    this.state.exams.push(exam);
    this.persist();
    this.notify();
    return true;
  }

  /**
   * Update exam
   */
  updateExam(id: string, updates: Partial<Exam>): boolean {
    const index = this.state.exams.findIndex((e) => e.id === id);
    if (index === -1) return false;

    this.state.exams[index] = {
      ...this.state.exams[index],
      ...updates,
    };

    this.persist();
    this.notify();
    return true;
  }

  /**
   * Toggle exam completion status
   */
  toggleExamCompletion(id: string): boolean {
    const exam = this.state.exams.find((e) => e.id === id);
    if (!exam) return false;

    exam.completed = !exam.completed;
    this.persist();
    this.notify();
    return true;
  }

  /**
   * Delete exam
   */
  deleteExam(id: string): boolean {
    const initialLength = this.state.exams.length;
    this.state.exams = this.state.exams.filter((e) => e.id !== id);

    if (this.state.exams.length < initialLength) {
      this.persist();
      this.notify();
      return true;
    }

    return false;
  }

  /**
   * Get exams for a specific date
   */
  getExamsForDate(date: string): Exam[] {
    return this.state.exams.filter((e) => {
      const examDate = extractDateString(e.date);
      return examDate === date;
    });
  }

  /**
   * Get upcoming exams
   */
  getUpcomingExams(limit = 10): Exam[] {
    const now = new Date();
    return this.state.exams
      .filter((e) => new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, limit);
  }

  /**
   * Add timetable block
   */
  addTimetableBlock(block: TimetableBlock): boolean {
    if (this.state.timetable.length >= LIMITS.TIMETABLE_MAX) {
      showToast(`Maximum ${LIMITS.TIMETABLE_MAX} timetable blocks reached!`, 5000);
      return false;
    }

    this.state.timetable.push(block);
    this.persist();
    this.notify();
    return true;
  }

  /**
   * Delete timetable block
   */
  deleteTimetableBlock(id: string): boolean {
    const initialLength = this.state.timetable.length;
    this.state.timetable = this.state.timetable.filter((b) => b.id !== id);

    if (this.state.timetable.length < initialLength) {
      this.persist();
      this.notify();
      return true;
    }

    return false;
  }

  /**
   * Get timetable blocks for a specific date
   */
  getTimetableForDate(date: string): TimetableBlock[] {
    return this.state.timetable.filter((b) => b.date === date);
  }

  /**
   * Update focus settings
   */
  updateFocusSettings(settings: FocusSettings): void {
    this.state.focus = settings;
    this.persist();
    this.notify();
  }

  /**
   * Update calendar view
   */
  setView(date: Date): void {
    this.state.view = date;
    this.notify();
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      return;
    }

    this.state = {
      exams: [],
      timetable: [],
      focus: null,
      view: new Date(),
    };

    storage.clear();
    this.notify();
    showToast('All data cleared!');
  }

  /**
   * Export data
   */
  exportData(): void {
    try {
      const data = storage.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `exam-planner-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();

      URL.revokeObjectURL(url);
      showToast('Data exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Export failed. Please try again.', 5000);
    }
  }

  /**
   * Import data
   */
  importData(file: File): void {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      if (storage.importData(result)) {
        // Reload state
        this.state = {
          exams: storage.load<Exam[]>(STORAGE_KEYS.EXAMS, []),
          timetable: storage.load<TimetableBlock[]>(STORAGE_KEYS.TIMETABLE, []),
          focus: storage.load<FocusSettings | null>(STORAGE_KEYS.FOCUS, null),
          view: new Date(),
        };
        this.notify();
      }
    };

    reader.onerror = () => {
      console.error('File read failed:', reader.error);
      showToast('Failed to read file.', 5000);
    };

    reader.readAsText(file);
  }

  /**
   * Get storage usage statistics
   */
  getStorageStats(): { used: number; available: number; percentage: number } {
    return storage.getStorageUsage();
  }
}

// Export singleton instance
export const state = new StateManager();
