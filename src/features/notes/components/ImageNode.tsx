import { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps, NodeResizer, NodeToolbar, useReactFlow } from 'reactflow';
import { Loader2, ImageIcon } from 'lucide-react';
import type { NoteNodeData } from '@/stores/notesStore';
import { useThemeStore } from '@/stores/themeStore';
import { useNotesStore } from '@/stores/notesStore';
import { FloatingToolbar } from './FloatingToolbar';

const ImageNode = memo(function ImageNode({ data, selected }: NodeProps<NoteNodeData>) {
    const accentColor = useThemeStore((state) => state.accentColor);
    const darkMode = useThemeStore((state) => state.darkMode);
    const { updateNoteSize, updateNotePosition, updateNoteColor, deleteNote } = useNotesStore();
    const { fitView } = useReactFlow();

    const { id, content, color } = data;
    const [isHovered, setIsHovered] = useState(false);
    const [showToolbar, setShowToolbar] = useState(false);
    const [aspectRatio, setAspectRatio] = useState<number | null>(null);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const cardBorderColor = color || (darkMode ? '#334155' : '#e2e8f0');

    // Check if content is a loading placeholder
    const isUploading = !content || content === '' || content.startsWith('loading:');
    const imageUrl = isUploading ? null : content;

    // Reset loading state when content changes (new image)
    useEffect(() => {
        if (imageUrl) {
            setImageLoading(true);
            setImageError(false);
        }
    }, [imageUrl]);

    // Hide toolbar when deselected
    useEffect(() => {
        if (!selected) {
            setShowToolbar(false);
        }
    }, [selected]);

    // Calculate aspect ratio when image loads (for NodeResizer aspect ratio lock)
    const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        setImageLoading(false);
        if (img.naturalWidth && img.naturalHeight) {
            const ratio = img.naturalWidth / img.naturalHeight;
            setAspectRatio(ratio);
        }
    }, []);

    const handleImageError = useCallback(() => {
        setImageLoading(false);
        setImageError(true);
    }, []);

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setShowToolbar((prev) => !prev);
    }, []);

    const handleColor = useCallback((newColor: string) => {
        updateNoteColor(id, newColor);
    }, [updateNoteColor, id]);

    const handleFocus = useCallback(() => {
        fitView({ nodes: [{ id }], padding: 0.2, duration: 800 });
    }, [fitView, id]);

    const handleDelete = useCallback(() => {
        if (window.confirm('Are you sure you want to delete this image? This cannot be undone.')) {
            deleteNote(id);
        }
    }, [deleteNote, id]);

    const handleClasses = useMemo(
        () =>
            `!w-8 !h-8 !rounded-full !bg-white dark:!bg-secondary-900 !border !border-solid opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20 ${isHovered ? 'pointer-events-auto' : 'pointer-events-none'
            }`,
        [isHovered]
    );

    const hiddenHandleClasses = useMemo(
        () =>
            '!w-8 !h-8 !rounded-full !bg-white dark:!bg-secondary-900 !border !border-solid opacity-0 pointer-events-none z-10',
        []
    );

    const handleStyle = useMemo(
        () => ({
            borderColor: cardBorderColor,
            borderWidth: 3,
        }),
        [cardBorderColor]
    );

    const handleOffsetStyles = useMemo(
        () => ({
            top: { transform: 'translate(-50%, -50%)' },
            right: { transform: 'translate(50%, -50%)' },
            bottom: { transform: 'translate(-50%, 50%)' },
            left: { transform: 'translate(-50%, -50%)' },
        }),
        []
    );

    // Render loading/error/image content
    const renderContent = () => {
        // Uploading state
        if (isUploading) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-secondary-400 dark:text-secondary-500">
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: accentColor }} />
                    <span className="text-xs">Uploading...</span>
                </div>
            );
        }

        // Error state
        if (imageError) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-secondary-400 dark:text-secondary-500">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-xs">Failed to load</span>
                </div>
            );
        }

        // Image with loading overlay
        return (
            <>
                {imageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-secondary-800/80 z-10 rounded-xl">
                        <Loader2 className="h-6 w-6 animate-spin" style={{ color: accentColor }} />
                    </div>
                )}
                <img
                    ref={imageRef}
                    src={imageUrl!}
                    alt="Canvas image"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    className="w-full h-full object-cover rounded-xl"
                    draggable={false}
                />
            </>
        );
    };

    return (
        <div
            className="group w-full h-full relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <NodeToolbar
                isVisible={showToolbar}
                position={Position.Top}
                offset={10}
                align="center"
                className="z-[9999]"
            >
                <FloatingToolbar
                    onColor={handleColor}
                    onFocus={handleFocus}
                    onDelete={handleDelete}
                    color={color}
                />
            </NodeToolbar>

            <NodeResizer
                isVisible={isHovered || selected}
                minWidth={100}
                minHeight={100}
                keepAspectRatio={aspectRatio !== null}
                onResizeEnd={(_event, params) => {
                    // Save both size and position (position changes when resizing from left/top)
                    updateNoteSize(id, params.width, params.height);
                    updateNotePosition(id, params.x, params.y);
                }}
                lineStyle={{ borderColor: cardBorderColor }}
                handleStyle={{ borderColor: cardBorderColor }}
                lineClassName="opacity-0 group-hover:opacity-100"
                handleClassName="!w-6 !h-6 !bg-white !border !rounded-full opacity-0 group-hover:opacity-100"
            />

            <div
                className="w-full h-full rounded-xl shadow-lg border cursor-pointer bg-white dark:bg-secondary-800 relative overflow-hidden"
                onDoubleClick={handleDoubleClick}
                style={{
                    borderColor: cardBorderColor,
                    boxShadow: selected
                        ? `0 0 0 2px ${accentColor}`
                        : `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)`
                }}
            >
                {/* Color Overlay */}
                {color && (
                    <div
                        className="absolute inset-0 pointer-events-none rounded-xl z-20"
                        style={{ backgroundColor: color, opacity: 0.1 }}
                    />
                )}

                {/* Image content */}
                {renderContent()}
            </div>

            {/* Connection handles (show on hover) */}
            <Handle
                type="source"
                position={Position.Top}
                id="top"
                isConnectableStart
                isConnectableEnd
                className={handleClasses}
                style={{ ...handleStyle, ...handleOffsetStyles.top }}
            />
            <Handle
                type="target"
                position={Position.Top}
                id="top"
                isConnectable={false}
                className={hiddenHandleClasses}
                style={{ ...handleStyle, ...handleOffsetStyles.top }}
            />
            <Handle
                type="source"
                position={Position.Right}
                id="right"
                isConnectableStart
                isConnectableEnd
                className={handleClasses}
                style={{ ...handleStyle, ...handleOffsetStyles.right }}
            />
            <Handle
                type="target"
                position={Position.Right}
                id="right"
                isConnectable={false}
                className={hiddenHandleClasses}
                style={{ ...handleStyle, ...handleOffsetStyles.right }}
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id="bottom"
                isConnectableStart
                isConnectableEnd
                className={handleClasses}
                style={{ ...handleStyle, ...handleOffsetStyles.bottom }}
            />
            <Handle
                type="target"
                position={Position.Bottom}
                id="bottom"
                isConnectable={false}
                className={hiddenHandleClasses}
                style={{ ...handleStyle, ...handleOffsetStyles.bottom }}
            />
            <Handle
                type="source"
                position={Position.Left}
                id="left"
                isConnectableStart
                isConnectableEnd
                className={handleClasses}
                style={{ ...handleStyle, ...handleOffsetStyles.left }}
            />
            <Handle
                type="target"
                position={Position.Left}
                id="left"
                isConnectable={false}
                className={hiddenHandleClasses}
                style={{ ...handleStyle, ...handleOffsetStyles.left }}
            />
        </div>
    );
});

export default ImageNode;
