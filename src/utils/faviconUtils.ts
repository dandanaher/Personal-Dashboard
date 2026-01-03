// Dynamic favicon utility - replaces colors in the base logo to match user theme

// Import the logo directly - Vite handles path resolution in both dev and prod
import logoSrc from '../assets/mydash-logo.png';

// Background colors for theme (style does not affect background color)
// Light mode: #FAF9F4, Dark mode: #313131
const BACKGROUND_COLORS = {
  light: '#FAF9F4',
  dark: '#313131', // rgb(49, 49, 49)
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
  _stylePreset?: 'modern' | 'retro'
): string {
  // Style does not affect background color - only theme (dark/light mode) does
  const mode = darkMode ? 'dark' : 'light';
  return BACKGROUND_COLORS[mode];
}

/**
 * Generate a colored logo data URL for use in components
 * White pixels -> accent color, black pixels -> background color, transparent stays transparent
 */
export async function generateColoredLogoDataUrl(
  accentColor: string,
  darkMode: boolean,
  stylePreset: 'modern' | 'retro',
  size: number = 40
): Promise<string> {
  const img = await loadBaseImage();

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  canvas.width = size;
  canvas.height = size;
  ctx.drawImage(img, 0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  const accentRgb = hexToRgb(accentColor);
  const backgroundColor = getBackgroundColor(darkMode, stylePreset);
  const bgRgb = hexToRgb(backgroundColor);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Transparent pixels stay transparent
    if (a === 0) continue;

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    if (luminance < 0.5) {
      // Dark/black pixels -> background color
      data[i] = bgRgb.r;
      data[i + 1] = bgRgb.g;
      data[i + 2] = bgRgb.b;
    } else {
      // Light/white pixels -> accent color
      data[i] = accentRgb.r;
      data[i + 1] = accentRgb.g;
      data[i + 2] = accentRgb.b;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

export async function updateFavicon(
  accentColor: string,
  darkMode: boolean,
  stylePreset: 'modern' | 'retro'
): Promise<void> {
  try {
    // Generate favicon (32x32) using shared logic
    const faviconDataUrl = await generateColoredLogoDataUrl(accentColor, darkMode, stylePreset, 32);

    // Update the favicon
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      document.head.appendChild(link);
    }
    link.href = faviconDataUrl;

    // Also update apple-touch-icon if it exists
    const appleLink = document.querySelector<HTMLLinkElement>(
      'link[rel="apple-touch-icon"]'
    );
    if (appleLink) {
      // Generate larger version for apple-touch-icon (180x180)
      const appleDataUrl = await generateColoredLogoDataUrl(accentColor, darkMode, stylePreset, 180);
      appleLink.href = appleDataUrl;
    }
  } catch (error) {
    // Silently fail - favicon update is not critical
    console.warn('Failed to update favicon:', error);
  }
}
