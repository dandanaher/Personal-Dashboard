import { useEffect, useState } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { generateColoredLogoDataUrl } from '@/utils/faviconUtils';

interface DynamicLogoProps {
  size?: number;
  className?: string;
}

/**
 * Dynamic logo colored with user's theme colors
 * White pixels -> accent color, black pixels -> background color
 */
export function DynamicLogo({ size = 40, className = '' }: DynamicLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string>('');
  const { accentColor, darkMode, stylePreset } = useThemeStore();

  useEffect(() => {
    generateColoredLogoDataUrl(accentColor, darkMode, stylePreset, size).then(setLogoUrl);
  }, [accentColor, darkMode, stylePreset, size]);

  if (!logoUrl) return <div style={{ width: size, height: size }} />;

  return (
    <img
      src={logoUrl}
      alt="MyDash"
      width={size}
      height={size}
      className={className}
    />
  );
}

export default DynamicLogo;
