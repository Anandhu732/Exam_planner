/**
 * Storage Module - Handles LocalStorage with error recovery and validation
 */

import type { Exam, TimetableBlock, FocusSettings, StorageResult } from './types';
import { STORAGE_KEYS, LIMITS } from './types';
import { estimateStorageSize, isStorageAvailable, showToast } from './utils';

class StorageManager {
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = isStorageAvailable();
    if (!this.isAvailable) {
      console.warn('LocalStorage is not available. Data will not persist.');
    }
  }

  /**
   * Save data to localStorage with quota checking
   */
  save<T>(key: string, value: T): StorageResult<T> {
    if (!this.isAvailable) {
      return { success: false, error: new Error('Storage not available') };
    }

    try {
      const serialized = JSON.stringify(value);
      const size = new Blob([serialized]).size;

      // Check storage quota
      if (size > LIMITS.STORAGE_MAX) {
        const error = new Error('Data exceeds storage limit');
        showToast('Storage limit reached! Please export your data.', 5000);
        return { success: false, error };
      }

      // Check if we're approaching quota
      if (size > LIMITS.STORAGE_MAX * 0.8) {
        console.warn('Storage usage above 80%. Consider exporting data.');
      }

      localStorage.setItem(key, serialized);
      return { success: true, data: value };
    } catch (error) {
      console.error(`Storage save failed for ${key}:`, error);

      if (error instanceof Error && error.name === 'QuotaExceededError') {
        showToast('Storage full! Please export and clear old data.', 5000);
      }

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown storage error')
      };
    }
  }

  /**
   * Load data from localStorage with validation
   */
  load<T>(key: string, fallback: T): T {
    if (!this.isAvailable) {
      return fallback;
    }

    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return fallback;
      }

      const data = JSON.parse(raw);

      // Validate data structure
      if (!this.validateData(key, data)) {
        console.warn(`Invalid data format for ${key}, using fallback`);
        return fallback;
      }

      return data;
    } catch (error) {
      console.error(`Storage load failed for ${key}:`, error);
      return fallback;
    }
  }

  /**
   * Validate data structure based on key
   */
  private validateData(key: string, data: unknown): boolean {
    // Allow null for focus settings (optional data)
    if (key === STORAGE_KEYS.FOCUS && data === null) return true;
    
    if (!data) return false;

    switch (key) {
      case STORAGE_KEYS.EXAMS:
        return Array.isArray(data) && data.every(this.isValidExam);

      case STORAGE_KEYS.TIMETABLE:
        return Array.isArray(data) && data.every(this.isValidTimetableBlock);

      case STORAGE_KEYS.FOCUS:
        return this.isValidFocusSettings(data);

      default:
        return true;
    }
  }

  /**
   * Validate exam object
   */
  private isValidExam(exam: unknown): exam is Exam {
    if (!exam || typeof exam !== 'object') return false;
    const e = exam as Partial<Exam>;

    return (
      typeof e.id === 'string' &&
      typeof e.title === 'string' &&
      typeof e.date === 'string' &&
      typeof e.tag === 'string' &&
      typeof e.createdAt === 'string' &&
      (e.time === undefined || typeof e.time === 'string') &&
      (e.notes === undefined || typeof e.notes === 'string')
    );
  }

  /**
   * Validate timetable block
   */
  private isValidTimetableBlock(block: unknown): block is TimetableBlock {
    if (!block || typeof block !== 'object') return false;
    const b = block as Partial<TimetableBlock>;

    return (
      typeof b.id === 'string' &&
      typeof b.title === 'string' &&
      typeof b.date === 'string' &&
      typeof b.start === 'string' &&
      typeof b.tag === 'string' &&
      (b.end === undefined || typeof b.end === 'string')
    );
  }

  /**
   * Validate focus settings
   */
  private isValidFocusSettings(settings: unknown): settings is FocusSettings {
    if (!settings || typeof settings !== 'object') return false;
    const s = settings as Partial<FocusSettings>;

    return (
      (s.mode === 'countdown' || s.mode === 'pomodoro') &&
      typeof s.work === 'number' &&
      typeof s.short === 'number' &&
      typeof s.long === 'number' &&
      typeof s.every === 'number'
    );
  }

  /**
   * Clear all storage
   */
  clear(): void {
    if (!this.isAvailable) return;

    try {
      localStorage.removeItem(STORAGE_KEYS.EXAMS);
      localStorage.removeItem(STORAGE_KEYS.TIMETABLE);
      localStorage.removeItem(STORAGE_KEYS.FOCUS);
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  /**
   * Export all data as JSON
   */
  exportData(): string {
    const data = {
      [STORAGE_KEYS.EXAMS]: this.load(STORAGE_KEYS.EXAMS, []),
      [STORAGE_KEYS.TIMETABLE]: this.load(STORAGE_KEYS.TIMETABLE, []),
      [STORAGE_KEYS.FOCUS]: this.load(STORAGE_KEYS.FOCUS, null),
      exportedAt: new Date().toISOString(),
      version: '2.0.0',
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import data from JSON
   */
  importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);

      if (data[STORAGE_KEYS.EXAMS]) {
        this.save(STORAGE_KEYS.EXAMS, data[STORAGE_KEYS.EXAMS]);
      }

      if (data[STORAGE_KEYS.TIMETABLE]) {
        this.save(STORAGE_KEYS.TIMETABLE, data[STORAGE_KEYS.TIMETABLE]);
      }

      if (data[STORAGE_KEYS.FOCUS]) {
        this.save(STORAGE_KEYS.FOCUS, data[STORAGE_KEYS.FOCUS]);
      }

      showToast('Data imported successfully!');
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      showToast('Import failed. Invalid file format.', 5000);
      return false;
    }
  }

  /**
   * Get current storage usage estimate
   */
  getStorageUsage(): { used: number; available: number; percentage: number } {
    const exams = this.load(STORAGE_KEYS.EXAMS, []);
    const timetable = this.load(STORAGE_KEYS.TIMETABLE, []);
    const focus = this.load(STORAGE_KEYS.FOCUS, null);

    const used = estimateStorageSize({ exams, timetable, focus });
    const available = LIMITS.STORAGE_MAX;
    const percentage = (used / available) * 100;

    return { used, available, percentage };
  }
}

// Export singleton instance
export const storage = new StorageManager();
