/**
 * Main Application Entry Point
 */

// Load CSS in optimal order (base -> components -> layout)
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';

import { state } from './state';
import { calendar } from './calendar';
import { examList } from './examList';
import { weeklyTimetable } from './weeklyTimetable';
import { focusTimer } from './focus';
import { forest } from './forest';
import { player } from './player';
import { focusStats } from './focusStats';
import { timerSettings } from './timerSettings';
import { $, showToast } from './utils';

class ExamPlannerApp {
  /**
   * Initialize the application
   */
  init(): void {
    try {
      this.setupGlobalErrorHandler();
      this.initializeModules();
      this.setupResetButton();
      this.requestNotificationPermission();

      // Initialization complete
    } catch (error) {
      console.error('Fatal initialization error:', error);
      this.showFatalError();
    }
  }

  /**
   * Setup global error handler
   */
  private setupGlobalErrorHandler(): void {
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      showToast('An unexpected error occurred. Please refresh the page.', 5000);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      showToast('An unexpected error occurred. Please refresh the page.', 5000);
    });
  }

  /**
   * Initialize all feature modules
   */
  private initializeModules(): void {
    const modules = [
      { name: 'Calendar', init: () => calendar.init() },
      { name: 'Exam List', init: () => examList.init() },
      { name: 'Weekly Timetable', init: () => weeklyTimetable.init() },
      { name: 'Focus Timer', init: () => focusTimer.init() },
      { name: 'Forest Animation', init: () => forest.init() },
      { name: 'Focus Stats', init: () => focusStats.init() },
      { name: 'Timer Settings', init: () => timerSettings.init() },
      { name: 'YouTube Player', init: () => player.init() },
    ];

    modules.forEach(({ name, init }) => {
      try {
        init();
        // Module initialized successfully
      } catch (error) {
        console.error(`✗ ${name} initialization failed:`, error);
      }
    });
  }

  /**
   * Setup reset button
   */
  private setupResetButton(): void {
    try {
      $('#resetBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
          // Clear all state data
          state.clearAll();

          // Reset timer to defaults
          focusTimer.resetToDefaults();

          // Reset forest
          forest.reset();

          showToast('All data cleared and settings reset to defaults', 3000);
        }
      });
    } catch (error) {
      console.error('Failed to setup reset button:', error);
    }
  }

  /**
   * Request notification permission for timer alerts
   */
  private requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(() => {
        // Permission requested
      });
    }
  }

  /**
   * Show fatal error message
   */
  private showFatalError(): void {
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;padding:20px;">
        <div style="max-width:500px;text-align:center;">
          <h1 style="color:#c62828;margin-bottom:16px;">⚠️ Application Error</h1>
          <p style="margin-bottom:24px;">The application failed to initialize. Please refresh the page or clear your browser cache.</p>
          <button onclick="location.reload()" style="padding:12px 24px;font-size:16px;cursor:pointer;">
            Reload Page
          </button>
        </div>
      </div>
    `;
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new ExamPlannerApp();
    app.init();
  });
} else {
  const app = new ExamPlannerApp();
  app.init();
}

// Expose state for debugging in development
declare global {
  interface Window {
    __EXAM_PLANNER_STATE__?: typeof state;
  }
  interface ImportMeta {
    env?: {
      DEV?: boolean;
    };
  }
}

if (import.meta.env?.DEV) {
  window.__EXAM_PLANNER_STATE__ = state;
}
