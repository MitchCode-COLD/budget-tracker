import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  success: boolean;
  error?: string;
}

export interface OCRProgress {
  status: string;
  progress: number;
}

/**
 * Perform OCR on an image file
 */
export async function performOCR(
  file: File,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  try {
    const result = await Tesseract.recognize(file, 'eng', {
      logger: (m) => {
        if (onProgress && m.status) {
          onProgress({
            status: m.status,
            progress: m.progress || 0,
          });
        }
      },
    });

    return {
      text: result.data.text,
      confidence: result.data.confidence,
      success: true,
    };
  } catch (error) {
    return {
      text: '',
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : 'OCR failed',
    };
  }
}

/**
 * Convert a PDF page to an image for OCR
 * This is used when PDF text extraction fails (scanned documents)
 */
export async function pdfPageToImage(
  file: File,
  pageNumber: number = 1
): Promise<Blob | null> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(pageNumber);

    const scale = 2; // Higher scale = better OCR accuracy
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  } catch {
    return null;
  }
}
