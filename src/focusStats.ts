/**
 * Focus Stats Module - Display focus timer statistics
 */

import { $ } from './utils';
import { forest } from './forest';
import { createModal } from './modal';

class FocusStatsManager {
  private modal = createModal('focusModal');

  init(): void {
    try {
      const statsBtn = $('#viewFocusStats');
      statsBtn.addEventListener('click', () => this.showStats());

      const resetBtn = $('#resetForest');
      resetBtn.addEventListener('click', () => {
        forest.reset();
        this.modal.close();
      });
    } catch (error) {
      console.error('Focus stats initialization failed:', error);
    }
  }

  private showStats(): void {
    const stats = forest.getStats();

    this.modal.setTitle('📊 Focus Statistics');

    const content = `
      <div class="stats-grid">
        <div class="stats-card">
          <span class="stats-number">${stats.sessions}</span>
          <span class="stats-label">Completed Sessions</span>
        </div>
        <div class="stats-card">
          <span class="stats-number">${stats.trees}</span>
          <span class="stats-label">Trees Grown</span>
        </div>
        <div class="stats-card">
          <span class="stats-number">${Math.round((stats.sessions * 25) / 60)}h</span>
          <span class="stats-label">Total Focus Time</span>
        </div>
      </div>

      <h4 style="margin-top: var(--spacing-lg); margin-bottom: var(--spacing-sm); font-weight: 800;">
        🌟 Your Motivational Quotes
      </h4>
      <div class="detail-list">
        ${stats.quotes.map((quote, index) => `
          <div class="detail-item" style="grid-template-columns: 40px 1fr;">
            <div class="detail-label">#${index + 1}</div>
            <div class="detail-value">${quote}</div>
          </div>
        `).join('')}
      </div>

      <div class="sticky-note" style="margin-top: var(--spacing-md); display: block;">
        💡 <strong>Tip:</strong> Each completed Pomodoro work session grows a new tree in your forest. Keep focusing to build your forest!
      </div>
    `;

    this.modal.setBody(content);
    this.modal.open();
  }
}

export const focusStats = new FocusStatsManager();
