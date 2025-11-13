/**
 * Exam List Module - Manage exam list and form
 */

import type { Exam } from './types';
import { state } from './state';
import { $, createElement, daysBetween, extractDateString, formatDate, generateId, showToast } from './utils';
import { validateExam, sanitizeExam, displayValidationErrors } from './validation';
import { createModal } from './modal';

class ExamListManager {
  private listElement!: HTMLElement;
  private formElement!: HTMLFormElement;
  private examModal = createModal('examModal');
  private addExamModal = createModal('addExamModal');

  init(): void {
    try {
      this.listElement = $('#examList');
      this.formElement = $('#addForm') as HTMLFormElement;

      this.setupForm();
      this.setupModalHandlers();
      this.render();

      // Subscribe to state changes
      state.subscribe(() => this.render());
    } catch (error) {
      console.error('Exam list initialization failed:', error);
    }
  }

  private setupModalHandlers(): void {
    const deleteBtn = $('#examModalDelete');
    deleteBtn.addEventListener('click', () => {
      const examId = deleteBtn.dataset.examId;
      if (examId && confirm('Delete this exam?')) {
        if (state.deleteExam(examId)) {
          showToast('Exam deleted!');
          this.examModal.close();
        }
      }
    });
  }

  private setupForm(): void {
    // Set default date to today
    const dateInput = $('#date') as HTMLInputElement;
    dateInput.value = new Date().toISOString().slice(0, 10);

    this.formElement.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }

  private handleSubmit(): void {
    try {
      const formData = this.getFormData();
      const sanitized = sanitizeExam(formData);
      const errors = validateExam(sanitized);

      if (errors.length > 0) {
        displayValidationErrors(errors);
        return;
      }

      // Parse the input date and create a proper Date object at noon to avoid timezone issues
      const [year, month, day] = sanitized.date!.split('-').map(Number);
      const examDate = new Date(year, month - 1, day, 12, 0, 0, 0);

      const exam: Exam = {
        id: generateId(),
        title: sanitized.title!,
        date: examDate.toISOString(),
        time: sanitized.time || '',
        tag: sanitized.tag!,
        notes: sanitized.notes || '',
        createdAt: new Date().toISOString(),
      };

      if (state.addExam(exam)) {
        this.formElement.reset();
        const dateInput = $('#date') as HTMLInputElement;
        const today = new Date();
        dateInput.value = formatDate(today);
        showToast('Exam added successfully!');

        // Close the modal
        this.addExamModal.close();
      }
    } catch (error) {
      console.error('Form submission failed:', error);
      showToast('Failed to add exam. Please try again.', 5000);
    }
  }

  private getFormData(): Partial<Exam> {
    return {
      title: ($('#title') as HTMLInputElement).value.trim(),
      date: ($('#date') as HTMLInputElement).value,
      time: ($('#time') as HTMLInputElement).value,
      tag: ($('#tag') as HTMLInputElement).value,
      notes: ($('#notes') as HTMLInputElement).value.trim(),
    };
  }

