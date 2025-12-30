# Documentation Command

Generate or update comprehensive project documentation in the `/docs` folder at the project root.

## Process

### 1. Codebase Analysis
- Scan the entire project structure and understand its purpose
- Identify all major components, modules, and their relationships
- Review package.json for dependencies and scripts
- Check existing documentation for content to preserve/update

### 2. Documentation Structure

Create/update the following files in `/docs`:

**`/docs/README.md`** - Documentation index
- Links to all documentation files
- Quick navigation guide

**`/docs/OVERVIEW.md`** - Project Overview
- Project purpose and goals
- Key features and functionality
- Target users/audience
- Tech stack summary

**`/docs/ARCHITECTURE.md`** - Architecture & Structure
- Folder structure with descriptions
- Component hierarchy
- Data flow patterns
- State management approach
- API integrations (if any)

**`/docs/SETUP.md`** - Setup & Installation
- Prerequisites
- Installation steps
- Environment variables
- Development server commands
- Build and deployment instructions

**`/docs/DEPENDENCIES.md`** - Dependencies
- List of production dependencies with purpose
- List of dev dependencies with purpose
- Version requirements or constraints
- Upgrade considerations

**`/docs/BEST-PRACTICES.md`** - Best Practices & Conventions
- Code style guidelines
- Naming conventions
- File organization rules
- Component patterns used
- State management patterns
- Error handling approach

**`/docs/TODO.md`** - Project Roadmap & TODO
- Known issues and bugs
- Planned features
- Technical debt items
- Improvement suggestions discovered during analysis

### 3. Documentation Standards

- Use clear, concise language
- Include code examples where helpful
- Add diagrams (mermaid) for complex flows if beneficial
- Keep documentation maintainable (not overly detailed)
- Use relative links between doc files
- Include last-updated dates

### 4. Validation
- Ensure all links work
- Verify accuracy against actual codebase
- Check for consistency across documents

## Output
Provide a summary of:
- Documentation files created/updated
- Key findings about the project
- Any areas needing clarification from maintainers
