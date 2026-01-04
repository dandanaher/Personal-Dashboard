# Best Practices & Conventions

## Code Style

### TypeScript

- **Strict mode enabled** - All TypeScript strict checks are active
- **Explicit types** for function parameters and return values
- **Interface over type** for object shapes that may be extended
- **Type imports** - Use `import type` when importing only types

```typescript
// Good
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Avoid
import { User, supabase } from '@supabase/supabase-js';
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `TaskItem.tsx` |
| Hooks | camelCase with `use` prefix | `useTasks.ts` |
| Stores | camelCase with `Store` suffix | `authStore.ts` |
| Utilities | camelCase | `dateUtils.ts` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_CARDS` |
| Types/Interfaces | PascalCase | `interface TaskState` |

### File Organization

- **One component per file** (with related sub-components allowed)
- **Index files** for barrel exports in feature folders
- **Co-located tests** (when added) next to source files

## Component Patterns

### Functional Components

All components are functional with hooks:

```typescript
function TaskItem({ task, onToggle }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="...">
      {/* content */}
    </div>
  );
}
```

### Component Props

- Define props interface above component
- Destructure props in function signature
- Use optional chaining for optional props

```typescript
interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  className?: string;
}

function TaskItem({ task, onToggle, className }: TaskItemProps) {
  // ...
}
```

### Conditional Rendering

```typescript
// Early returns for loading/error states
if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;

// Inline conditionals for simple cases
return (
  <div>
    {isVisible && <Component />}
    {items.length > 0 ? <List items={items} /> : <EmptyState />}
  </div>
);
```

## State Management

### Zustand Store Pattern

```typescript
interface StoreState {
  // State
  items: Item[];
  loading: boolean;
  error: string | null;
}

interface StoreActions {
  fetchItems: () => Promise<void>;
  addItem: (item: Item) => Promise<void>;
}

type Store = StoreState & StoreActions;

export const useStore = create<Store>()((set, get) => ({
  // Initial state
  items: [],
  loading: false,
  error: null,

  // Actions
  fetchItems: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchFromAPI();
      set({ items: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
}));
```

### Optimistic Updates

Always update UI immediately, then sync with backend:

```typescript
updateItem: async (id, updates) => {
  // 1. Optimistic update
  set((state) => ({
    items: state.items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    ),
  }));

  // 2. Backend sync
  const { error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', id);

  // 3. Revert on error
  if (error) {
    await get().fetchItems(); // Refetch to restore correct state
  }
}
```

### Custom Hooks

Feature hooks encapsulate data fetching:

```typescript
export function useTasks() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchTasks = async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);
      setTasks(data || []);
      setLoading(false);
    };

    fetchTasks();
  }, [user]);

  return { tasks, loading };
}
```

## Styling Conventions

### TailwindCSS

- **Mobile-first** - Start with mobile styles, add responsive prefixes
- **Dark mode** - Use `dark:` prefix for dark mode variants
- **Component variants** - Use conditional class names

```typescript
// Mobile-first responsive design
<div className="px-4 lg:px-8 py-2 lg:py-4">

// Dark mode support
<div className="bg-white dark:bg-secondary-900 text-gray-900 dark:text-white">

// Conditional classes
<button className={`px-4 py-2 rounded ${isActive ? 'bg-primary-500' : 'bg-gray-200'}`}>
```

### CSS Custom Properties

Theme values are defined as CSS variables in `index.css`:

```css
:root {
  /* Theme colors (controlled by theme, not style) */
  --color-light-bg: #FAF9F4;
  --color-secondary-900: 32 32 33;  /* Dark mode background */

  /* Style variables (controlled by style, not theme) */
  --radius-default: 0.5rem;  /* Modern: rounded, Retro: 0 */
  --font-sans: 'Inter', sans-serif;  /* Modern: system, Retro: monospace */
}
```

### Theme vs Style Separation

**Theme** (light/dark) controls colors only:
- Background colors
- Text colors
- Border colors

**Style** (modern/retro) controls visual appearance only:
- Border radius (rounded vs sharp)
- Font family (system vs monospace)

This separation ensures changing style doesn't affect theme and vice versa.

### Instant Theme Switching

To avoid visual lag when toggling themes, use the `switching-theme` class:

```typescript
// In themeStore.ts
toggleDarkMode: () => {
  document.documentElement.classList.add('switching-theme');
  // Apply theme change...
  requestAnimationFrame(() => {
    document.documentElement.classList.remove('switching-theme');
  });
}
```

The CSS disables transitions during the switch:
```css
.switching-theme,
.switching-theme * {
  transition-duration: 0s !important;
}
```

### Tailwind Configuration

Custom values in `tailwind.config.js`:

- **Colors**: `primary`, `secondary`, `accent` palettes
- **Breakpoints**: `xs` (375px) added for small phones
- **Spacing**: Safe area insets for modern devices
- **Min dimensions**: `touch` (44px) for accessibility

## Error Handling

### Component Error Boundaries

The app has a root `ErrorBoundary` component that catches render errors:

```typescript
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### Async Error Handling

```typescript
try {
  const { data, error } = await supabase.from('table').select();
  if (error) throw error;
  // Handle data
} catch (error) {
  console.error('Operation failed:', error);
  set({ error: error instanceof Error ? error.message : 'Unknown error' });
}
```

### User Feedback

- Loading states with spinners
- Error messages in UI
- Toast notifications for actions

## Performance Patterns

### Code Splitting

Feature pages are lazy loaded:

```typescript
const TasksPage = lazy(() => import('@/features/todos/TasksPage'));
```

### Memoization

Use `useMemo` and `useCallback` for expensive operations:

```typescript
const filteredTasks = useMemo(
  () => tasks.filter((t) => t.priority === selectedPriority),
  [tasks, selectedPriority]
);

const handleToggle = useCallback(
  (id: string) => toggleTask(id),
  [toggleTask]
);
```

### Debouncing

Position and size updates are debounced in the notes store:

```typescript
const positionUpdateDebouncer = debounceMap(300);

updateNotePosition: (noteId, x, y) => {
  // Immediate UI update
  set((state) => ({ ... }));

  // Debounced DB update
  positionUpdateDebouncer(noteId, async () => {
    await supabase.from('notes').update({ position_x: x, position_y: y });
  });
}
```

## Testing Approach

(Tests not yet implemented - recommendations for when added)

### Unit Tests

- Test utility functions in isolation
- Test store actions with mock Supabase client
- Test hooks with React Testing Library

### Component Tests

- Render components with necessary providers
- Test user interactions
- Verify state changes

### E2E Tests

- Test critical user flows (auth, CRUD operations)
- Use Playwright or Cypress

## Security Practices

### Authentication

- All API calls require authenticated user
- Protected routes redirect to login
- Session persistence with Supabase

### Data Access

- Row Level Security on all tables
- Users can only access their own data
- Validate user ownership before mutations

### Sensitive Data

- No secrets in client code
- Environment variables for API keys
- `.env` file excluded from git

## Accessibility

### Touch Targets

Minimum 44x44px for interactive elements:

```typescript
<button className="min-h-touch min-w-touch p-3">
```

### Focus Management

- Visible focus indicators
- Logical tab order
- Focus trapping in modals

### Screen Readers

- Semantic HTML elements
- ARIA labels where needed
- Alt text for images

---

*Last updated: 2026-01-04*
