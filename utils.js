/**
 * aarkme utility functions
 */

/**
 * Escapes HTML special characters to prevent XSS.
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * Normalizes a username to follow the constraint:
 * letters, numbers, underscores, dots, and hyphens only.
 * Length 1-30.
 */
export function normalizeUsername(value) {
  const clean = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 30);
  return clean;
}

/**
 * Debounce function to limit the rate at which a function can fire.
 */
export function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Compresses an image using Canvas API.
 * @param {File|Blob} file
 * @param {Object} options
 * @returns {Promise<string>} Data URL
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    format = 'image/webp',
    cropToSquare = false,
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = img.width;
        let sourceHeight = img.height;

        if (cropToSquare) {
          const size = Math.min(width, height);
          sourceX = (width - size) / 2;
          sourceY = (height - size) / 2;
          sourceWidth = size;
          sourceHeight = size;
          width = Math.min(size, maxWidth);
          height = width;
        } else {
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Use better image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
          img,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, width, height
        );

        // Check if browser supports the requested format, fallback to jpeg
        let finalFormat = format;
        const testCanvas = document.createElement('canvas');
        if (testCanvas.toDataURL(finalFormat).indexOf(`data:${finalFormat}`) !== 0) {
          finalFormat = 'image/jpeg';
        }

        resolve(canvas.toDataURL(finalFormat, quality));
      };
      img.onerror = () => reject(new Error('Failed to load image. The format might be unsupported.'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}
