# AI Math Tutor

A Socratic-style AI tutoring web application that guides students (ages 4-18) through math problems using multi-turn conversations, visual problem solving, and persistent progress tracking.

## Features

- **Socratic Dialogue**: Multi-turn conversations that guide students to discover solutions through questions, never direct answers
- **Problem Input**: Text entry and image upload with OCR/Vision parsing
- **Math Rendering**: Beautiful LaTeX rendering using KaTeX
- **Interactive Whiteboard**: Collaborative canvas with Excalidraw for visual explanations and diagrams
- **Progress Tracking**: Persistent skill mastery tracking with evidence-based assessment
- **Versioned Snapshots**: Automatic board snapshots and conversation history

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **State Management**: Zustand (UI) + TanStack Query (server state)
- **API**: tRPC v11 (App Router handlers)
- **Authentication**: NextAuth.js (Auth.js) v5 with Postgres adapter
- **Database**: Neon Postgres + Drizzle ORM
- **UI**: Tailwind CSS + shadcn/ui components
- **AI/LLM**: Vercel AI SDK with OpenAI (text + vision)
- **Whiteboard**: Excalidraw
- **Storage**: Vercel Blob
- **Math**: KaTeX (rendering) + mathjs (validation)

## Prerequisites

- Node.js 18+
- pnpm (package manager)
- Neon Postgres database (or compatible PostgreSQL)
- OpenAI API key
- Vercel Blob account (for file storage)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd ai-math-tutor
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Storage
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"

# NextAuth
NEXTAUTH_SECRET="generate-a-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Environment
NODE_ENV="development"
```

Generate a secure `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

### 4. Set up the database

Generate and run migrations:

```bash
# Generate migration files
pnpm db:generate

# Push schema to database
pnpm db:push

# Or run migrations
pnpm db:migrate
```

Optional: Open Drizzle Studio to view your database:

```bash
pnpm db:studio
```

### 5. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint errors
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm check` - Run linting and type checking
- `pnpm format:write` - Format code with Prettier
- `pnpm format:check` - Check code formatting
- `pnpm db:generate` - Generate Drizzle migration files
- `pnpm db:push` - Push schema changes to database
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Drizzle Studio

## Project Structure

```
/src
  /app                 # Next.js App Router pages
    /(auth)            # Authentication routes
    /tutor             # Main tutoring interface
    /progress          # Progress tracking
  /components           # React components
    /ui                # shadcn/ui components
  /lib                 # Utility functions and helpers
    /ai                # AI prompts and logic
    /math              # Math validation and helpers
    /whiteboard        # Whiteboard utilities
  /server              # Server-side code
    /api               # tRPC routers
    /db                # Database schema and client
    /auth              # NextAuth configuration
  /store               # Zustand stores
  /types               # TypeScript type definitions
  /styles              # Global styles
```

## Key Features in Detail

### Socratic Tutoring

The AI tutor uses a Socratic approach:

- Never gives direct answers
- Asks guiding questions to help students discover solutions
- Provides hints after 2+ turns of being stuck
- Adapts to student understanding level

### Problem Input

- **Text**: Direct text entry for math problems
- **Image Upload**: Screenshot or photo upload with Vision API OCR
- **LaTeX Support**: Automatic LaTeX parsing and rendering

### Progress Tracking

- Skill-based mastery tracking aligned with educational standards
- Evidence collection (conversation turns, board snapshots)
- Persistent progress across sessions

### Whiteboard

- Interactive Excalidraw canvas
- AI annotations and visual explanations
- Auto-save with versioned snapshots
- Single-user with AI collaboration

## Development Notes

- All server code runs on Node.js runtime
- Strict TypeScript (no `any` types)
- Files kept under 350 lines of code
- All inputs validated with Zod
- All mutations are auth-guarded
- Board autosave is throttled for performance

## Deployment

This project is configured for deployment on Vercel:

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

The app will automatically:

- Build on Vercel's infrastructure
- Connect to your Neon database
- Use Vercel Blob for file storage

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]
