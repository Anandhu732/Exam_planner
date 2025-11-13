/**
 * Focus Timer Module - Pomodoro and countdown timer
 */

import type { FocusSettings, PomodoroState } from './types';
import { state } from './state';
import { $, createElement, formatTime, throttle } from './utils';

class FocusTimerManager {
  private selectElement!: HTMLSelectElement;
  private modeSelect!: HTMLSelectElement;
  private displayElement!: HTMLElement;
  private cyclesElement!: HTMLElement;

  private timer: number | null = null;
  private targetTime: number | null = null;
  private startTime: number | null = null;
  private totalDuration: number = 0;
  private pomodoroState: PomodoroState;

  // Default settings
  private readonly DEFAULT_SETTINGS = {
    work: 25,
    short: 5,
    long: 15,
    every: 4,
  };

  constructor() {
    this.pomodoroState = {
      work: this.DEFAULT_SETTINGS.work,
      short: this.DEFAULT_SETTINGS.short,
      long: this.DEFAULT_SETTINGS.long,
      every: this.DEFAULT_SETTINGS.every,
      phase: 'work',
      count: 0,
    };
  }

  init(): void {
    try {
      this.selectElement = $('#focusSelect') as HTMLSelectElement;
      this.modeSelect = $('#mode') as HTMLSelectElement;
      this.displayElement = $('#display');
      this.cyclesElement = $('#cycles');

      // Load saved settings or use defaults
      const savedSettings = state.getState().focus;
      if (savedSettings) {
        this.pomodoroState.work = savedSettings.work;
        this.pomodoroState.short = savedSettings.short;
        this.pomodoroState.long = savedSettings.long;
        this.pomodoroState.every = savedSettings.every;
      } else {
        // Apply default settings
        this.pomodoroState.work = this.DEFAULT_SETTINGS.work;
        this.pomodoroState.short = this.DEFAULT_SETTINGS.short;
        this.pomodoroState.long = this.DEFAULT_SETTINGS.long;
        this.pomodoroState.every = this.DEFAULT_SETTINGS.every;
      }

      // Set initial phase to work
      this.pomodoroState.phase = 'work';
      this.modeSelect.value = 'work';

      // Sync settings to UI inputs
      this.syncSettingsToUI();

      this.setupControls();
      this.refreshExamSelect();
      this.renderCycles();

      // Show initial work duration
      this.updateDisplay(this.pomodoroState.work * 60 * 1000);

      // Subscribe to state changes
      state.subscribe(() => this.refreshExamSelect());
    } catch (error) {
      console.error('Focus timer initialization failed:', error);
    }
  }

  private setupControls(): void {
    $('#start').addEventListener('click', () => this.start());
    $('#pause').addEventListener('click', () => this.pause());
    $('#reset').addEventListener('click', () => this.reset());

    // Real-time settings sync
    ['#pWork', '#pShort', '#pLong', '#pEvery'].forEach((id) => {
      const input = $(id) as HTMLInputElement;

      // Update on change
      input.addEventListener('change', () => this.handleSettingsChange());

      // Real-time update on input
      input.addEventListener('input', () => this.handleSettingsInput());
    });

    // Mode selector now controls the current phase
    this.modeSelect.addEventListener('change', () => {
      const phase = this.modeSelect.value as 'work' | 'short' | 'long' | 'verylong';
      this.switchPhase(phase);
    });
  }

  private handleSettingsInput(): void {
    // Real-time preview (don't save yet, just update internal state)
    this.pomodoroState.work = parseInt(($('#pWork') as HTMLInputElement).value) || this.DEFAULT_SETTINGS.work;
    this.pomodoroState.short = parseInt(($('#pShort') as HTMLInputElement).value) || this.DEFAULT_SETTINGS.short;
    this.pomodoroState.long = parseInt(($('#pLong') as HTMLInputElement).value) || this.DEFAULT_SETTINGS.long;
    this.pomodoroState.every = parseInt(($('#pEvery') as HTMLInputElement).value) || this.DEFAULT_SETTINGS.every;

    // Update display if not running
    if (!this.timer) {
      const minutes = this.getCurrentPhaseDuration();
      this.updateDisplay(minutes * 60 * 1000);
    }
  }

  /**
   * Switch to a different phase manually
   */
  private switchPhase(phase: 'work' | 'short' | 'long' | 'verylong'): void {
    // Stop current timer if running
    if (this.timer) {
      this.pause();
    }

    // Update phase
    this.pomodoroState.phase = phase === 'verylong' ? 'long' : phase;

    // Update display with new phase duration
    const minutes = this.getCurrentPhaseDuration(phase === 'verylong' ? 30 : undefined);
    this.updateDisplay(minutes * 60 * 1000);

    // Reset timer state
    this.targetTime = null;
    this.startTime = null;
    this.totalDuration = 0;
  }

