# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in natural language via chat, Claude AI generates code using tool calls, and components render in a live iframe preview. Runs with or without an Anthropic API key (falls back to a mock provider that returns static components).

## Commands

- **Setup:** `npm run setup` (installs deps, generates Prisma client, runs migrations)
- **Dev server:** `npm run dev` (localhost:3000, uses Turbopack)
- **Build:** `npm run build`
- **Lint:** `npm run lint`
- **Test:** `npm test` (Vitest with jsdom)
- **Run single test:** `npx vitest run path/to/test.ts`
- **DB reset:** `npm run db:reset`

All npm scripts require `NODE_OPTIONS='--require ./node-compat.cjs'` which is already configured in package.json.

## Architecture

### Core Flow
1. User sends prompt → `/api/chat` route streams AI response with tool calls
2. AI tools (`str_replace_editor`, `file_manager`) create/edit files in a **VirtualFileSystem** (in-memory, no disk writes)
3. File system changes trigger preview re-render via React context
4. **JSX Transformer** (Babel standalone) transpiles JSX → JS with import maps for browser module resolution
5. Preview renders in an iframe with error boundary

### Key Modules

- **`src/lib/file-system.ts`** — VirtualFileSystem class: in-memory file tree with CRUD, serialization for DB persistence
- **`src/lib/contexts/file-system-context.tsx`** — React context managing file state and AI tool call execution
- **`src/lib/contexts/chat-context.tsx`** — Wraps Vercel AI SDK `uwhhat`, integrates with file system context
- **`src/lib/transform/jsx-transformer.ts`** — Babel transpilation + import map generation + preview HTML assembly; resolves third-party packages via esm.sh CDN
- **`src/lib/provider.ts`** — Language model factory: real Anthropic client or MockLanguageModel based on env
- **`src/lib/tools/`** — AI tool definitions (`str-replace.ts` for file create/edit, `file-manager.ts` for rename/delete)
- **`src/lib/prompts/generation.tsx`** — System prompt for the AI
- **`src/app/api/chat/route.ts`** — Streaming chat endpoint with tool support, persists state to Prisma

### Data Layer
- **Prisma + SQLite** (`prisma/schema.prisma`): User and Project models
- Projects store serialized messages (JSON) and file system state (JSON)
- Generated Prisma client lives at `src/generated/prisma`
- Auth: JWT (jose) with HttpOnly cookies, bcrypt password hashing
- Server actions in `src/actions/` handle auth and project CRUD

### UI Structure
- **`src/app/main-content.tsx`** — Main layout with resizable panels (chat | editor/preview)
- **`src/components/chat/`** — ChatInterface, MessageList, MessageInput, MarkdownRenderer
- **`src/components/editor/`** — FileTree, CodeEditor (Monaco)
- **`src/components/preview/`** — PreviewFrame (iframe-based live preview)
- **`src/components/auth/`** — SignInForm, SignUpForm, AuthDialog
- **`src/components/ui/`** — shadcn/ui components (New York style, Radix + Tailwind)

## Conventions

- Path alias: `@/*` maps to `./src/*`
- Components use `"use client"` directive when needed; pages/layouts are server components by default
- Tests live in `__tests__/` directories alongside source files
- shadcn/ui config: New York style, neutral base color, CSS variables, lucide icons (`components.json`)
- ESLint extends `next` preset

## Development Best Practices

- Use comments sparingly; only add them where logic isn't self-evident
