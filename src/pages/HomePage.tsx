import { useEffect, useMemo, memo, Suspense, useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, LayoutGrid, Check } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/hooks/useProfile';
import { useHomepageStore, type CardId } from '@/stores/homepageStore';
import { useThemeStore } from '@/stores/themeStore';
import { useSidebarStore } from '@/stores/sidebarStore';
import { CARD_REGISTRY } from '@/features/homepage/cardRegistry';
import { CardWrapper } from '@/features/homepage/components/CardWrapper';
import { AddCardModal } from '@/features/homepage/components/AddCardModal';
import { SettingsMenu } from '@/components/layout/SettingsMenu';
import { StaticLogo } from '@/components/ui/StaticLogo';
import { PixelClock } from '@/components/ui/PixelClock';
import { WeatherWidget } from '@/components/ui/WeatherWidget';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Memoized greeting calculation
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Loading fallback for lazy-loaded cards
const CardLoadingFallback = (
  <div className="bg-white dark:bg-secondary-800 rounded-3xl border border-secondary-200 dark:border-secondary-700 p-8 flex items-center justify-center min-h-[120px]">
    <LoadingSpinner />
  </div>
);

// Memoized card grid component
const CardGrid = memo(function CardGrid() {
  const { cards, isEditMode, reorderCards, removeCard } = useHomepageStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const sortedCards = useMemo(
    () => [...cards].sort((a, b) => a.order - b.order),
    [cards]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = sortedCards.findIndex((c) => c.id === active.id);
        const newIndex = sortedCards.findIndex((c) => c.id === over.id);
        reorderCards(arrayMove(sortedCards, oldIndex, newIndex));
      }
    },
    [sortedCards, reorderCards]
  );

  const handleRemoveCard = useCallback(
    (cardId: CardId) => removeCard(cardId),
    [removeCard]
  );

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedCards.map((c) => c.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedCards.map((cardConfig) => {
              const definition = CARD_REGISTRY[cardConfig.id];
              if (!definition) return null;
              const CardComponent = definition.component;

              return (
                <CardWrapper
                  key={cardConfig.id}
                  id={cardConfig.id}
                  size={cardConfig.size}
                  isEditMode={isEditMode}
                  onRemove={handleRemoveCard}
                >
                  <Suspense fallback={CardLoadingFallback}>
                    <CardComponent />
                  </Suspense>
                </CardWrapper>
              );
            })}

            {isEditMode && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="min-h-[120px] rounded-3xl border-2 border-dashed border-secondary-300 dark:border-secondary-600 flex flex-col items-center justify-center gap-2 text-secondary-500 dark:text-secondary-400 hover:border-secondary-400 dark:hover:border-secondary-500 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
              >
                <Plus size={24} />
                <span className="text-sm font-medium">Add Card</span>
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <AddCardModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </>
  );
});

function HomePage() {
  const user = useAuthStore((state) => state.user);
  const { profile, loading: profileLoading } = useProfile();
  const { isEditMode, setEditMode } = useHomepageStore();
  const accentColor = useThemeStore((state) => state.accentColor);
  const { isCollapsed } = useSidebarStore();

  // Scroll to top on mount
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) mainElement.scrollTop = 0;
  }, []);

  const userName = profile?.username || user?.email?.split('@')[0] || 'Traveler';
  const greeting = useMemo(() => getGreeting(), []);

  const handleEditClick = useCallback(() => {
    setEditMode(!isEditMode);
  }, [isEditMode, setEditMode]);

  // Desktop layout positioning
  const desktopClasses = `hidden lg:flex fixed inset-0 ${isCollapsed ? 'lg:left-20' : 'lg:left-64'} transition-all duration-300`;

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <StaticLogo size={40} />
            <div>
              <h1 className="text-xl font-semibold text-secondary-900 dark:text-white whitespace-nowrap">
                {greeting}, {userName}
                {profileLoading && <LoadingSpinner size="sm" className="inline-block ml-2" />}
              </h1>
              <PixelClock pixelSize={4} gap={1} className="mt-2" />
              <WeatherWidget compact className="mt-2" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEditClick}
              title={isEditMode ? 'Finish editing' : 'Edit layout'}
              className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
                isEditMode
                  ? 'text-white'
                  : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800'
              }`}
              style={isEditMode ? { backgroundColor: accentColor } : undefined}
            >
              {isEditMode ? <Check size={18} /> : <LayoutGrid size={18} />}
            </button>
            <SettingsMenu />
          </div>
        </div>

        {/* Day Overview */}
        <div>
          <h2 className="text-base font-bold text-secondary-900 dark:text-white mb-3">
            Day Overview
          </h2>
          <CardGrid />
        </div>
      </div>

      {/* Desktop View - Split Layout */}
      <div className={desktopClasses}>
        {/* Left Panel - Overview */}
        <div className="w-64 flex-shrink-0 h-full border-r border-secondary-200 dark:border-secondary-800 bg-white dark:bg-secondary-900 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-[60px] flex items-center justify-between px-4 border-b border-secondary-200 dark:border-secondary-800 flex-shrink-0">
            <h1 className="text-xl font-bold text-secondary-900 dark:text-white">Home</h1>
            <button
              type="button"
              onClick={handleEditClick}
              title={isEditMode ? 'Finish editing' : 'Edit layout'}
              className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
                isEditMode
                  ? 'text-white'
                  : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800'
              }`}
              style={isEditMode ? { backgroundColor: accentColor } : undefined}
            >
              {isEditMode ? <Check size={18} /> : <LayoutGrid size={18} />}
            </button>
          </div>

          {/* User Info & Clock */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {/* Greeting */}
              <div className="text-center">
                <p className="text-lg font-semibold text-secondary-900 dark:text-white whitespace-nowrap">
                  {greeting}, {userName}
                  {profileLoading && <LoadingSpinner size="sm" className="inline-block ml-2" />}
                </p>
              </div>

              {/* Pixel Clock */}
              <div className="flex justify-center">
                <PixelClock pixelSize={5} gap={2} />
              </div>

              {/* Weather */}
              <WeatherWidget />

              {isEditMode && (
                <div className="p-3 rounded-lg bg-secondary-50 dark:bg-secondary-800 text-sm text-secondary-600 dark:text-secondary-400">
                  <p className="font-medium text-secondary-900 dark:text-white mb-1">
                    Edit Mode
                  </p>
                  <ul className="space-y-1 text-xs">
                    <li>• Drag cards to reorder</li>
                    <li>• Hover to remove cards</li>
                    <li>• Click + to add new cards</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-light-bg dark:bg-secondary-900">
          {/* Header */}
          <div className="h-[60px] flex items-center px-6 border-b border-secondary-200 dark:border-secondary-800 bg-white dark:bg-secondary-900 flex-shrink-0">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Day Overview
            </h2>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <CardGrid />
          </div>
        </div>
      </div>
    </>
  );
}

export default HomePage;
