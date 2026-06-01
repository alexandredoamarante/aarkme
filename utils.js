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
export async function compressImage(file, {
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8,
  format = 'image/webp',
  cropToSquare = false,
} = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        let offsetX = 0;
        let offsetY = 0;

        if (cropToSquare) {
          const minDim = Math.min(width, height);
          offsetX = (width - minDim) / 2;
          offsetY = (height - minDim) / 2;
          width = minDim;
          height = minDim;

          if (width > maxWidth) {
            width = maxWidth;
            height = maxWidth;
          }
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
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (cropToSquare) {
          ctx.drawImage(img, offsetX, offsetY, img.width - (offsetX * 2), img.height - (offsetY * 2), 0, 0, width, height);
        } else {
          ctx.drawImage(img, 0, 0, width, height);
        }

        // Try outputting in the requested format, falling back to jpeg if needed
        let dataUrl = canvas.toDataURL(format, quality);
        if (dataUrl.length < 100 && format !== 'image/jpeg') {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression.'));
    };
    reader.onerror = () => reject(new Error('Failed to read file for compression.'));
  });
}

/**
 * Converts a data URL to a Blob object.
 * Useful for bypassing CSP connect-src data: restrictions.
 */
export function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
