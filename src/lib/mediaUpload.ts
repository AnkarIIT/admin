/// <reference types="vite/client" />
import { upload } from '@vercel/blob/client';
import { fileToDataUrl, MAX_UPLOAD_BYTES } from './imageUpload';
import type { FileProcessError } from './imageUpload';

let blobConfigured: boolean | null = null;

async function isBlobConfigured(): Promise<boolean> {
  if (blobConfigured !== null) return blobConfigured;
  try {
    const res = await fetch('/api/media/status');
    if (res.ok) {
      const data = await res.json();
      blobConfigured = !!data.enabled;
    } else {
      blobConfigured = false;
    }
  } catch {
    blobConfigured = false;
  }
  return blobConfigured;
}

function csrfHeaders(): Record<string, string> {
  const row = document.cookie.split('; ').find((r) => r.startsWith('csrf_token='));
  if (!row) return {};
  const value = decodeURIComponent(row.split('=')[1]);
  return value ? { 'X-CSRF-Token': value } : {};
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-]+/g, '-').slice(0, 120) || 'upload';
}

// Uploads a file directly to Vercel Blob (bypasses the 4.5MB function body limit).
// Falls back to a base64 data URL when Blob storage is not configured.
export async function uploadFileToStorage(file: File, allowAny = false): Promise<string> {
  if (!allowAny && !file.type.startsWith('image/')) {
    throw new Error('Please choose an image file');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File too large (max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB)`);
  }
  if (!(await isBlobConfigured())) {
    return fileToDataUrl(file, MAX_UPLOAD_BYTES, allowAny);
  }
  const blob = await upload(sanitizeFileName(file.name), file, {
    access: 'public',
    contentType: file.type,
    handleUploadUrl: '/api/media/upload',
    headers: csrfHeaders(),
  });
  return blob.url;
}

// Uploads multiple files concurrently using Promise.allSettled so one bad file does not fail the whole batch.
export async function filesToMediaUrls(
  files: File[],
  opts: { types?: string[] } = {}
): Promise<{ urls: string[]; errors: FileProcessError[] }> {
  const { types } = opts;
  const urls: string[] = [];
  const errors: FileProcessError[] = [];

  const uploadPromises = files.map(async (file) => {
    if (types?.length && !types.some((t) => file.type.startsWith(t))) {
      throw new Error('Unsupported file type');
    }
    const url = await uploadFileToStorage(file);
    return { name: file.name, url };
  });

  const results = await Promise.allSettled(uploadPromises);

  results.forEach((res, index) => {
    const file = files[index];
    if (res.status === 'fulfilled') {
      urls.push(res.value.url);
    } else {
      errors.push({
        fileName: file?.name || file?.type || 'file',
        message: res.reason?.message || 'Upload failed',
      });
    }
  });

  return { urls, errors };
}
