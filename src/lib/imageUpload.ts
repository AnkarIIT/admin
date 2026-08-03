export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

export function fileToDataUrl(file: File, maxBytes = MAX_UPLOAD_BYTES, allowAny = false): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!allowAny && !file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file'));
      return;
    }
    if (file.size > maxBytes) {
      reject(new Error(`File too large (max ${Math.round(maxBytes / 1024 / 1024)}MB)`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export interface FileProcessError {
  fileName: string;
  message: string;
}

// Converts multiple files independently so one invalid file does not fail the whole batch.
// Returns the successfully converted data URLs plus per-file errors.
export async function filesToDataUrls(
  files: File[],
  opts: { maxBytes?: number; allowAny?: boolean; types?: string[] } = {}
): Promise<{ dataUrls: string[]; errors: FileProcessError[] }> {
  const { maxBytes = MAX_UPLOAD_BYTES, allowAny = false, types } = opts;
  const dataUrls: string[] = [];
  const errors: FileProcessError[] = [];
  for (const file of files) {
    try {
      if (types?.length && !types.some((t) => file.type.startsWith(t))) {
        throw new Error('Unsupported file type');
      }
      dataUrls.push(await fileToDataUrl(file, maxBytes, allowAny));
    } catch (e: any) {
      errors.push({ fileName: file.name || file.type || 'file', message: e.message });
    }
  }
  return { dataUrls, errors };
}
