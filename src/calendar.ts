/**
 * Calendar Module - Calendar rendering and interaction
 */

import type { Exam } from './types';
import { state } from './state';
import { $, createElement, extractDateString, formatDate, startOfMonth, endOfMonth } from './utils';
import { createModal } from './modal';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CALENDAR_CELLS = 42; // 6 rows × 7 days

class CalendarManager {
  private gridElement!: HTMLElement;
  private dowElement!: HTMLElement;
  private monthTitleElement!: HTMLElement;
  private todayStrElement!: HTMLElement;
  private currentView: Date;
  private addExamModal = createModal('addExamModal');

  constructor() {
    this.currentView = new Date();
  }

  /**
   * Initialize calendar
   */
  init(): void {
    try {
      this.gridElement = $('#grid');
      this.dowElement = $('#dow');
      this.monthTitleElement = $('#monthTitle');
      this.todayStrElement = $('#todayStr');

      this.renderDayOfWeek();
      this.setupEventDelegation();
      this.setupNavigation();
      this.render();

      // Subscribe to state changes
      state.subscribe(() => this.updateExamTags());
    } catch (error) {
      console.error('Calendar initialization failed:', error);
    }
  }

  /**
   * Render day of week headers
   */
  private renderDayOfWeek(): void {
    this.dowElement.innerHTML = '';
    DOW.forEach((day) => {
      const el = createElement('div', {
        className: 'dow',
        textContent: day,
        'aria-label': day,
      });
      this.dowElement.appendChild(el);
    });
  }

