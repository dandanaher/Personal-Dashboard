# Cleanup Command

Perform a systematic codebase cleanup following best practices. **Do not change functionality** - only improve code quality, organization, and efficiency.

## Process

### 1. Analysis Phase
- Scan the entire codebase to understand structure and dependencies
- Identify redundant code, unused imports, dead code paths
- Note inefficiencies (bundle size, render performance, duplicate logic)
- Check for inconsistent patterns or naming conventions

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

**Performance Improvements:**
- Optimize imports (tree-shaking friendly)
- Identify and fix unnecessary re-renders in React components
- Lazy load components/routes where appropriate
- Optimize asset loading and bundling

**Code Quality:**
- Fix any linting errors or warnings
- Ensure consistent formatting throughout
- Simplify overly complex functions
- Improve type safety where applicable

### 3. Validation
- Run the build to ensure no breakages: `npm run build`
- Run linting: `npm run lint` (if available)
- Run tests: `npm test` (if available)
- Manually verify the app still functions correctly

### 4. Documentation Updates
- Update README.md if project structure changed
- Update any relevant documentation to reflect changes
- Document any new utilities or patterns introduced

## Constraints
- **Zero functional changes** - the app must behave identically
- Make incremental commits with clear messages
- If unsure about removing something, leave it and note it
- Preserve all comments that explain "why" (remove only obvious/outdated ones)

## Output
Provide a summary of:
- Files modified/deleted
- Lines of code reduced
- Key improvements made
- Any items flagged for manual review
