# Cleanup Command

Perform a systematic codebase cleanup following best practices. **Do not change functionality** - only improve code quality, organization, and efficiency.

## Process

### 1. Analysis Phase
- Scan the entire codebase to understand structure and dependencies
- Identify redundant code, unused imports, dead code paths
- Note inefficiencies (bundle size, render performance, duplicate logic)
- Check for inconsistent patterns or naming conventions
- **Run initial build** to establish baseline bundle sizes

### 2. Cleanup Tasks

**Remove Redundancy:**
- Delete unused imports, variables, and functions
- Remove dead code and commented-out code blocks
- Consolidate duplicate logic into shared utilities
- Remove unnecessary dependencies from package.json

**Code Organization:**
- Ensure consistent file/folder structure
- Group related functionality together
- Standardize naming conventions across the codebase
- Order imports consistently (external, internal, relative)

**Performance Improvements (CRITICAL):**
- **Bundle Size Analysis:**
  - Run `npm run build` and analyze chunk sizes
  - Identify chunks over 200KB that could be split
  - Look for large dependencies that could be lazy-loaded

- **Code Splitting with Manual Chunks:**
  - Configure `build.rollupOptions.output.manualChunks` in vite.config.ts
  - Separate vendor libraries into cacheable chunks:
    ```js
    manualChunks: {
      'vendor-react': ['react', 'react-dom', 'react-router-dom'],
      'vendor-state': ['zustand'],
      // Add other heavy dependencies as needed
    }
    ```

- **Lazy Loading:**
  - Ensure all route pages use `React.lazy()` with dynamic imports
  - Heavy components (rich text editors, charts, video players) should be lazy-loaded
  - Use `React.Suspense` with appropriate fallbacks

- **Dependency Optimization:**
  - Check if large libraries have lighter alternatives or tree-shakeable imports
  - For react-player: use `react-player/patterns` for URL detection (2KB) vs full import (1.5MB)
  - Import only what's needed: `import { format } from 'date-fns'` not `import * as dateFns`

- **Asset Optimization:**
  - Check image sizes in `public/` directory
  - Consider WebP format for images over 50KB
  - Ensure images have appropriate dimensions (not oversized)

**Code Quality:**
- Fix linting errors, prioritizing:
  1. `@typescript-eslint/no-floating-promises` - Add `void` operator for intentionally unhandled promises
  2. `@typescript-eslint/no-misused-promises` - Wrap async handlers: `onClick={() => void handleAsync()}`
  3. Type safety issues - Add explicit type annotations for external API responses
- Ensure consistent formatting throughout
- Simplify overly complex functions
- Improve type safety where applicable

### 3. Validation
- Run the build to ensure no breakages: `npm run build`
- **Compare bundle sizes** to baseline - document improvements
- Run linting: `npm run lint` (if available)
- Run tests: `npm test` (if available)
- Run TypeScript check: `npx tsc --noEmit`

### 4. Documentation Updates
- Update README.md if project structure changed
- Update any relevant documentation to reflect changes
- Document any new utilities or patterns introduced

## Constraints
- **Zero functional changes** - the app must behave identically
- Make incremental commits with clear messages
- If unsure about removing something, leave it and note it
- Preserve all comments that explain "why" (remove only obvious/outdated ones)
- **Test after each major change** - don't batch too many changes before validating

## Output
Provide a summary of:
- Files modified/deleted
- **Bundle size changes** (before/after for key chunks)
- Lines of code reduced
- Key improvements made
- Any items flagged for manual review

## Common Patterns to Apply

### Promise Handling
```tsx
// Before (lint error)
useEffect(() => {
  fetchData();
}, []);

// After (correct)
useEffect(() => {
  void fetchData();
}, []);
```

### Async Event Handlers
```tsx
// Before (lint error)
<button onClick={handleAsyncClick}>

// After (correct)
<button onClick={() => void handleAsyncClick()}>
```

### Supabase Query Typing
```tsx
// Before (unsafe any)
const { data } = await supabase.from('table').select('*');
data.forEach(item => /* item is any */);

// After (typed)
const { data } = await supabase.from('table').select('*');
(data as MyType[]).forEach((item: MyType) => /* item is typed */);
```

### Lazy Loading Heavy Components
```tsx
// Before (bundled with page)
import HeavyEditor from './HeavyEditor';

// After (loaded on demand)
const HeavyEditor = lazy(() => import('./HeavyEditor'));
// Use with <Suspense fallback={<Loading />}>
```