  /**
   * Get duration for current phase
   */
  private getCurrentPhaseDuration(override?: number): number {
    if (override) return override;

    const phase = this.pomodoroState.phase;
    return phase === 'work'
      ? this.pomodoroState.work
      : phase === 'short'
      ? this.pomodoroState.short
      : this.pomodoroState.long;
  }

  private handleSettingsChange(): void {
    this.pomodoroState.work = parseInt(($('#pWork') as HTMLInputElement).value) || this.DEFAULT_SETTINGS.work;
    this.pomodoroState.short = parseInt(($('#pShort') as HTMLInputElement).value) || this.DEFAULT_SETTINGS.short;
    this.pomodoroState.long = parseInt(($('#pLong') as HTMLInputElement).value) || this.DEFAULT_SETTINGS.long;
    this.pomodoroState.every = parseInt(($('#pEvery') as HTMLInputElement).value) || this.DEFAULT_SETTINGS.every;

    this.saveSettings();
    this.renderCycles();

    // Update display if not running
    if (!this.timer) {
      const minutes = this.getCurrentPhaseDuration();
      this.updateDisplay(minutes * 60 * 1000);
    }
  }

  /**
   * Sync internal settings to UI inputs
   */
  private syncSettingsToUI(): void {
    ($('#pWork') as HTMLInputElement).value = String(this.pomodoroState.work);
    ($('#pShort') as HTMLInputElement).value = String(this.pomodoroState.short);
    ($('#pLong') as HTMLInputElement).value = String(this.pomodoroState.long);
    ($('#pEvery') as HTMLInputElement).value = String(this.pomodoroState.every);
  }

  private saveSettings(): void {
    const settings: FocusSettings = {
      mode: 'pomodoro', // Always use pomodoro mode now
      work: this.pomodoroState.work,
      short: this.pomodoroState.short,
      long: this.pomodoroState.long,
      every: this.pomodoroState.every,
    };

    state.updateFocusSettings(settings);
  }

  private refreshExamSelect(): void {
    try {
      const upcomingExams = state.getUpcomingExams();

      this.selectElement.innerHTML = '<option value="">— choose exam —</option>';

      upcomingExams.forEach((exam) => {
        const option = document.createElement('option');
        option.value = exam.date;
        option.textContent = `${exam.title} • ${new Date(exam.date).toLocaleString()}`;
        this.selectElement.appendChild(option);
      });
    } catch (error) {
      console.error('Failed to refresh exam select:', error);
    }
  }

  private start(): void {
    if (this.timer) return; // Already running

    // Always start in pomodoro mode with current phase
    this.startPomodoro();
  }

  private startPomodoro(): void {
    if (!this.targetTime) {
      const phase = this.pomodoroState.phase;
      const minutes =
        phase === 'work'
          ? this.pomodoroState.work
          : phase === 'short'
          ? this.pomodoroState.short
          : this.pomodoroState.long;

      this.startTime = Date.now();
      this.totalDuration = minutes * 60 * 1000;
      this.targetTime = this.startTime + this.totalDuration;
    } else {
      // Resuming from pause - adjust start time to account for pause duration
      const remainingTime = this.targetTime - Date.now();
      if (remainingTime > 0) {
        this.startTime = Date.now();
        this.totalDuration = remainingTime;
        this.targetTime = this.startTime + remainingTime;
      }
    }

    this.timer = window.setInterval(() => this.tickPomodoro(), 100);
    this.tickPomodoro();
  }

  private tickPomodoro = throttle(() => {
    if (!this.targetTime || !this.startTime) return;

    const now = Date.now();
    const diff = Math.max(0, this.targetTime - now);
    const elapsed = now - this.startTime;
    const progress = Math.min(1, elapsed / this.totalDuration);

    this.updateDisplay(diff);

    // Update tree animation smoothly during work phase
    if (this.pomodoroState.phase === 'work') {
      this.updateTreeGrowth(progress);
    }

    if (diff <= 0) {
      this.handlePomodoroPhaseComplete();
    }
  }, 100);

  /**
   * Update tree growth based on timer progress
   */
  private updateTreeGrowth(progress: number): void {
    try {
      import('./forest').then((module) => {
        module.forest.updateCurrentTreeGrowth(progress);
      });
    } catch (error) {
      // Silently fail if forest module not available
    }
  }

