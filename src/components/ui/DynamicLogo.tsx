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
 */
export function DynamicLogo({ size = 40, className = '' }: DynamicLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoFrames, setLogoFrames] = useState<GifFrame[]>([]);
  const [carouselFrames, setCarouselFrames] = useState<GifFrame[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const frameIndexRef = useRef(0);
  const useCarouselNextRef = useRef(false);
  const { accentColor, darkMode, stylePreset } = useThemeStore();

  // Load static logo
  useEffect(() => {
    generateColoredLogoDataUrl(accentColor, darkMode, stylePreset, size).then(setLogoUrl);
  }, [accentColor, darkMode, stylePreset, size]);

  // Pre-load and recolor logo GIF frames based on current theme
  useEffect(() => {
    const gifSrc = darkMode ? logoDark : logoLight;
    const colorMode: 'light' | 'dark' = darkMode ? 'dark' : 'light';

    extractAndRecolorGifFrames(gifSrc, accentColor, size, colorMode)
      .then(setLogoFrames)
      .catch(err => console.error('Failed to load animated logo:', err));
  }, [accentColor, size, darkMode]);

  // Pre-load and recolor carousel GIF frames based on current theme only
  useEffect(() => {
    const gifSrc = darkMode ? carouselDark : carouselLight;
    const colorMode: 'light' | 'dark' = darkMode ? 'dark' : 'light';

    extractAndRecolorGifFrames(gifSrc, accentColor, size, colorMode)
      .then(setCarouselFrames)
      .catch(err => console.error('Failed to load carousel animation:', err));
  }, [accentColor, size, darkMode]);

  const activeFramesRef = useRef<GifFrame[]>([]);

  const startAnimation = () => {
    // Determine which frame set to use
    const useCarousel = useCarouselNextRef.current;
    const framesToPlay = useCarousel ? carouselFrames : logoFrames;

    if (isPlaying || framesToPlay.length === 0) return;

    // Toggle for next hover
    useCarouselNextRef.current = !useCarouselNextRef.current;

    // Store active frames for playNextFrame to use
    activeFramesRef.current = framesToPlay;

    setIsPlaying(true);
    frameIndexRef.current = 0;
    playNextFrame();
  };

  const playNextFrame = () => {
    const frames = activeFramesRef.current;
    if (!canvasRef.current || frameIndexRef.current >= frames.length) {
      setIsPlaying(false);
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
