# Dependencies

## Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.2.0 | Core UI library |
| `react-dom` | ^18.2.0 | React DOM renderer |
| `react-router-dom` | ^6.21.1 | Client-side routing with nested routes and data loading |
| `@supabase/supabase-js` | ^2.39.0 | Supabase client for authentication, database, and storage |
| `zustand` | ^4.4.7 | Lightweight state management with hooks |
| `zundo` | ^2.3.0 | Undo/redo middleware for Zustand (used in notes canvas) |
| `@dnd-kit/core` | ^6.3.1 | Core drag-and-drop functionality for homepage cards |
| `@dnd-kit/sortable` | ^10.0.0 | Sortable preset for drag-and-drop reordering |
| `@dnd-kit/utilities` | ^3.2.2 | Utility functions for @dnd-kit |
| `reactflow` | ^11.11.4 | Canvas-based node graph editor for notes feature |
| `recharts` | ^3.4.1 | Charting library for statistics and visualizations |
| `lucide-react` | ^0.303.0 | Icon library (tree-shakeable SVG icons) |
| `date-fns` | ^3.0.6 | Date manipulation and formatting utilities |
| `@uiw/react-md-editor` | ^4.0.11 | Markdown editor for notes content |
| `browser-image-compression` | ^2.0.2 | Client-side image compression before upload |
| `react-player` | ^3.4.0 | Video/media player (for embedded content) |
| `omggif` | ^1.0.10 | GIF parsing and frame extraction |

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.3.3 | TypeScript compiler |
| `vite` | ^5.0.10 | Build tool and dev server |
| `@vitejs/plugin-react` | ^4.2.1 | React plugin for Vite (Fast Refresh, JSX transform) |
| `vite-plugin-pwa` | ^0.17.4 | PWA support (service worker, manifest generation) |
| `tailwindcss` | ^3.4.0 | Utility-first CSS framework |
| `postcss` | ^8.4.32 | CSS processing tool (required by Tailwind) |
| `autoprefixer` | ^10.4.16 | PostCSS plugin for vendor prefixes |
| `eslint` | ^8.56.0 | JavaScript/TypeScript linter |
| `@typescript-eslint/parser` | ^6.16.0 | TypeScript parser for ESLint |
| `@typescript-eslint/eslint-plugin` | ^6.16.0 | TypeScript-specific ESLint rules |
| `eslint-plugin-react-hooks` | ^4.6.0 | React hooks linting rules |
| `eslint-plugin-react-refresh` | ^0.4.5 | Fast Refresh compatibility lint rules |
| `prettier` | ^3.1.1 | Code formatter |
| `@types/react` | ^18.2.45 | TypeScript definitions for React |
| `@types/react-dom` | ^18.2.18 | TypeScript definitions for ReactDOM |
| `@types/omggif` | ^1.0.5 | TypeScript definitions for omggif |

## Dependency Details

### Core Framework

**React 18** provides:
- Concurrent rendering capabilities
- Automatic batching
- Suspense for data fetching
- useTransition for non-blocking updates

**React Router v6** is used for:
- Declarative routing with `<Routes>` and `<Route>`
- Nested routes with `<Outlet>`
- Protected route patterns
- Lazy loading with `React.lazy()`

### State Management

**Zustand** was chosen over Redux for:
- Minimal boilerplate
- No providers needed
- Direct hook-based access
- Built-in TypeScript support
- Middleware system (persist, devtools)

**Zundo** adds undo/redo to the notes store for canvas operations.

### Drag and Drop

**@dnd-kit** provides accessible drag-and-drop for the homepage card layout:
- Pointer and keyboard sensors for accessibility
- Sortable presets for reordering cards
- Smooth animations during drag operations

### Backend Integration

**Supabase** provides:
- Email/password authentication
- PostgreSQL database with Row Level Security
- Real-time subscriptions (not currently used)
- File storage for images

### Styling

**TailwindCSS** benefits:
- Utility-first approach for rapid development
- Mobile-first responsive design
- Dark mode via class strategy
- Small production bundle (unused classes purged)

### Canvas/Notes

**ReactFlow** enables:
- Draggable node-based interface
- Edge connections between nodes
- Custom node types (note, link, image, group)
- Pan and zoom controls
- Selection and multi-select

### Charts

**Recharts** is used for:
- Habit contribution graphs
- Workout progress charts
- Statistics visualizations

### Media

**@uiw/react-md-editor** provides markdown editing with:
- Preview mode
- Syntax highlighting
- Toolbar customization

**browser-image-compression** reduces image sizes before upload to storage.

**omggif** is used for parsing GIF files and extracting frames for the animated logo feature.

## Version Constraints

- Node.js 18+ required for native fetch and modern ES features
- TypeScript strict mode enabled for type safety
- ESM modules (`"type": "module"` in package.json)

## Upgrade Considerations

### Breaking Changes to Watch

1. **React Router v7** - Currently using v6; v7 has different data loading patterns
2. **ReactFlow v12** - Currently using v11; v12 has API changes for custom nodes
3. **Tailwind v4** - Currently using v3; v4 has configuration changes
4. **Zustand v5** - Currently using v4; v5 may have middleware changes
5. **@dnd-kit/sortable v11** - Currently using v10; check for API changes

### Security Updates

Run `npm audit` periodically and update patch versions:
```bash
npm audit
npm update
```

---

*Last updated: 2026-01-05*
