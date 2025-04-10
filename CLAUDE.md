# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- `npm start` - Start the development server
- `npm run build` - Build the production app
- `npm run test` - Run tests
- `npm run test -- --testPathPattern=path/to/test` - Run a specific test
- `npm run dev` - Run the Netlify development environment

## Code Style
- Use functional React components with hooks
- Group imports: React first, then libraries, then relative imports
- Use JSDoc comments for component props and functions
- Follow component structure: constants → subcomponents → main component
- Use Material UI (MUI) for UI components and styling
- Use descriptive variable names in camelCase
- Handle errors gracefully with try/catch blocks
- Organize audio code with classes for complex functionality
- Use ES6+ features like destructuring, arrow functions, and optional chaining
- Keep components focused on a single responsibility