import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TabType = 'home' | 'canvas' | 'note';

export interface WorkspaceTab {
  /** Unique ID for the tab instance */
  id: string;
  /** Type of content displayed in this tab */
  type: TabType;
  /** Display title for the tab */
  title: string;
  /** ID of the canvas or note being viewed (undefined for 'home') */
  entityId?: string;
}

interface WorkspaceState {
  tabs: WorkspaceTab[];
  activeTabId: string;
}

interface WorkspaceActions {
  /** Add a new tab and make it active */
  addTab: (type: TabType, entityId?: string, title?: string) => string;
  /** Close a tab and switch to another if needed */
  closeTab: (tabId: string) => void;
  /** Set the active tab by ID */
  setActiveTab: (tabId: string) => void;
  /** Update the title of an existing tab */
  updateTabTitle: (tabId: string, newTitle: string) => void;
  /** Check if a tab for a specific entity already exists */
  findTabByEntity: (type: TabType, entityId: string) => WorkspaceTab | undefined;
  /** Reset workspace to initial state */
  resetWorkspace: () => void;
}

type WorkspaceStore = WorkspaceState & WorkspaceActions;

const initialState: WorkspaceState = {
  tabs: [],
  activeTabId: '',
};

function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getDefaultTitle(type: TabType): string {
  switch (type) {
    case 'home':
      return 'Dashboard';
    case 'canvas':
      return 'Untitled Canvas';
    case 'note':
      return 'Untitled Note';
    default:
      return 'Tab';
  }
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addTab: (type: TabType, entityId?: string, title?: string) => {
        const { tabs, findTabByEntity } = get();

        // For entity types, check if tab already exists
        if (entityId && type !== 'home') {
          const existingTab = findTabByEntity(type, entityId);
          if (existingTab) {
            set({ activeTabId: existingTab.id });
            return existingTab.id;
          }
        }

        // For home type, check if home tab exists
        if (type === 'home') {
          const homeTab = tabs.find((t) => t.type === 'home');
          if (homeTab) {
            set({ activeTabId: homeTab.id });
            return homeTab.id;
          }
        }

        const newTab: WorkspaceTab = {
          id: type === 'home' ? 'home' : generateTabId(),
          type,
          title: title || getDefaultTitle(type),
          entityId,
        };

        set({
          tabs: [...tabs, newTab],
          activeTabId: newTab.id,
        });

        return newTab.id;
      },

      closeTab: (tabId: string) => {
        const { tabs, activeTabId } = get();

        // Don't allow closing the last tab
        if (tabs.length <= 1) {
          return;
        }

        const tabIndex = tabs.findIndex((t) => t.id === tabId);
        if (tabIndex === -1) return;

        const newTabs = tabs.filter((t) => t.id !== tabId);

        // If closing the active tab, switch to another tab
        let newActiveTabId = activeTabId;
        if (activeTabId === tabId) {
          // Prefer the tab to the left, otherwise to the right
          const newIndex = tabIndex > 0 ? tabIndex - 1 : 0;
          newActiveTabId = newTabs[newIndex]?.id || newTabs[0]?.id || 'home';
        }

        set({
          tabs: newTabs,
          activeTabId: newActiveTabId,
        });
      },

      setActiveTab: (tabId: string) => {
        const { tabs } = get();
        if (tabs.some((t) => t.id === tabId)) {
          set({ activeTabId: tabId });
        }
      },

      updateTabTitle: (tabId: string, newTitle: string) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, title: newTitle } : tab
          ),
        }));
      },

      findTabByEntity: (type: TabType, entityId: string) => {
        const { tabs } = get();
        return tabs.find((t) => t.type === type && t.entityId === entityId);
      },

      resetWorkspace: () => {
        set(initialState);
      },
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
);

export default useWorkspaceStore;