  /**
   * Setup event delegation for day clicks
   */
  private setupEventDelegation(): void {
    this.gridElement.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const dayButton = target.closest('.day') as HTMLButtonElement;

      if (dayButton && dayButton.dataset.date) {
        this.handleDayClick(dayButton.dataset.date);
      }
    });
  }

  /**
   * Setup month navigation
   */
  private setupNavigation(): void {
    $('#prevMonth').addEventListener('click', () => this.navigateMonth(-1));
    $('#nextMonth').addEventListener('click', () => this.navigateMonth(1));
  }

  /**
   * Navigate to previous/next month
   */
  private navigateMonth(direction: number): void {
    this.currentView.setMonth(this.currentView.getMonth() + direction);
    this.render();
    state.setView(new Date(this.currentView));
  }

  /**
   * Handle day click - Open add exam modal
   */
  private handleDayClick(dateStr: string): void {
    try {
      const dateInput = $('#date') as HTMLInputElement;
      const titleInput = $('#title') as HTMLInputElement;

      dateInput.value = dateStr;

      // Open modal
      this.addExamModal.setTitle(`➕ Add Exam - ${new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      })}`);
      this.addExamModal.open();

      // Focus title input after modal opens
      setTimeout(() => titleInput.focus(), 100);
    } catch (error) {
      console.error('Day click handler failed:', error);
    }
  }

  /**
   * Generate calendar dates
   */
  private generateDates(): Array<{ date: Date; faded: boolean }> {
    const start = startOfMonth(this.currentView);
    const end = endOfMonth(this.currentView);
    const leadDays = start.getDay();
    const daysInMonth = end.getDate();

    const dates: Array<{ date: Date; faded: boolean }> = [];

    // Leading days from previous month
    for (let i = leadDays - 1; i >= 0; i--) {
      const date = new Date(start);
      date.setDate(-i);
      dates.push({ date, faded: true });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(start);
      date.setDate(i);
      dates.push({ date, faded: false });
    }

    // Trailing days from next month
    const remaining = CALENDAR_CELLS - dates.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(end);
      date.setDate(end.getDate() + i);
      dates.push({ date, faded: true });
    }

    return dates;
  }

  /**
   * Group exams by date
   */
  private groupExamsByDay(): Map<string, Exam[]> {
    const map = new Map<string, Exam[]>();
    const exams = state.getState().exams;

    exams.forEach((exam) => {
      // Extract date part from ISO string (handles both YYYY-MM-DD and full ISO format)
      const key = extractDateString(exam.date);

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(exam);
    });

    return map;
  }

  /**
   * Create day cell element
   */
  private createDayCell(
    date: Date,
    faded: boolean,
    exams: Exam[] = []
  ): HTMLButtonElement {
    const dateStr = formatDate(date);

    // Get today's date at midnight for accurate comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDate(today);
    const isToday = todayStr === dateStr;

    const button = createElement('button', {
      className: `day${faded ? ' faded' : ''}${isToday ? ' today' : ''}`,
      'data-date': dateStr,
      'aria-label': this.generateAriaLabel(date, exams),
    });

    // Day number
    const num = createElement('div', {
      className: 'num',
      textContent: String(date.getDate()),
    });
    button.appendChild(num);

    // Exam tags
    if (exams.length > 0) {
      const pill = this.createExamPill(exams);
      button.appendChild(pill);
    }

    return button;
  }

  /**
   * Create exam pill with tags
   */
  private createExamPill(exams: Exam[]): HTMLDivElement {
    const pill = createElement('div', { className: 'pill' });
    const MAX_VISIBLE = 3;

    // Show first 3 exams
    exams.slice(0, MAX_VISIBLE).forEach((exam) => {
      const tag = createElement('span', {
        className: `tag${exam.completed ? ' completed' : ''}`,
        textContent: exam.title.slice(0, 4).toUpperCase(),
      });
      tag.style.background = exam.tag;
      pill.appendChild(tag);
    });

    // Show "+N" if more exams
    if (exams.length > MAX_VISIBLE) {
      const more = createElement('span', {
        className: 'tag',
        textContent: `+${exams.length - MAX_VISIBLE}`,
      });
      pill.appendChild(more);
    }

    return pill;
  }

  /**
   * Generate accessible label for day
   */
  private generateAriaLabel(date: Date, exams: Exam[]): string {
    const dateStr = date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    if (exams.length === 0) {
      return dateStr;
    }

    const examCount = exams.length === 1 ? '1 exam' : `${exams.length} exams`;
    return `${dateStr}. ${examCount} scheduled.`;
  }

  /**
   * Update today string
   */
  private updateTodayStr(): void {
    const now = new Date();
    this.todayStrElement.textContent = now.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  /**
   * Update month title
   */
  private updateMonthTitle(): void {
    const start = startOfMonth(this.currentView);
    this.monthTitleElement.textContent = start.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Full calendar render
   */
  render(): void {
    try {
      this.updateTodayStr();
      this.updateMonthTitle();

      const dates = this.generateDates();
      const examsByDay = this.groupExamsByDay();

      // Clear and rebuild grid
      this.gridElement.innerHTML = '';

      dates.forEach(({ date, faded }) => {
        const dateStr = formatDate(date);
        const exams = examsByDay.get(dateStr) || [];
        const cell = this.createDayCell(date, faded, exams);
        this.gridElement.appendChild(cell);
      });
    } catch (error) {
      console.error('Calendar render failed:', error);
      this.gridElement.innerHTML = '<p class="error-message">Failed to render calendar</p>';
    }
  }

  /**
   * Incremental update - only update exam tags without full re-render
   */
  private updateExamTags(): void {
    try {
      const examsByDay = this.groupExamsByDay();

      const days = this.gridElement.querySelectorAll('.day');
      days.forEach((day) => {
        const button = day as HTMLButtonElement;
        const dateStr = button.dataset.date;
        if (!dateStr) return;

        const exams = examsByDay.get(dateStr) || [];

        // Remove old pill
        const oldPill = button.querySelector('.pill');
        if (oldPill) {
          oldPill.remove();
        }

        // Add new pill if exams exist
        if (exams.length > 0) {
          const pill = this.createExamPill(exams);
          button.appendChild(pill);
        }

        // Update aria label
        const date = new Date(dateStr);
        button.setAttribute('aria-label', this.generateAriaLabel(date, exams));
      });
    } catch (error) {
      console.error('Calendar tag update failed:', error);
    }
  }

  /**
   * Navigate to today
   */
  goToToday(): void {
    this.currentView = new Date();
    this.render();
    state.setView(new Date(this.currentView));
  }
}

// Export singleton instance
export const calendar = new CalendarManager();
