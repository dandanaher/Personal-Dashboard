import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  EdgeProps,
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
  useReactFlow,
  useViewport,
  useStoreApi,
  Position,
} from 'reactflow';
import type { ReactFlowState } from 'reactflow';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import type { StoreApi } from 'zustand/vanilla';
import { useNotesStore } from '@/stores/notesStore';
import { FloatingToolbar } from './FloatingToolbar';

interface FloatingEdgeData {
  label?: string | null;
  color?: string | null;
}

export default function FloatingEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps<FloatingEdgeData>) {
  const { updateEdge, deleteEdge } = useNotesStore();
  const { zoom, x: viewportX, y: viewportY } = useViewport();
  const store = useStoreApi();
  const storeApi = useMemo<StoreApi<ReactFlowState>>(
    () => ({
      ...store,
      getInitialState: store.getState,
    }),
    [store]
  );
  const domNode = useStoreWithEqualityFn(storeApi, (state) => state.domNode);
  const [showToolbar, setShowToolbar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Calculate edge path with positions adjusted to card boundaries
  // Handles are 32px (16px radius) and positioned outside the card
  // We adjust the connection points inward to connect at the card edge
  const HANDLE_OFFSET = 16;

  const { edgePath, labelX, labelY } = useMemo(() => {
    // Adjust source position based on handle direction
    let adjustedSourceX = sourceX;
    let adjustedSourceY = sourceY;

    switch (sourcePosition) {
      case Position.Top:
        adjustedSourceY += HANDLE_OFFSET;
        break;
      case Position.Bottom:
        adjustedSourceY -= HANDLE_OFFSET;
        break;
      case Position.Left:
        adjustedSourceX += HANDLE_OFFSET;
        break;
      case Position.Right:
        adjustedSourceX -= HANDLE_OFFSET;
        break;
    }

    // Adjust target position based on handle direction
    let adjustedTargetX = targetX;
    let adjustedTargetY = targetY;

    switch (targetPosition) {
      case Position.Top:
        adjustedTargetY += HANDLE_OFFSET;
        break;
      case Position.Bottom:
        adjustedTargetY -= HANDLE_OFFSET;
        break;
      case Position.Left:
        adjustedTargetX += HANDLE_OFFSET;
        break;
      case Position.Right:
        adjustedTargetX -= HANDLE_OFFSET;
        break;
    }

    const [path, labelXPos, labelYPos] = getSmoothStepPath({
      sourceX: adjustedSourceX,
      sourceY: adjustedSourceY,
      sourcePosition,
      targetX: adjustedTargetX,
      targetY: adjustedTargetY,
      targetPosition,
    });

    return { edgePath: path, labelX: labelXPos, labelY: labelYPos };
  }, [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition]);

  const labelScreenPosition = useMemo(
    () => ({
      left: labelX * zoom + viewportX,
      top: labelY * zoom + viewportY,
    }),
    [labelX, labelY, viewportX, viewportY, zoom]
  );

  // Close toolbar when clicking outside
  useEffect(() => {
    if (!showToolbar) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is inside the toolbar
      if (toolbarRef.current && toolbarRef.current.contains(event.target as Node)) {
        return;
      }
      setShowToolbar(false);
    };

    // Use capture phase to ensure we catch the click before propagation stops
    window.addEventListener('mousedown', handleClickOutside, { capture: true });
    return () => {
      window.removeEventListener('mousedown', handleClickOutside, { capture: true });
    };
  }, [showToolbar]);

  const onEdgeDoubleClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    setShowToolbar((prev) => !prev);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setShowToolbar(false);
  };

  const handleColor = (newColor: string) => {
    void updateEdge(id, { color: newColor });
  };

  // Custom focus implementation for edge
  const { setCenter } = useReactFlow();
  const handleFocusEdge = () => {
    const centerX = (sourceX + targetX) / 2;
    const centerY = (sourceY + targetY) / 2;
    setCenter(centerX, centerY, { zoom: 1.5, duration: 800 });
  };

  const handleDelete = () => {
    void deleteEdge(id);
  };

  const handleLabelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (labelInputRef.current) {
      void updateEdge(id, { label: labelInputRef.current.value });
    }
    setIsEditing(false);
  };

  const labelContent = (
    <EdgeLabelRenderer>
      <div
        style={{
          position: 'absolute',
          transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          pointerEvents: 'all',
          zIndex: 1000,
        }}
        className="nodrag nopan"
      >
        {/* Label Display */}
        {data?.label && !isEditing && (
          <div
            className="px-2 py-1 bg-white dark:bg-secondary-800 rounded shadow-md border border-secondary-200 dark:border-secondary-700 text-sm font-semibold text-secondary-700 dark:text-secondary-200 whitespace-nowrap"
            onDoubleClick={onEdgeDoubleClick}
            style={data?.color ? { borderColor: data.color, color: data.color } : {}}
          >
            {data.label}
          </div>
        )}

        {/* Label Editor */}
        {isEditing && (
          <form onSubmit={handleLabelSubmit}>
            <input
              ref={labelInputRef}
              autoFocus
              defaultValue={data?.label || ''}
              className="px-2 py-1 rounded bg-white dark:bg-secondary-800 border border-accent shadow-lg text-sm font-semibold outline-none min-w-[100px]"
              onBlur={() => {
                if (labelInputRef.current) {
                  void updateEdge(id, { label: labelInputRef.current.value });
                }
                setIsEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsEditing(false);
              }}
            />
          </form>
        )}
      </div>
    </EdgeLabelRenderer>
  );

  const toolbarContent = showToolbar ? (
    <div
      style={{
        position: 'absolute',
        left: labelScreenPosition.left,
        top: labelScreenPosition.top,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'all',
        zIndex: 1000,
      }}
      className="nodrag nopan"
    >
      <div
        ref={toolbarRef}
        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-[9999]"
      >
        <FloatingToolbar
          onEdit={handleEdit}
          onColor={handleColor}
          onFocus={handleFocusEdge}
          onDelete={handleDelete}
          color={data?.color ?? undefined}
        />
      </div>
    </div>
  ) : null;

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {/* Invisible interaction path */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={28}
        className="react-flow__edge-interaction"
        onDoubleClick={onEdgeDoubleClick}
        style={{ cursor: 'pointer' }}
      />

      {labelContent}
      {domNode && toolbarContent && createPortal(toolbarContent, domNode)}
    </>
  );
}
