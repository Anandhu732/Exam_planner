/**
 * Validation Module - Input validation and sanitization
 */

import type { Exam, TimetableBlock, ValidationError } from './types';
import { LIMITS } from './types';
import { sanitizeInput, isValidHexColor, isValidTime } from './utils';

/**
 * Validate exam data
 */
export function validateExam(data: Partial<Exam>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Title validation
  if (!data.title || data.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (data.title.length > LIMITS.TITLE_MAX) {
    errors.push({
      field: 'title',
      message: `Title must be less than ${LIMITS.TITLE_MAX} characters`
    });
  }

  // Date validation
  if (!data.date) {
    errors.push({ field: 'date', message: 'Date is required' });
  } else {
    const date = new Date(data.date);
    if (isNaN(date.getTime())) {
      errors.push({ field: 'date', message: 'Invalid date format' });
    }
  }

  // Time validation (optional)
  if (data.time && !isValidTime(data.time)) {
    errors.push({ field: 'time', message: 'Invalid time format (use HH:MM)' });
  }

  // Tag/color validation
  if (!data.tag) {
    errors.push({ field: 'tag', message: 'Color tag is required' });
  } else if (!isValidHexColor(data.tag)) {
    errors.push({ field: 'tag', message: 'Invalid color format (use #RRGGBB)' });
  }

  // Notes validation (optional)
  if (data.notes && data.notes.length > LIMITS.NOTES_MAX) {
    errors.push({
      field: 'notes',
      message: `Notes must be less than ${LIMITS.NOTES_MAX} characters`
    });
  }

  return errors;
}

/**
 * Sanitize exam data
 */
export function sanitizeExam(data: Partial<Exam>): Partial<Exam> {
  return {
    ...data,
    title: data.title ? sanitizeInput(data.title, LIMITS.TITLE_MAX) : undefined,
    notes: data.notes ? sanitizeInput(data.notes, LIMITS.NOTES_MAX) : undefined,
    tag: data.tag?.toLowerCase() || undefined,
  };
}

/**
 * Validate timetable block data
 */
export function validateTimetableBlock(data: Partial<TimetableBlock>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Title validation
  if (!data.title || data.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (data.title.length > LIMITS.TITLE_MAX) {
    errors.push({
      field: 'title',
      message: `Title must be less than ${LIMITS.TITLE_MAX} characters`
    });
  }

  // Date validation
  if (!data.date) {
    errors.push({ field: 'date', message: 'Date is required' });
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    errors.push({ field: 'date', message: 'Invalid date format (use YYYY-MM-DD)' });
  }

  // Start time validation
  if (!data.start) {
    errors.push({ field: 'start', message: 'Start time is required' });
  } else if (!isValidTime(data.start)) {
    errors.push({ field: 'start', message: 'Invalid start time format (use HH:MM)' });
  }

  // End time validation (optional)
  if (data.end && !isValidTime(data.end)) {
    errors.push({ field: 'end', message: 'Invalid end time format (use HH:MM)' });
  }

  // Validate end is after start
  if (data.start && data.end && isValidTime(data.start) && isValidTime(data.end)) {
    const [startH, startM] = data.start.split(':').map(Number);
    const [endH, endM] = data.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (endMinutes <= startMinutes) {
      errors.push({ field: 'end', message: 'End time must be after start time' });
    }
  }

  // Tag validation
  if (!data.tag) {
    errors.push({ field: 'tag', message: 'Color tag is required' });
  } else if (!isValidHexColor(data.tag)) {
    errors.push({ field: 'tag', message: 'Invalid color format (use #RRGGBB)' });
  }

  return errors;
}

/**
 * Sanitize timetable block data
 */
export function sanitizeTimetableBlock(data: Partial<TimetableBlock>): Partial<TimetableBlock> {
  return {
    ...data,
    title: data.title ? sanitizeInput(data.title, LIMITS.TITLE_MAX) : undefined,
    tag: data.tag?.toLowerCase() || undefined,
  };
}

/**
 * Display validation errors to user
 */
export function displayValidationErrors(errors: ValidationError[]): void {
  if (errors.length === 0) return;

  const messages = errors.map((e) => `${e.field}: ${e.message}`).join('\n');
  alert(`Please fix the following errors:\n\n${messages}`);
}
