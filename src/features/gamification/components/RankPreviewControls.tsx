import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { getXPForTotalLevel } from '../utils';

interface RankPreviewControlsProps {
  onPreviewChange: (previewXP: number | null) => void;
  currentXP: number;
}

/**
 * Dev tool for previewing different ranks
 * Only visible on desktop (md and up)
 */
export function RankPreviewControls({ onPreviewChange, currentXP }: RankPreviewControlsProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [previewLevel, setPreviewLevel] = useState(1);

  const handleToggle = () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    if (newEnabled) {
      const xp = getXPForTotalLevel(previewLevel);
      onPreviewChange(xp);
    } else {
      onPreviewChange(null);
    }
  };

  const handleLevelChange = (newLevel: number) => {
    setPreviewLevel(newLevel);
    if (isEnabled) {
      const xp = getXPForTotalLevel(newLevel);
      onPreviewChange(xp);
    }
  };

  return (
    <div className="hidden md:block bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
            {isEnabled ? (
              <Eye className="w-5 h-5" />
            ) : (
              <EyeOff className="w-5 h-5" />
            )}
            <span className="font-semibold">Rank Preview Tool</span>
          </div>
          <span className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-200 dark:bg-yellow-800 px-2 py-0.5 rounded">
            DEV ONLY
          </span>
        </div>
        <button
          onClick={handleToggle}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            isEnabled
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
              : 'bg-yellow-200 hover:bg-yellow-300 dark:bg-yellow-800 dark:hover:bg-yellow-700 text-yellow-900 dark:text-yellow-100'
          }`}
        >
          {isEnabled ? 'Disable Preview' : 'Enable Preview'}
        </button>
      </div>

      {isEnabled && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <label className="text-yellow-900 dark:text-yellow-100 font-medium">
                Preview Level: {previewLevel} / 30
              </label>
              <span className="text-yellow-700 dark:text-yellow-300 text-xs">
                {getXPForTotalLevel(previewLevel).toLocaleString()} XP
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={previewLevel}
              onChange={(e) => handleLevelChange(Number(e.target.value))}
              className="w-full h-2 bg-yellow-200 dark:bg-yellow-800 rounded-lg appearance-none cursor-pointer accent-yellow-600"
            />
            <div className="flex justify-between text-xs text-yellow-700 dark:text-yellow-400 mt-1">
              <span>Level 1</span>
              <span>Level 30</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleLevelChange(Math.max(1, previewLevel - 1))}
              className="flex-1 bg-yellow-200 hover:bg-yellow-300 dark:bg-yellow-800 dark:hover:bg-yellow-700 text-yellow-900 dark:text-yellow-100 px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => handleLevelChange(Math.min(30, previewLevel + 1))}
              className="flex-1 bg-yellow-200 hover:bg-yellow-300 dark:bg-yellow-800 dark:hover:bg-yellow-700 text-yellow-900 dark:text-yellow-100 px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              Next →
            </button>
          </div>

          <div className="text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded">
            <p className="font-medium mb-1">Quick Jump:</p>
            <div className="flex flex-wrap gap-1">
              {[1, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30].map((level) => (
                <button
                  key={level}
                  onClick={() => handleLevelChange(level)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    previewLevel === level
                      ? 'bg-yellow-600 text-white'
                      : 'bg-yellow-200 hover:bg-yellow-300 dark:bg-yellow-800 dark:hover:bg-yellow-700 text-yellow-900 dark:text-yellow-100'
                  }`}
                >
                  L{level}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-yellow-700 dark:text-yellow-400">
            Your actual XP: {currentXP.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

export default RankPreviewControls;
