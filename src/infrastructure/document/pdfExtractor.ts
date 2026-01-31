import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  success: boolean;
  error?: string;
}

function isTextItem(item: unknown): item is TextItem {
  return item !== null && typeof item === 'object' && 'str' in item && 'transform' in item;
}

/**
 * Extract text content from a PDF file
 * Preserves structure by detecting line breaks from Y position changes
 */
export async function extractTextFromPDF(file: File): Promise<PDFExtractionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    const pageCount = pdf.numPages;

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Filter to text items and sort by Y position (top to bottom), then X position (left to right)
      const items = textContent.items
        .filter(isTextItem)
        .sort((a, b) => {
          const yDiff = b.transform[5] - a.transform[5]; // Y is inverted in PDF
          if (Math.abs(yDiff) > 5) return yDiff; // Different lines
          return a.transform[4] - b.transform[4]; // Same line, sort by X
        });

      let lastY: number | null = null;
      const lines: string[] = [];
      let currentLine = '';

      for (const item of items) {
        const y = item.transform[5];

        // If Y position changed significantly, start a new line
        if (lastY !== null && Math.abs(y - lastY) > 5) {
          if (currentLine.trim()) {
            lines.push(currentLine.trim());
          }
          currentLine = item.str;
        } else {
          currentLine += (currentLine ? ' ' : '') + item.str;
        }
        lastY = y;
      }

      // Don't forget the last line
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }

      fullText += lines.join('\n') + '\n';
    }

    return {
      text: fullText.trim(),
      pageCount,
      success: true,
    };
  } catch (error) {
    return {
      text: '',
      pageCount: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract PDF text',
    };
  }
}

/**
 * Check if a PDF has extractable text or needs OCR
 */
export async function pdfNeedsOCR(file: File): Promise<boolean> {
  const result = await extractTextFromPDF(file);
  // If we got less than 50 characters, probably needs OCR
  return result.text.replace(/\s/g, '').length < 50;
}
