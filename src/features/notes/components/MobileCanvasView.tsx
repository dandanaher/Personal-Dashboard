import { ArrowLeft } from 'lucide-react';
import { ReactFlowProvider } from 'reactflow';
import CanvasView from './CanvasView';
import { MobileCanvasProvider } from './MobileCanvasContext';
import { useCanvases } from '../hooks';
import { useThemeStore } from '@/stores/themeStore';
import { LoadingSpinner } from '@/components/ui';

interface MobileCanvasViewProps {
    canvasId: string;
    onClose: () => void;
    onEditNote?: (noteId: string) => void;
}

export function MobileCanvasView({ canvasId, onClose, onEditNote }: MobileCanvasViewProps) {
    const accentColor = useThemeStore((state) => state.accentColor);
    const { canvases, loading } = useCanvases();

    const canvas = canvases.find((c) => c.id === canvasId);

    if (loading) {
        return (
            <div className="fixed inset-0 z-[60] bg-light-bg dark:bg-secondary-900 flex items-center justify-center pt-safe-top pb-safe-bottom">
                <LoadingSpinner size="md" />
            </div>
        );
    }

    if (!canvas) {
        return (
            <div className="fixed inset-0 z-[60] bg-light-bg dark:bg-secondary-900 flex flex-col items-center justify-center pt-safe-top pb-safe-bottom">
                <p className="text-secondary-500 dark:text-secondary-400 mb-4">Canvas not found</p>
                <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                    style={{ backgroundColor: accentColor }}
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] bg-light-bg dark:bg-secondary-900 flex flex-col pt-safe-top pb-0">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white dark:bg-secondary-900 border-b border-secondary-200 dark:border-secondary-800 z-10">
                <button
                    onClick={onClose}
                    className="p-2 -ml-2 rounded-lg text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>

                <h1 className="flex-1 text-lg font-semibold text-secondary-900 dark:text-white truncate">
                    {canvas.name || 'Untitled Canvas'}
                </h1>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative overflow-hidden">
                <MobileCanvasProvider onEditNote={onEditNote}>
                    <ReactFlowProvider>
                        <CanvasView canvasId={canvasId} />
                    </ReactFlowProvider>
                </MobileCanvasProvider>
            </div>
        </div>
    );
}

export default MobileCanvasView;
