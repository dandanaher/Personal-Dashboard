import { useEffect, useState, useRef } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { generateColoredLogoDataUrl } from '@/utils/faviconUtils';
import { extractAndRecolorGifFrames, GifFrame } from '@/utils/gifUtils';
import logoDarkModern from '@/assets/logo-darkmode-modern.gif';
import logoDarkRetro from '@/assets/logo-darkmode-retro.gif';
import logoLight from '@/assets/logo-lightmode.gif';

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
  const [frames, setFrames] = useState<GifFrame[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const frameIndexRef = useRef(0);
  const { accentColor, darkMode, stylePreset } = useThemeStore();

  // Load static logo
  useEffect(() => {
    generateColoredLogoDataUrl(accentColor, darkMode, stylePreset, size).then(setLogoUrl);
  }, [accentColor, darkMode, stylePreset, size]);

  // Pre-load and recolor GIF frames based on current theme
  useEffect(() => {
    let gifSrc = logoLight;
    let colorMode: 'light' | 'dark' = 'light';

    if (darkMode) {
      colorMode = 'dark';
      gifSrc = stylePreset === 'retro' ? logoDarkRetro : logoDarkModern;
    }

    extractAndRecolorGifFrames(gifSrc, accentColor, size, colorMode)
      .then(setFrames)
      .catch(err => console.error('Failed to load animated logo:', err));
  }, [accentColor, size, darkMode, stylePreset]);

  const startAnimation = () => {
    if (isPlaying || frames.length === 0) return;
    setIsPlaying(true);
    frameIndexRef.current = 0;
    playNextFrame();
  };

  const playNextFrame = () => {
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
