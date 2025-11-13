/**
 * Weekly Timetable Module - 7-column weekly view
 */

import type { Exam } from './types';
import { state } from './state';
import { $, createElement, extractDateString } from './utils';
import { createModal } from './modal';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

class WeeklyTimetableManager {
  private gridElement!: HTMLElement;
  private weeklyModal = createModal('weeklyModal');

  init(): void {
    try {
      this.gridElement = $('#weeklyGrid');
      this.render();

      // Subscribe to state changes
      state.subscribe(() => this.render());
    } catch (error) {
      console.error('Weekly timetable initialization failed:', error);
    }
  }

  /**
   * Get the start of the current week (Sunday)
   */
  private getWeekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  /**
   * Get dates for the current week and next 3 weeks (28 days total)
   */
  private getWeekDates(): Date[] {
    const weekStart = this.getWeekStart();
    const dates: Date[] = [];

    // Show 4 weeks (28 days) for horizontal scrolling
    for (let i = 0; i < 28; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date);
    }

    return dates;
  }

  /**
   * Create a column for a specific day
   */
  private createDayColumn(date: Date, exams: Exam[]): HTMLDivElement {
    const column = createElement('div', { className: 'weekly-column' });

    // Header
    const header = createElement('div', {
      className: 'weekly-column-header',
      textContent: `${DAYS_OF_WEEK[date.getDay()].slice(0, 3)} ${date.getDate()}`
    });
    column.appendChild(header);

    // Events
    exams.forEach((exam) => {
      const event = this.createEventCard(exam);
      column.appendChild(event);
    });

    // Show message if no events
    if (exams.length === 0) {
      const empty = createElement('div', {
        className: 'small',
        textContent: 'No exams',
      });
      empty.style.opacity = '0.5';
      empty.style.textAlign = 'center';
      empty.style.padding = 'var(--spacing-sm)';
      column.appendChild(empty);
    }

    return column;
  }

  /**
   * Create an event card
   */
  private createEventCard(exam: Exam): HTMLDivElement {
    const card = createElement('div', {
      className: `weekly-event${exam.completed ? ' completed' : ''}`
    });
    card.style.background = exam.tag;
    card.style.cursor = 'pointer';

    // Add click handler for opening details (left click)
    card.addEventListener('click', (e) => {
      // Prevent toggle on checkbox click
      if ((e.target as HTMLElement).classList.contains('completion-checkbox')) {
        return;
      }
      this.handleEventClick(exam);
    });

    // Add completion checkbox
    const checkbox = createElement('input', {
      className: 'completion-checkbox',
    }) as HTMLInputElement;
    checkbox.type = 'checkbox';
    checkbox.checked = exam.completed || false;
    checkbox.style.cssText = 'position: absolute; top: 4px; left: 4px; cursor: pointer; width: 14px; height: 14px;';
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCompletion(exam.id);
    });
    card.appendChild(checkbox);

    const title = createElement('div', {
      className: 'weekly-event-title',
      textContent: exam.title,
    });
    title.style.paddingLeft = '18px';

    const time = createElement('div', {
      className: 'weekly-event-time',
      textContent: exam.time || 'All day',
    });

    card.appendChild(title);
    card.appendChild(time);

    if (exam.notes) {
      const notes = createElement('div', {
        className: 'weekly-event-time',
        textContent: exam.notes,
      });
      card.appendChild(notes);
    }

    return card;
  }

  /**
   * Toggle completion status
   */
  private toggleCompletion(examId: string): void {
    state.toggleExamCompletion(examId);
  }

  /**
   * Handle event card click - show detailed modal
   */
  private handleEventClick(exam: Exam): void {
    const examDate = new Date(exam.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysUntil = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const daysText = daysUntil === 0 ? 'Today' :
                     daysUntil === 1 ? 'Tomorrow' :
                     daysUntil < 0 ? `${Math.abs(daysUntil)} days ago` :
                     `In ${daysUntil} days`;

    const content = `
      <div class="detail-list">
        <div class="detail-item">
          <span class="detail-label">Subject:</span>
          <span class="detail-value">${exam.title}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Status:</span>
          <span class="detail-value">
            <button class="btn btn--small" id="toggleCompletionBtn" data-exam-id="${exam.id}">
              ${exam.completed ? '✓ Completed' : '○ Mark Complete'}
            </button>
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Date:</span>
          <span class="detail-value">${examDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Time:</span>
          <span class="detail-value">${exam.time || 'Not specified'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Days Until:</span>
          <span class="detail-value" style="color: ${daysUntil <= 3 ? 'var(--accent-color)' : 'inherit'}">
            ${daysText}
          </span>
        </div>
        ${exam.notes ? `
          <div class="detail-item">
            <span class="detail-label">Notes:</span>
            <span class="detail-value">${exam.notes}</span>
          </div>
        ` : ''}
        <div class="detail-item">
          <span class="detail-label">Color Tag:</span>
          <span class="detail-value">
            <span class="color-tag" style="background: ${exam.tag}; display: inline-block; width: 40px; height: 20px; border-radius: 4px; vertical-align: middle;"></span>
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Created:</span>
          <span class="detail-value">${new Date(exam.createdAt).toLocaleString()}</span>
        </div>
      </div>
    `;

    this.weeklyModal.setTitle(`📅 ${exam.title}`);
    this.weeklyModal.setBody(content);
    this.weeklyModal.open();

    // Add event listener for toggle button
    const toggleBtn = document.getElementById('toggleCompletionBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleCompletion(exam.id);
        this.weeklyModal.close();
      });
    }
  }

  /**
   * Group exams by day of week
   */
  private groupExamsByWeek(dates: Date[]): Map<string, Exam[]> {
    const map = new Map<string, Exam[]>();
    const exams = state.getState().exams;

    // Initialize map with week dates
    dates.forEach((date) => {
      const key = extractDateString(date);
      map.set(key, []);
    });

    // Group exams
    exams.forEach((exam) => {
      const examDateStr = extractDateString(exam.date);
      if (map.has(examDateStr)) {
        map.get(examDateStr)!.push(exam);
      }
    });

    return map;
  }

  /**
   * Render the weekly timetable
   */
  render(): void {
    try {
      this.gridElement.innerHTML = '';

      const weekDates = this.getWeekDates();
      const examsByDay = this.groupExamsByWeek(weekDates);

      weekDates.forEach((date) => {
        const dateStr = extractDateString(date);
        const exams = examsByDay.get(dateStr) || [];

        // Sort exams by time
        exams.sort((a, b) => {
          if (!a.time) return 1;
          if (!b.time) return -1;
          return a.time.localeCompare(b.time);
        });

        const column = this.createDayColumn(date, exams);
        this.gridElement.appendChild(column);
      });
    } catch (error) {
      console.error('Weekly timetable render failed:', error);
      this.gridElement.innerHTML = '<p class="error-message">Failed to render weekly timetable</p>';
    }
  }
}

export const weeklyTimetable = new WeeklyTimetableManager();
