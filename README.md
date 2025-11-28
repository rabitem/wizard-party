# Wizard Party

A real-time multiplayer implementation of the Wizard card game with a 3D interface.

## What It Is

Wizard Party is a browser-based card game where 3-6 players compete across multiple rounds, bidding on how many tricks they'll win and then trying to hit their bid exactly. The game features:

- **Real-time multiplayer** via WebSocket connections using PartyKit
- **3D game table** rendered with React Three Fiber showing cards, player positions, and animations
- **Complete Wizard rules** including the 60-card deck (52 number cards + 4 Wizards + 4 Jesters), trump selection, and the "forbidden bid" rule for the last bidder
- **Bot players** to fill empty seats
- **Social features** including emotes, quick chat, and an undo request system
- **Room system** with public/private rooms and shareable join links

## Tech Stack

- **Frontend**: Next.js 16, React 19, React Three Fiber, Tailwind CSS
- **Backend**: PartyKit (WebSocket server with persistent storage)
- **Architecture**: Clean architecture with shared domain logic between client and server

## Running Locally

```bash
# Install dependencies
npm install

# Run both frontend and PartyKit server
npm run dev:all
```

This starts the Next.js frontend at `http://localhost:3000` and the PartyKit server at `http://localhost:1999`.

## Deployment

The frontend and WebSocket server must be deployed separately:

### 1. Deploy PartyKit Server

```bash
npm run deploy:party
```

This deploys to PartyKit and gives you a URL like `wizard-party.your-username.partykit.dev`.

### 2. Deploy Frontend (Vercel)

1. Push to GitHub
2. Import the repo in Vercel
3. Add environment variable:
   - `NEXT_PUBLIC_PARTYKIT_HOST` = `wizard-party.your-username.partykit.dev`
4. Deploy

## Project Structure

```
src/
  presentation/     # React components, hooks, and 3D scene
  lib/              # Utilities (sounds, player stats)
shared/
  domain/           # Game entities, events, and rules
  application/      # Use cases and business logic
party/
  server.ts         # PartyKit WebSocket server
```
