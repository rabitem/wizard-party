# Contributing to Wizard Party

Thanks for your interest in contributing!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/wizard-party.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development

Run both the frontend and PartyKit server:

```bash
npm run dev:all
```

Or run them separately:

```bash
npm run dev        # Next.js frontend (port 3000)
npm run dev:party  # PartyKit server (port 1999)
```

## Project Structure

- `src/presentation/` - React components and hooks
- `shared/domain/` - Game entities and rules (shared between client/server)
- `shared/application/` - Use cases and business logic
- `party/server.ts` - PartyKit WebSocket server

## Code Style

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Keep components focused and single-purpose

## Pull Requests

1. Ensure your code builds without errors: `npm run build`
2. Test your changes locally with multiple browser tabs
3. Write a clear PR description explaining what and why
4. Reference any related issues

## Reporting Issues

When reporting bugs, please include:

- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information
- Console errors if applicable