  private handlePomodoroPhaseComplete(): void {
    this.playNotification();

    // Pause current timer
    this.pause();

    if (this.pomodoroState.phase === 'work') {
      this.pomodoroState.count++;
      this.renderCycles();

      // Complete tree growth and add to forest (smooth transition)
      try {
        import('./forest').then((module) => {
          module.forest.completeCurrentTree();
        });
      } catch (error) {
        console.error('Failed to update forest:', error);
      }

      const isLongBreak = this.pomodoroState.count % this.pomodoroState.every === 0;
      this.pomodoroState.phase = isLongBreak ? 'long' : 'short';
    } else {
      this.pomodoroState.phase = 'work';
    }

    // Sync mode selector to new phase
    this.modeSelect.value = this.pomodoroState.phase;

    // Reset timer state
    this.targetTime = null;
    this.startTime = null;
    this.totalDuration = 0;

    // Set up next phase duration
    const nextPhaseDuration = this.getCurrentPhaseDuration();
    this.updateDisplay(nextPhaseDuration * 60 * 1000);

    // Auto-start next phase
    this.startPomodoro();
  }

  private pause(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private reset(): void {
    this.pause();
    this.targetTime = null;
    this.startTime = null;
    this.totalDuration = 0;
    this.pomodoroState.phase = 'work';
    this.pomodoroState.count = 0;

    // Sync mode selector to work phase
    this.modeSelect.value = 'work';

    // Show work duration
    const minutes = this.pomodoroState.work;
    this.updateDisplay(minutes * 60 * 1000);

    this.renderCycles();

    // Reset growing tree if any
    try {
      import('./forest').then((module) => {
        module.forest.cancelCurrentTree();
      });
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Full reset including settings back to defaults
   */
  resetToDefaults(): void {
    this.reset();

    // Reset to default settings
    this.pomodoroState.work = this.DEFAULT_SETTINGS.work;
    this.pomodoroState.short = this.DEFAULT_SETTINGS.short;
    this.pomodoroState.long = this.DEFAULT_SETTINGS.long;
    this.pomodoroState.every = this.DEFAULT_SETTINGS.every;

    // Sync to UI
    this.syncSettingsToUI();

    // Clear saved settings
    state.updateFocusSettings({
      mode: 'pomodoro',
      work: this.DEFAULT_SETTINGS.work,
      short: this.DEFAULT_SETTINGS.short,
      long: this.DEFAULT_SETTINGS.long,
      every: this.DEFAULT_SETTINGS.every,
    });

    // Reset to work phase
    this.modeSelect.value = 'work';
  }

  private updateDisplay(ms: number): void {
    const formatted = formatTime(ms);
    if (this.displayElement.textContent !== formatted) {
      this.displayElement.textContent = formatted;
    }
  }

  private renderCycles(): void {
    this.cyclesElement.innerHTML = '';
    const total = this.pomodoroState.every;

    for (let i = 0; i < total; i++) {
      const dot = createElement('div', {
        className: `dot${i < this.pomodoroState.count ? ' on' : ''}`,
      });
      this.cyclesElement.appendChild(dot);
    }
  }

  private playNotification(): void {
    // Try to play audio notification
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZQA0PU6rm8atjGgU9k9Pxz4U0Bxt3xPDdkEIKFmS56+mjVBEIQJzh8bllHgU3jtTy0H4xBhxwv/DclkQOD1Cq5/GtYxoDOpHT8c+FNQcecsLw3Y9CCxZhuOvpo1QRCDyb4PK8aR8GM4/T8tGAMgYecr7w3ZVFDg9Rqufxq2IbAz2S0vLPhjQHHnDA8NyPRAoWYbjr6aJTEgg8nODyvGofBjSP0/LRgDIHIG/A8NyRRAsPUarn8KtiGgM+ktLyz4Y0Bx5wwPDcjkQLFmC46+mjUxIIPJvg8bxqHwY0j9Py0YAyByBwv/DckUQLD1Cq5/CsYhoDPpLS8s+GNAcecc3w249EChZiuOvpn1ISCDyb3/K9Zh8GM47T8tGAMwcecrjw3JBFCw9Qqufw');
      audio.play().catch(() => {
        // Ignore if audio fails
      });
    } catch {
      // Fallback notification
    }

    // Browser notification (if permission granted)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Focus Timer', {
        body: 'Timer complete!',
        icon: '/favicon.ico',
      });
    }
  }
}

export const focusTimer = new FocusTimerManager();
