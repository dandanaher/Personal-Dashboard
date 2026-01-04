import { useEffect, useState, useRef } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { generateColoredLogoDataUrl } from '@/utils/faviconUtils';
import { extractAndRecolorGifFrames, GifFrame } from '@/utils/gifUtils';
import logoDark from '@/assets/logo-dark.gif';
import logoLight from '@/assets/logo-light.gif';
import carouselDark from '@/assets/carousel-dark.gif';
import carouselLight from '@/assets/carousel-light.gif';

interface DynamicLogoProps {
  size?: number;
  className?: string;
}

/**
 * Dynamic logo colored with user's theme colors
 * White pixels -> accent color, black pixels -> background color
 * Plays an animation on hover
 *
 * Both light and dark frame sets are pre-loaded so theme can be switched
 * mid-animation without visual glitches - the animation continues from the
 * same frame, just with the new theme's colors.
 */
export function DynamicLogo({ size = 40, className = '' }: DynamicLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const frameIndexRef = useRef(0);
  const useCarouselNextRef = useRef(false);

  // Track which animation type is currently playing
  const playingAnimationTypeRef = useRef<'logo' | 'carousel' | null>(null);

  // Store frame sets in refs so animation loop can access latest values
  const logoFramesLightRef = useRef<GifFrame[]>([]);
  const logoFramesDarkRef = useRef<GifFrame[]>([]);
  const carouselFramesLightRef = useRef<GifFrame[]>([]);
  const carouselFramesDarkRef = useRef<GifFrame[]>([]);

  const { accentColor, darkMode, stylePreset } = useThemeStore();

  // Keep darkMode in a ref so animation loop can read current value
  // Updated synchronously during render (not in useEffect) to avoid frame delay
  const darkModeRef = useRef(darkMode);
  darkModeRef.current = darkMode;

  // Load static logo
  useEffect(() => {
    void generateColoredLogoDataUrl(accentColor, darkMode, stylePreset, size)
      .then(setLogoUrl)
      .catch((err) => {
        console.error('Failed to generate logo preview:', err);
      });
  }, [accentColor, darkMode, stylePreset, size]);

  // Pre-load and recolor BOTH light and dark logo GIF frames
  useEffect(() => {
    Promise.all([
      extractAndRecolorGifFrames(logoLight, accentColor, size, 'light'),
      extractAndRecolorGifFrames(logoDark, accentColor, size, 'dark'),
    ])
      .then(([lightFrames, darkFrames]) => {
        logoFramesLightRef.current = lightFrames;
        logoFramesDarkRef.current = darkFrames;
      })
      .catch(err => console.error('Failed to load logo animations:', err));
  }, [accentColor, size]);

  // Pre-load and recolor BOTH light and dark carousel GIF frames
  useEffect(() => {
    Promise.all([
      extractAndRecolorGifFrames(carouselLight, accentColor, size, 'light'),
      extractAndRecolorGifFrames(carouselDark, accentColor, size, 'dark'),
    ])
      .then(([lightFrames, darkFrames]) => {
        carouselFramesLightRef.current = lightFrames;
        carouselFramesDarkRef.current = darkFrames;
      })
      .catch(err => console.error('Failed to load carousel animations:', err));
  }, [accentColor, size]);

  // Get the current frame set based on animation type and current dark mode
  const getCurrentFrames = (): GifFrame[] => {
    const animType = playingAnimationTypeRef.current;
    const isDark = darkModeRef.current;

    if (animType === 'carousel') {
      return isDark ? carouselFramesDarkRef.current : carouselFramesLightRef.current;
    }
    return isDark ? logoFramesDarkRef.current : logoFramesLightRef.current;
  };

  const playNextFrame = () => {
    // Dynamically get frames based on current darkMode (allows mid-animation switching)
    const frames = getCurrentFrames();

    if (!canvasRef.current || frameIndexRef.current >= frames.length) {
      setIsPlaying(false);
      playingAnimationTypeRef.current = null;
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const frame = frames[frameIndexRef.current];
    ctx.putImageData(frame.imageData, 0, 0);

    animationRef.current = window.setTimeout(() => {
      frameIndexRef.current++;
      playNextFrame();
    }, frame.delay);
  };

  const startAnimation = () => {
    // Determine which animation type to use
    const useCarousel = useCarouselNextRef.current;
    const framesToCheck = useCarousel
      ? (darkMode ? carouselFramesDarkRef.current : carouselFramesLightRef.current)
      : (darkMode ? logoFramesDarkRef.current : logoFramesLightRef.current);

    if (isPlaying || framesToCheck.length === 0) return;

    // Toggle for next hover
    useCarouselNextRef.current = !useCarouselNextRef.current;

    // Store which animation type is playing
    playingAnimationTypeRef.current = useCarousel ? 'carousel' : 'logo';

    setIsPlaying(true);
    frameIndexRef.current = 0;
    playNextFrame();
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, []);

  if (!logoUrl) return <div style={{ width: size, height: size }} />;

  return (
    <div
      className={`relative inline-block cursor-pointer ${className}`}
      onMouseEnter={startAnimation}
      style={{ width: size, height: size }}
    >
      {/* Static Logo */}
      <img
        src={logoUrl}
        alt="MyDash"
        width={size}
        height={size}
        className={isPlaying ? 'opacity-0' : 'opacity-100'}
        style={{ transition: 'opacity 0.2s' }}
      />

      {/* Animated Canvas */}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className={`absolute top-0 left-0 pointer-events-none ${isPlaying ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}

export default DynamicLogo;
