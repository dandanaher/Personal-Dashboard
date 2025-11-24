import { Minus, Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface QuickAdjustProps {
  weight: number;
  reps: number;
  onAdjustWeight: (delta: number) => void;
  onAdjustReps: (delta: number) => void;
  highlightColor?: string;
  accentColor?: string;
}

export default function QuickAdjust({
  weight,
  reps,
  onAdjustWeight,
  onAdjustReps,
  highlightColor,
  accentColor,
}: QuickAdjustProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Weight adjustment */}
      <div
        className="flex items-center justify-between rounded-full p-2 gap-1"
        style={{ backgroundColor: highlightColor }}
      >
        <button
          onClick={() => onAdjustWeight(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white hover:bg-white/90 active:scale-95 transition-all touch-manipulation"
          style={{ color: accentColor }}
          aria-label="Decrease weight by 1kg"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onAdjustWeight(-0.25)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white hover:bg-white/90 active:scale-95 transition-all touch-manipulation"
          style={{ color: accentColor }}
          aria-label="Decrease weight by 0.25kg"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center px-1 flex-1">
          <div className="text-lg font-bold text-white">{weight}</div>
          <div className="text-xs text-white/70">kg</div>
        </div>
        <button
          onClick={() => onAdjustWeight(0.25)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white hover:bg-white/90 active:scale-95 transition-all touch-manipulation"
          style={{ color: accentColor }}
          aria-label="Increase weight by 0.25kg"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => onAdjustWeight(1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white hover:bg-white/90 active:scale-95 transition-all touch-manipulation"
          style={{ color: accentColor }}
          aria-label="Increase weight by 1kg"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>

      {/* Reps adjustment */}
      <div
        className="flex items-center justify-between rounded-full p-2"
        style={{ backgroundColor: highlightColor }}
      >
        <button
          onClick={() => onAdjustReps(-1)}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-white hover:bg-white/90 active:scale-95 transition-all touch-manipulation"
          style={{ color: accentColor }}
          aria-label="Decrease reps"
        >
          <Minus className="h-5 w-5" />
        </button>
        <div className="text-center px-2">
          <div className="text-lg font-bold text-white">{reps}</div>
          <div className="text-xs text-white/70">reps</div>
        </div>
        <button
          onClick={() => onAdjustReps(1)}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-white hover:bg-white/90 active:scale-95 transition-all touch-manipulation"
          style={{ color: accentColor }}
          aria-label="Increase reps"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
