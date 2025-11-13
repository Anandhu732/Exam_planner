/**
 * Timer Settings Module - Handle timer settings modal
 */

import { $ } from './utils';
import { createModal } from './modal';

class TimerSettingsManager {
  private modal = createModal('timerSettingsModal');

  init(): void {
    try {
      const settingsBtn = $('#timerSettings');
      settingsBtn.addEventListener('click', () => this.openSettings());

      const saveBtn = $('#saveTimerSettings');
      saveBtn.addEventListener('click', () => this.saveSettings());

      const closeBtn = $('#timerSettingsClose');
      closeBtn.addEventListener('click', () => this.modal.close());
    } catch (error) {
      console.error('Timer settings initialization failed:', error);
    }
  }

  private openSettings(): void {
    this.modal.open();
  }

  private saveSettings(): void {
    // Trigger change event on settings inputs to save them
    ['#pWork', '#pShort', '#pLong', '#pEvery'].forEach((id) => {
      const input = $(id) as HTMLInputElement;
      const event = new Event('change', { bubbles: true });
      input.dispatchEvent(event);
    });

    import('./utils').then(({ showToast }) => {
      showToast('Settings saved!', 2000);
    });

    this.modal.close();
  }
}

export const timerSettings = new TimerSettingsManager();
