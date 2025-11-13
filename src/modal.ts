/**
 * Modal Manager - Handle modal dialogs
 */

import { $ } from './utils';

export class Modal {
  private overlay: HTMLElement;
  private closeButtons: HTMLElement[];

  constructor(modalId: string) {
    this.overlay = $(`#${modalId}`);
    this.closeButtons = Array.from(
      this.overlay.querySelectorAll('.modal-close, [id$="Close"]')
    ) as HTMLElement[];

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Close on close button clicks
    this.closeButtons.forEach((btn) => {
      btn.addEventListener('click', () => this.close());
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  open(): void {
    this.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  close(): void {
    this.overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  isOpen(): boolean {
    return this.overlay.classList.contains('active');
  }

  setBody(content: string | HTMLElement): void {
    const body = this.overlay.querySelector('.modal-body');
    if (!body) return;

    if (typeof content === 'string') {
      body.innerHTML = content;
    } else {
      body.innerHTML = '';
      body.appendChild(content);
    }
  }

  setTitle(title: string): void {
    const titleEl = this.overlay.querySelector('.modal-title');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }
}

export function createModal(modalId: string): Modal {
  return new Modal(modalId);
}
