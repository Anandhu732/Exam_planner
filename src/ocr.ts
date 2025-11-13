/**
 * OCR Module - Image to text extraction for exam dates
 */

import type { Exam } from './types';
import { state } from './state';
import { generateId, showToast } from './utils';

declare global {
  interface Window {
    Tesseract?: {
      createWorker: () => Promise<TesseractWorker>;
    };
  }
}

interface TesseractWorker {
  loadLanguage(lang: string): Promise<void>;
  initialize(lang: string): Promise<void>;
  recognize(image: File): Promise<{ data: { text: string } }>;
  terminate(): Promise<void>;
}

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

class OCRManager {
  /**
   * Import exams from image file
   */
  async importFromImage(file: File): Promise<void> {
    if (!window.Tesseract) {
      showToast('OCR library not loaded. Check internet connection.', 5000);
      return;
    }

    try {
      showToast('Processing image... This may take a moment.');

      const { createWorker } = window.Tesseract;
      const worker = await createWorker();

      await worker.loadLanguage('eng');
      await worker.initialize('eng');

      const {
        data: { text },
      } = await worker.recognize(file);

      await worker.terminate();

      const count = this.parseAndImportExams(text);

      if (count > 0) {
        showToast(`Successfully imported ${count} exam(s) from image!`);
      } else {
        showToast('No exam dates found in image.', 5000);
      }
    } catch (error) {
      console.error('OCR failed:', error);
      showToast('Failed to process image. Please try again.', 5000);
    }
  }

  /**
   * Parse OCR text and extract exam dates
   */
  private parseAndImportExams(text: string): number {
    let count = 0;
    const lines = text
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);

    // Pattern: day month year (e.g., "15 Jan 2025", "15-Jan-2025", "15/Jan/2025")
    const datePattern =
      /(\b\d{1,2})\s*[-/,.]?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b\s*(\d{4})?/i;

    for (const line of lines) {
      const match = line.match(datePattern);

      if (match) {
        const day = parseInt(match[1], 10);
        const monthKey = match[2].toLowerCase().slice(0, 3);
        const normalizedKey = monthKey === 'sep' ? 'sep' : monthKey;
        const month = MONTH_MAP[normalizedKey];
        const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();

        if (month !== undefined && day >= 1 && day <= 31) {
          const examDate = new Date(year, month, day);

          // Extract title (remove date from line)
          const title = line.replace(match[0], '').trim() || 'Exam';

          const exam: Exam = {
            id: generateId(),
            title,
            date: examDate.toISOString(),
            time: '',
            tag: '#fff5b1',
            notes: '(imported from OCR)',
            createdAt: new Date().toISOString(),
          };

          if (state.addExam(exam)) {
            count++;
          }
        }
      }
    }

    return count;
  }
}

export const ocr = new OCRManager();
