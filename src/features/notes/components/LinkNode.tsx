import { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps, NodeResizer, NodeToolbar, useReactFlow } from 'reactflow';
import ReactPlayerImport from 'react-player';
import { ExternalLink, Video, Globe, Play } from 'lucide-react';
import type { NoteNodeData } from '@/stores/notesStore';
import { useThemeStore } from '@/stores/themeStore';
import { useNotesStore } from '@/stores/notesStore';
import { FloatingToolbar } from './FloatingToolbar';

// Type workaround for react-player which has incomplete types in v3.x
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactPlayer = ReactPlayerImport as any;

function getYouTubeId(value: string): string | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace('www.', '');

    if (hostname === 'youtu.be') {
      return url.pathname.replace('/', '') || null;
    }

    if (hostname.endsWith('youtube.com') || hostname.endsWith('youtube-nocookie.com')) {
      if (url.pathname === '/watch') {
        return url.searchParams.get('v');
      }
      if (url.pathname.startsWith('/embed/')) {
        return url.pathname.split('/')[2] || null;
      }
      if (url.pathname.startsWith('/shorts/')) {
        return url.pathname.split('/')[2] || null;
      }
      if (url.pathname.startsWith('/live/')) {
        return url.pathname.split('/')[2] || null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

const LinkNode = memo(function LinkNode({ data, selected, dragging }: NodeProps<NoteNodeData>) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const darkMode = useThemeStore((state) => state.darkMode);
  const { updateNoteSize, updateNoteColor, deleteNote } = useNotesStore();
  const { fitView } = useReactFlow();

  const { id, title, content, color } = data;
  const url = content || '';

  const [isHovered, setIsHovered] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [isPlayerActive, setIsPlayerActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const cardBorderColor = color || (darkMode ? '#334155' : '#e2e8f0');

  const youtubeId = useMemo(() => getYouTubeId(url), [url]);
  // Check if react-player can play this URL (fallback to YouTube detection)
  const canPlay = useMemo(
    () => Boolean(url) && (ReactPlayer.canPlay(url) || Boolean(youtubeId)),
    [url, youtubeId]
  );
  const videoThumbnail = useMemo(
    () => (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null),
    [youtubeId]
  );

  // Extract display info from URL
  const urlInfo = useMemo(() => {
    try {
      const urlObj = new URL(url);
      return {
        hostname: urlObj.hostname.replace('www.', ''),
        fullUrl: url.length > 60 ? url.slice(0, 60) + '...' : url,
      };
    } catch {
      return { hostname: 'Link', fullUrl: url };
    }
  }, [url]);

  // Hide toolbar when deselected
  useEffect(() => {
    if (!selected) {
      setShowToolbar(false);
    }
  }, [selected]);

  useEffect(() => {
    setIframeBlocked(false);
    setIsPlayerActive(false);
    setIsPlaying(false);
    setIsResizing(false);
  }, [url]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowToolbar((prev) => !prev);
  }, []);

  const handleColor = useCallback(
    (newColor: string) => {
      updateNoteColor(id, newColor);
    },
    [updateNoteColor, id]
  );

  const handleFocus = useCallback(() => {
    fitView({ nodes: [{ id }], padding: 0.2, duration: 800 });
  }, [fitView, id]);

  const handleDelete = useCallback(() => {
    if (window.confirm('Are you sure you want to delete this link? This cannot be undone.')) {
      deleteNote(id);
    }
  }, [deleteNote, id]);

  const handleOpenLink = useCallback(() => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [url]);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleResizeEnd = useCallback(
    (_event: unknown, params: { width: number; height: number; x: number; y: number }) => {
      setIsResizing(false);
      updateNoteSize(id, params.width, params.height);
    },
    [updateNoteSize, id]
  );

  const handlePlayPreview = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      setIsPlayerActive(true);
      setIsPlaying(true);
    },
    []
  );

  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const href = iframe.contentWindow?.location?.href;
      const body = iframe.contentDocument?.body;
      if (!href || href === 'about:blank' || (body && body.childElementCount === 0)) {
        setIframeBlocked(true);
      }
    } catch {
      // Cross-origin iframe loaded; assume it can render.
    }
  }, []);

  const embedPointerClass = useMemo(
    () => (isResizing || dragging ? 'pointer-events-none' : 'pointer-events-auto'),
    [isResizing, dragging]
  );

  // Doubled hitbox size for handles (was w-4 h-4 = 16px, now w-8 h-8 = 32px)
  const handleClasses = useMemo(
    () =>
      `!w-8 !h-8 !rounded-full !bg-white dark:!bg-secondary-900 !border !border-solid opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20 ${
        isHovered ? 'pointer-events-auto' : 'pointer-events-none'
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
        minWidth={280}
        minHeight={canPlay ? 200 : 120}
        onResizeStart={handleResizeStart}
        onResizeEnd={handleResizeEnd}
        lineStyle={{ borderColor: cardBorderColor }}
        handleStyle={{ borderColor: cardBorderColor }}
        lineClassName="opacity-0 group-hover:opacity-100"
        handleClassName="!w-6 !h-6 !bg-white !border !rounded-full opacity-0 group-hover:opacity-100"
      />

      <div
        className="w-full h-full min-w-[17.5rem] rounded-xl shadow-lg border bg-white dark:bg-secondary-800 relative overflow-hidden flex flex-col"
        onDoubleClick={handleDoubleClick}
        style={{
          borderColor: cardBorderColor,
          boxShadow: selected
            ? `0 0 0 2px ${accentColor}`
            : `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)`,
        }}
      >
        {/* Color Overlay */}
        {color && (
          <div
            className="absolute inset-0 pointer-events-none rounded-xl z-0"
            style={{ backgroundColor: color, opacity: 0.1 }}
          />
        )}

        {/* Header Bar */}
        <div className="px-3 py-2 flex items-center gap-2 border-b border-secondary-200 dark:border-secondary-700 shrink-0 bg-white dark:bg-secondary-800 relative z-10">
          {canPlay ? (
            <Video className="w-4 h-4 text-red-500 shrink-0" />
          ) : (
            <Globe className="w-4 h-4 text-secondary-500 dark:text-secondary-400 shrink-0" />
          )}
          <span className="text-xs font-medium text-secondary-700 dark:text-secondary-300 truncate flex-1">
            {title || urlInfo.hostname}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenLink();
            }}
            className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors shrink-0"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-secondary-500" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 relative overflow-hidden bg-secondary-50 dark:bg-secondary-900/50">
          {canPlay ? (
            // Video preview + player (lazy-load player on click)
            <div className={`absolute inset-0 nodrag nopan ${embedPointerClass}`}>
              {isPlayerActive ? (
                <ReactPlayer
                  key={url}
                  src={url}
                  width="100%"
                  height="100%"
                  playing={isPlaying}
                  controls
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => {
                    setIsPlaying(false);
                    setIsPlayerActive(false);
                  }}
                  onError={() => {
                    setIsPlaying(false);
                    setIsPlayerActive(false);
                  }}
                  config={{
                    youtube: {
                      playerVars: {
                        modestbranding: 1,
                        rel: 0,
                        playsinline: 1,
                      },
                    },
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={handlePlayPreview}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="relative w-full h-full focus:outline-none"
                  aria-label="Play video"
                >
                  {videoThumbnail ? (
                    <img
                      src={videoThumbnail}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                      draggable={false}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-secondary-900/30" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    </div>
                  </div>
                </button>
              )}
            </div>
          ) : !iframeBlocked ? (
            // Try iframe first for webpage preview
            <iframe
              ref={iframeRef}
              src={url}
              title={title || urlInfo.hostname}
              className={`absolute inset-0 w-full h-full border-0 bg-white nodrag nopan ${embedPointerClass}`}
              sandbox="allow-scripts allow-same-origin allow-popups"
              loading="lazy"
              referrerPolicy="no-referrer"
              onLoad={handleIframeLoad}
              onError={() => setIframeBlocked(true)}
            />
          ) : (
            // Fallback when iframe is blocked - simple link display
            <div className="h-full flex flex-col justify-between p-4 nodrag nopan">
              <p className="text-xs text-secondary-600 dark:text-secondary-300 break-all line-clamp-4">
                {urlInfo.fullUrl}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenLink();
                }}
                className="mt-3 inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg bg-secondary-200 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-300 dark:hover:bg-secondary-600 transition-colors self-start"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Connection handles - doubled hitbox size */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        isConnectableStart
        isConnectableEnd
        className={handleClasses}
        style={handleStyle}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        isConnectable={false}
        className={hiddenHandleClasses}
        style={handleStyle}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectableStart
        isConnectableEnd
        className={handleClasses}
        style={handleStyle}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        isConnectable={false}
        className={hiddenHandleClasses}
        style={handleStyle}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectableStart
        isConnectableEnd
        className={handleClasses}
        style={handleStyle}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        isConnectable={false}
        className={hiddenHandleClasses}
        style={handleStyle}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        isConnectableStart
        isConnectableEnd
        className={handleClasses}
        style={handleStyle}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        isConnectable={false}
        className={hiddenHandleClasses}
        style={handleStyle}
      />
    </div>
  );
});

export default LinkNode;
