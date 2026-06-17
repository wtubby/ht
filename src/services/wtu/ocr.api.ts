// @ts-ignore
/* eslint-disable */
import { apiPost } from './client';

/** OCR识别发票 POST /api/ocr (识别永久目录中的已有文件) */
export async function ocrInvoice(data: { filePath: string }, options?: { [key: string]: any }) {
  return apiPost<{
    success: boolean;
    data: API.OcrResult;
    message?: string;
  }>('/api/ocr', data, options);
}
