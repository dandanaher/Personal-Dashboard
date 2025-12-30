// Dynamic favicon utility - replaces colors in the base logo to match user theme

// Import the logo directly - Vite handles path resolution in both dev and prod
import logoSrc from '../assets/mydash-logo.png';

// Background colors for each theme/style combination
const BACKGROUND_COLORS = {
  modern: {
    light: '#FAF8F5',
    dark: '#212121', // rgb(33, 33, 33)
  },
  retro: {
    light: '#F5F5F5', // rgb(245, 245, 245)
    dark: '#101010', // rgb(16, 16, 16)
  },
};

// Cache the base image and loading promise to avoid race conditions
let cachedBaseImage: HTMLImageElement | null = null;
let loadingPromise: Promise<HTMLImageElement> | null = null;

function loadBaseImage(): Promise<HTMLImageElement> {
  // Return cached image if available
  if (cachedBaseImage && cachedBaseImage.complete && cachedBaseImage.naturalWidth > 0) {
    return Promise.resolve(cachedBaseImage);
  }

  // Return existing loading promise if already loading
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      cachedBaseImage = img;
      loadingPromise = null;
      resolve(img);
    };

    img.onerror = () => {
      loadingPromise = null;
      cachedBaseImage = null;
      reject(new Error(`Failed to load favicon image from ${img.src}`));
    };

    // Use the imported logo path - Vite handles this correctly
    img.src = logoSrc;
  });

  return loadingPromise;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function getBackgroundColor(
  darkMode: boolean,
  stylePreset: 'modern' | 'retro'
): string {
  const mode = darkMode ? 'dark' : 'light';
  return BACKGROUND_COLORS[stylePreset][mode];
}

export async function updateFavicon(
  accentColor: string,
  darkMode: boolean,
  stylePreset: 'modern' | 'retro'
): Promise<void> {
  try {
    const img = await loadBaseImage();

    // Create a canvas to manipulate the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use a reasonable favicon size (32x32 is standard)
    const size = 32;
    canvas.width = size;
    canvas.height = size;

    // Draw the image scaled to favicon size
    ctx.drawImage(img, 0, 0, size, size);

    // Get the pixel data
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    // Get the target colors
    const backgroundColor = getBackgroundColor(darkMode, stylePreset);
    const bgRgb = hexToRgb(backgroundColor);
    const accentRgb = hexToRgb(accentColor);

    // Process each pixel
    // Black pixels (the squares) -> background color
    // White/transparent pixels -> accent color
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Skip fully transparent pixels
      if (a === 0) {
        // Make transparent pixels the accent color
        data[i] = accentRgb.r;
        data[i + 1] = accentRgb.g;
        data[i + 2] = accentRgb.b;
        data[i + 3] = 255;
        continue;
      }

      // Calculate luminance to determine if pixel is dark or light
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      if (luminance < 0.5) {
        // Dark pixel (black squares) -> background color
        data[i] = bgRgb.r;
        data[i + 1] = bgRgb.g;
        data[i + 2] = bgRgb.b;
      } else {
        // Light pixel (white background) -> accent color
        data[i] = accentRgb.r;
        data[i + 1] = accentRgb.g;
        data[i + 2] = accentRgb.b;
      }
    }

    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/png');

    // Update the favicon
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      document.head.appendChild(link);
    }
    link.href = dataUrl;

    // Also update apple-touch-icon if it exists
    const appleLink = document.querySelector<HTMLLinkElement>(
      'link[rel="apple-touch-icon"]'
    );
    if (appleLink) {
      // Create a larger version for apple-touch-icon (180x180)
      const appleCanvas = document.createElement('canvas');
      const appleCtx = appleCanvas.getContext('2d');
      if (appleCtx) {
        const appleSize = 180;
        appleCanvas.width = appleSize;
        appleCanvas.height = appleSize;
        appleCtx.drawImage(img, 0, 0, appleSize, appleSize);

        const appleImageData = appleCtx.getImageData(0, 0, appleSize, appleSize);
        const appleData = appleImageData.data;

        for (let i = 0; i < appleData.length; i += 4) {
          const r = appleData[i];
          const g = appleData[i + 1];
          const b = appleData[i + 2];
          const a = appleData[i + 3];

          if (a === 0) {
            appleData[i] = accentRgb.r;
            appleData[i + 1] = accentRgb.g;
            appleData[i + 2] = accentRgb.b;
            appleData[i + 3] = 255;
            continue;
          }

          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

          if (luminance < 0.5) {
            appleData[i] = bgRgb.r;
            appleData[i + 1] = bgRgb.g;
            appleData[i + 2] = bgRgb.b;
          } else {
            appleData[i] = accentRgb.r;
            appleData[i + 1] = accentRgb.g;
            appleData[i + 2] = accentRgb.b;
          }
        }

        appleCtx.putImageData(appleImageData, 0, 0);
        appleLink.href = appleCanvas.toDataURL('image/png');
      }
    }
  } catch (error) {
    // Silently fail - favicon update is not critical
    console.warn('Failed to update favicon:', error);
  }
}
