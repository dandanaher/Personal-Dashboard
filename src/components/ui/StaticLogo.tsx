import { useEffect, useState, memo } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { generateColoredLogoDataUrl } from '@/utils/faviconUtils';

interface StaticLogoProps {
  size?: number;
  className?: string;
}

/**
 * Lightweight static logo component
 * Uses the same coloring logic as favicon but doesn't load heavy GIF animations
 */
export const StaticLogo = memo(function StaticLogo({
  size = 40,
  className = '',
}: StaticLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string>('');
  const { accentColor, darkMode, stylePreset } = useThemeStore();

  useEffect(() => {
    let cancelled = false;

    generateColoredLogoDataUrl(accentColor, darkMode, stylePreset, size)
      .then((url) => {
        if (!cancelled) setLogoUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate logo:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [accentColor, darkMode, stylePreset, size]);

  if (!logoUrl) {
    return <div style={{ width: size, height: size }} className={className} />;
  }

  return (
    <img
      src={logoUrl}
      alt="MyDash"
      width={size}
      height={size}
      className={className}
    />
  );
});

export default StaticLogo;
