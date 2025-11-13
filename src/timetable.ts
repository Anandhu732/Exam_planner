/**
 * Timetable Module - Daily schedule management
 */

import type { TimetableBlock } from './types';
import { state } from './state';
import { $, createElement, generateId, showToast } from './utils';
import { validateTimetableBlock, sanitizeTimetableBlock, displayValidationErrors } from './validation';

const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

class TimetableManager {
  private gridElement!: HTMLElement;
  private dateInput!: HTMLInputElement;
  private currentDate: string;

  constructor() {
    this.currentDate = new Date().toISOString().slice(0, 10);
  }

  init(): void {
    try {
      this.gridElement = $('#ttGrid');
      this.dateInput = $('#ttDate') as HTMLInputElement;

      this.dateInput.value = this.currentDate;
      this.dateInput.addEventListener('change', () => this.handleDateChange());

      $('#ttAdd').addEventListener('click', () => this.handleAddBlock());

      // Listen for date selection from calendar
      document.addEventListener('date-selected', ((e: CustomEvent) => {
        this.currentDate = e.detail.date;
        this.dateInput.value = this.currentDate;
        this.render();
      }) as EventListener);

      this.render();

      // Subscribe to state changes
      state.subscribe(() => this.render());
    } catch (error) {
      console.error('Timetable initialization failed:', error);
    }
  }

  private handleDateChange(): void {
    this.currentDate = this.dateInput.value || this.currentDate;
    this.render();
  }

  private handleAddBlock(slot?: string): void {
    const title = prompt(`Title for ${this.currentDate} ${slot || ''}?`);
    if (!title) return;

    const start = slot || prompt('Start time (HH:MM):') || '';
    const end = prompt('End time (HH:MM, optional):') || '';
    const tag = prompt('Color (hex):') || '#fff5b1';

    const data: Partial<TimetableBlock> = {
      title,
      date: this.currentDate,
      start,
      end,
      tag,
    };

    const sanitized = sanitizeTimetableBlock(data);
    const errors = validateTimetableBlock(sanitized);

    if (errors.length > 0) {
      displayValidationErrors(errors);
      return;
    }

    const block: TimetableBlock = {
      id: generateId(),
      title: sanitized.title!,
      date: sanitized.date!,
      start: sanitized.start!,
      end: sanitized.end || '',
      tag: sanitized.tag!,
    };

    if (state.addTimetableBlock(block)) {
      showToast('Timetable block added!');
    }
  }

  private createCell(text: string, className: string): HTMLDivElement {
    return createElement('div', {
      className,
      textContent: text,
    });
  }

  private createTimeCell(slot: string): HTMLDivElement {
    const cell = createElement('div', { className: 'tt-cell' });
    cell.dataset.slot = slot;

    cell.addEventListener('click', () => this.handleAddBlock(slot));

    // Get blocks for this slot
    const blocks = state
      .getTimetableForDate(this.currentDate)
      .filter((b) => b.start === slot);

    blocks.forEach((block) => {
      const blockEl = this.createBlockElement(block);
      cell.appendChild(blockEl);
    });

    return cell;
  }

  private createBlockElement(block: TimetableBlock): HTMLDivElement {
    const blockEl = createElement('div', { className: 'tt-block' });
    blockEl.style.background = block.tag;

    const title = createElement('span', {
      textContent: block.title,
    });
    title.style.fontWeight = '800';

    const removeBtn = createElement('button', {
      className: 'remove-btn',
      textContent: '×',
      'aria-label': 'Remove block',
    });

    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.deleteTimetableBlock(block.id)) {
        showToast('Block removed!');
      }
    });

    blockEl.appendChild(title);
    blockEl.appendChild(removeBtn);

    return blockEl;
  }

  render(): void {
    try {
      this.gridElement.innerHTML = '';

      // Header row
      this.gridElement.appendChild(this.createCell('', 'tt-head'));
      TIME_SLOTS.forEach((slot) => {
        this.gridElement.appendChild(this.createCell(slot, 'tt-head'));
      });

      // Time row label
      this.gridElement.appendChild(this.createCell('Tasks', 'tt-time'));

      // Time cells
      TIME_SLOTS.forEach((slot) => {
        this.gridElement.appendChild(this.createTimeCell(slot));
      });
    } catch (error) {
      console.error('Timetable render failed:', error);
      this.gridElement.innerHTML = '<p class="error-message">Failed to render timetable</p>';
    }
  }
}

export const timetable = new TimetableManager();
