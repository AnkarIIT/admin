export function fileToDataUrl(file: File, maxBytes = 10 * 1024 * 1024, allowAny = false): Promise<string> {
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
