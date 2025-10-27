# Risk Game Clone

A multiplayer Risk board game clone built with Next.js 15, Supabase, and deployed on Vercel.

## Features

- **Real-time multiplayer**: Play with friends online via Supabase Realtime
- **Async multiplayer**: Take turns at your own pace
- **Hot-seat local play**: Pass-and-play on the same device
- **Classic Risk mechanics**: 42 territories, 6 continents, dice-based combat

## Tech Stack

- **Next.js 15**: App Router, Server Components, Server Actions
- **TypeScript**: Type-safe codebase
- **Supabase**: PostgreSQL database + Realtime websockets
- **Tailwind CSS**: Utility-first styling
- **Vercel**: Deployment platform

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to initialize
3. Go to **Project Settings > API**
4. Copy your **Project URL** and **anon/public key**

### 2. Initialize Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase-schema.sql`
4. Paste and **Run** the SQL
5. Verify tables are created in **Table Editor**

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
/app                    # Next.js App Router
  /page.tsx             # Home/Lobby
  /game/[id]/page.tsx   # Game board
  /api/                 # Server Actions
/lib
  /game-engine          # Pure game logic (combat, rules)
  /supabase             # Supabase client
  /stores               # State management
/components
  /game                 # Game UI components
  /ui                   # Reusable UI
/constants              # Map data, territories
/types                  # TypeScript types
```

## Game Rules (MVP)

1. **Setup**: Players join, territories are distributed randomly
2. **Reinforcement**: Receive armies based on territories + continent bonuses
3. **Attack**: Roll dice to attack adjacent territories
4. **Fortify**: Move armies between your territories
5. **Win Condition**: Eliminate all other players

## Deployment

### Deploy to Vercel

```bash
vercel
```

Or connect your GitHub repo to Vercel dashboard.

Add environment variables in **Vercel Project Settings > Environment Variables**.

## Development Status

### ✅ Completed (Architecture-First Phase)

- [x] Next.js 15 project with TypeScript and Tailwind CSS
- [x] Complete database schema with RLS policies
- [x] TypeScript types for all game entities
- [x] Game constants (42 territories, 6 continents, adjacency map)
- [x] Game engine core logic:
  - Dice combat system
  - Reinforcement calculations
  - Move validation (attack, fortify, place armies)
  - Territory connectivity (BFS pathfinding)
- [x] Supabase client with environment config
- [x] Real-time synchronization with Supabase Realtime
- [x] React hooks for game state management
- [x] Lobby system (create/join games)
- [x] Game board UI with real-time updates
- [x] Server Actions for game initialization
- [x] Vercel deployment configuration

### 🚧 Next Steps (Game Mechanics)

- [ ] Complete setup phase (territory claiming)
- [ ] Attack mechanics with dice rolls
- [ ] Fortify/move armies between territories
- [ ] Win condition checking
- [ ] Territory cards system (optional)
- [ ] Visual map component (SVG)
- [ ] Sound effects and animations
- [ ] Game history/replay
- [ ] Spectator mode

## License

MIT