  private createExamItem(exam: Exam, index: number): HTMLDivElement {
    const item = createElement('div', { className: 'exam-item' });

    // Left content
    const content = createElement('div');

    const title = createElement('div', { className: '' });
    title.style.fontWeight = '800';

    const titleText = document.createTextNode(exam.title + ' ');
    title.appendChild(titleText);

    // Days until exam chip
    const chip = this.createDaysChip(exam);
    title.appendChild(chip);

    const when = new Date(exam.date);
    const metaParts = [
      when.toLocaleDateString(undefined, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    ];

    if (exam.time) metaParts.push(exam.time);
    if (exam.notes) metaParts.push(exam.notes);

    const meta = createElement('div', {
      className: 'small',
      textContent: metaParts.join(' • '),
    });

    content.appendChild(title);
    content.appendChild(meta);

    // Right actions
    const actions = createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = 'var(--spacing-xs)';

    const viewBtn = createElement('button', {
      className: 'btn btn--small',
      textContent: '👁️',
      'aria-label': 'View details',
    });
    viewBtn.addEventListener('click', () => this.handleView(exam));

    const editBtn = createElement('button', {
      className: 'btn btn--small',
      textContent: '✏️',
      'aria-label': 'Edit exam',
    });
    editBtn.addEventListener('click', () => this.handleEdit(exam, index));

    const deleteBtn = createElement('button', {
      className: 'btn btn--small btn--danger',
      textContent: '🗑',
      'aria-label': 'Delete exam',
    });
    deleteBtn.addEventListener('click', () => this.handleDelete(exam.id));

    actions.appendChild(viewBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(content);
    item.appendChild(actions);

    return item;
  }

  private createDaysChip(exam: Exam): HTMLSpanElement {
    const chip = createElement('span', { className: 'tag' });
    chip.style.background = exam.tag;

    const now = new Date();
    const examDate = new Date(exam.date);
    const days = daysBetween(now, examDate);

    if (days === 0) {
      chip.textContent = 'Today!';
    } else if (days < 0) {
      chip.textContent = 'Done';
    } else {
      chip.textContent = `${days}d`;
    }

    return chip;
  }

  private handleView(exam: Exam): void {
    const examDate = new Date(exam.date);
    const now = new Date();
    const daysUntil = daysBetween(now, examDate);

    const content = `
      <div class="detail-list">
        <div class="detail-item">
          <div class="detail-label">Subject</div>
          <div class="detail-value">${exam.title}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Date</div>
          <div class="detail-value">${examDate.toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Time</div>
          <div class="detail-value">${exam.time || 'Not specified'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Days Until</div>
          <div class="detail-value" style="color: var(--accent); font-weight: 900;">
            ${daysUntil === 0 ? 'Today!' : daysUntil < 0 ? 'Completed' : `${daysUntil} days`}
          </div>
        </div>
        ${exam.notes ? `
          <div class="detail-item">
            <div class="detail-label">Notes</div>
            <div class="detail-value">${exam.notes}</div>
          </div>
        ` : ''}
        <div class="detail-item">
          <div class="detail-label">Color Tag</div>
          <div class="detail-value">
            <div style="width: 40px; height: 20px; background: ${exam.tag}; border: 2px solid var(--border); border-radius: var(--radius-sm);"></div>
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Created</div>
          <div class="detail-value">${new Date(exam.createdAt).toLocaleString()}</div>
        </div>
      </div>
    `;

    this.examModal.setTitle(`📚 ${exam.title}`);
    this.examModal.setBody(content);

    const deleteBtn = $('#examModalDelete');
    deleteBtn.dataset.examId = exam.id;

    this.examModal.open();
  }

  private handleEdit(exam: Exam, _index: number): void {
    try {
      // Populate form
      ($('#title') as HTMLInputElement).value = exam.title;
      ($('#date') as HTMLInputElement).value = extractDateString(exam.date);
      ($('#time') as HTMLInputElement).value = exam.time || '';
      ($('#tag') as HTMLInputElement).value = exam.tag;
      ($('#notes') as HTMLInputElement).value = exam.notes || '';

      // Delete from state
      state.deleteExam(exam.id);

      // Focus title for editing
      $('#title').focus();
    } catch (error) {
      console.error('Edit failed:', error);
      showToast('Failed to edit exam.', 5000);
    }
  }

  private handleDelete(id: string): void {
    if (confirm('Delete this exam?')) {
      if (state.deleteExam(id)) {
        showToast('Exam deleted!');
      }
    }
  }

  render(): void {
    try {
      const exams = state.getState().exams;
      this.listElement.innerHTML = '';

      if (exams.length === 0) {
        return;
      }

      // Sort by date
      const sorted = [...exams].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      sorted.forEach((exam, index) => {
        const item = this.createExamItem(exam, index);
        this.listElement.appendChild(item);
      });
    } catch (error) {
      console.error('Exam list render failed:', error);
      this.listElement.innerHTML = '<p class="error-message">Failed to render exam list</p>';
    }
  }
}

export const examList = new ExamListManager();
