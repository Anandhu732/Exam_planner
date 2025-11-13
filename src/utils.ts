/**
 * Utility Functions
 */

/**
 * Generate a unique ID using crypto API with fallback
 */
export function generateId(): string {
  try {
    const array = new Uint32Array(2);
    crypto.getRandomValues(array);
    return Array.from(array, (num) => num.toString(36)).join('');
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

/**
 * Format a date as ISO string (YYYY-MM-DD)
 * Handles timezone issues by using local date components
 */
export function formatDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new TypeError('Invalid date object');
  }

  // Use local date components to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Extract date string (YYYY-MM-DD) from any date format
 * Handles both ISO strings and Date objects
 */
export function extractDateString(dateInput: string | Date): string {
  if (typeof dateInput === 'string') {
    // If it's already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    // Otherwise parse as ISO string
    const date = new Date(dateInput);
    return formatDate(date);
  }
  return formatDate(dateInput);
}

/**
 * Calculate days between two dates
 */
export function daysBetween(a: Date, b: Date): number {
  if (!(a instanceof Date) || !(b instanceof Date)) {
    throw new TypeError('Both arguments must be Date objects');
  }
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((b.getTime() - a.getTime()) / msPerDay);
}

/**
 * Get the first day of month
 */
export function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the last day of month
 */
export function endOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Validate time format (HH:MM)
 */
export function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

/**
 * Format milliseconds to HH:MM:SS
 */
export function formatTime(ms: number): string {
  const hours = Math.floor(ms / 3.6e6);
  const minutes = Math.floor((ms % 3.6e6) / 6e4);
  const seconds = Math.floor((ms % 6e4) / 1000);

  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string, maxLength?: number): string {
  let sanitized = input.trim().replace(/[<>]/g, '');
  if (maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  return sanitized;
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Safe querySelector with type assertion
 */
export function $(selector: string, root: Document | Element = document): HTMLElement {
  const element = root.querySelector(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  return element as HTMLElement;
}

/**
 * Safe querySelectorAll
 */
export function $$(selector: string, root: Document | Element = document): Element[] {
  return Array.from(root.querySelectorAll(selector));
}

/**
 * Create element with attributes and children
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes?: Record<string, string>,
  children?: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'textContent') {
        element.textContent = value;
      } else {
        element.setAttribute(key, value);
      }
    });
  }

  if (children) {
    children.forEach((child) => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
  }

  return element;
}

/**
 * Show toast notification
 */
export function showToast(message: string, duration = 3000): void {
  const toast = createElement('div', {
    className: 'toast',
    textContent: message,
    role: 'alert',
  });

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, duration);
}

/**
 * Estimate storage size
 */
export function estimateStorageSize(data: unknown): number {
  try {
    const serialized = JSON.stringify(data);
    return new Blob([serialized]).size;
  } catch {
    return 0;
  }
}

/**
 * Check if storage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}
