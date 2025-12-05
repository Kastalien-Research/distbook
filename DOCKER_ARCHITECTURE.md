# Srcbook Docker Architecture

## Overview

Srcbook is a **local-first**, TypeScript-powered notebook application that runs entirely on your machine. When deployed in Docker, it provides an isolated, reproducible environment while maintaining full data locality through volume mounts.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HOST MACHINE                                       │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     Docker Container                                 │   │
│   │   ┌───────────────────────────────────────────────────────────────┐ │   │
│   │   │                    Node.js Runtime                            │ │   │
│   │   │   ┌─────────────────────────────────────────────────────────┐ │ │   │
│   │   │   │               Srcbook Application                       │ │ │   │
│   │   │   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │ │ │   │
│   │   │   │  │  Express    │  │  WebSocket  │  │  React SPA      │  │ │ │   │
│   │   │   │  │  HTTP API   │  │  Server     │  │  (Static)       │  │ │ │   │
│   │   │   │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │ │ │   │
│   │   │   │         │                │                  │           │ │ │   │
│   │   │   │         └────────────────┼──────────────────┘           │ │ │   │
│   │   │   │                          │                              │ │ │   │
│   │   │   │                   Port 2150                             │ │ │   │
│   │   │   └──────────────────────────┼──────────────────────────────┘ │ │   │
│   │   │                              │                                │ │   │
│   │   │   ┌─────────────┐   ┌────────┴────────┐   ┌─────────────────┐ │ │   │
│   │   │   │   SQLite    │   │   Code          │   │   TypeScript    │ │ │   │
│   │   │   │   Database  │   │   Execution     │   │   Server        │ │ │   │
│   │   │   │             │   │   (Node/TSX)    │   │   (tsserver)    │ │ │   │
│   │   │   └──────┬──────┘   └─────────────────┘   └─────────────────┘ │ │   │
│   │   │          │                                                    │ │   │
│   │   └──────────┼────────────────────────────────────────────────────┘ │   │
│   │              │                                                      │   │
│   │   ┌──────────▼──────────┐                                           │   │
│   │   │  /root/.srcbook     │  ◄─── Volume Mount                        │   │
│   │   │  (Container Path)   │                                           │   │
│   │   └──────────┬──────────┘                                           │   │
│   └──────────────┼──────────────────────────────────────────────────────┘   │
│                  │                                                           │
│   ┌──────────────▼──────────┐                                               │
│   │  ~/.srcbook             │  (Host Path)                                  │
│   │  ├── srcbook.db         │  SQLite database                              │
│   │  ├── srcbooks/          │  User notebooks                               │
│   │  └── apps/              │  Web applications                             │
│   └─────────────────────────┘                                               │
│                                                                             │
│   Browser ──────────────────► http://localhost:2150                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Package Structure

```
srcbook/
├── packages/
│   ├── api/                 # Backend: Express + WebSocket + Drizzle ORM
│   │   ├── server/
│   │   │   ├── http.mts     # REST API endpoints
│   │   │   └── ws.mts       # WebSocket message handlers
│   │   ├── db/
│   │   │   └── schema.mts   # SQLite schema (Drizzle ORM)
│   │   ├── ai/              # AI integration (Anthropic, OpenAI, etc.)
│   │   ├── srcbook/         # Notebook file management
│   │   ├── apps/            # App builder functionality
│   │   └── tsserver/        # TypeScript language services
│   │
│   ├── web/                 # Frontend: React + Vite + Tailwind
│   │   ├── src/
│   │   │   ├── routes/      # React Router pages
│   │   │   ├── components/  # UI components
│   │   │   └── clients/     # HTTP & WebSocket clients
│   │   └── public/          # Static assets
│   │
│   ├── shared/              # Shared types & utilities
│   │   └── src/
│   │       ├── types/       # TypeScript interfaces
│   │       └── schemas/     # Zod validation schemas
│   │
│   ├── components/          # Reusable React component library
│   │   └── src/
│   │       └── components/  # Radix UI + CodeMirror components
│   │
│   └── configs/             # Shared ESLint configuration
│
├── srcbook/                 # CLI entry point package
│   ├── bin/cli.mts          # CLI commands (start, import)
│   ├── src/
│   │   ├── cli.mts          # Command implementation
│   │   └── server.mts       # Server bootstrap
│   └── public/              # Compiled React app (copied from web)
│
├── Dockerfile               # Container build configuration
├── docker-compose.yml       # Container orchestration
├── turbo.json               # Turborepo build orchestration
└── pnpm-workspace.yaml      # Monorepo workspace definition
```

---

## Docker Container Internals

### Dockerfile Build Process

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Build Pipeline                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Stage 1: Base Setup                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  FROM node:22.7.0-alpine3.20                            │    │
│  │  └── Lightweight Alpine Linux with Node.js 22           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          ▼                                      │
│  Stage 2: Package Manager                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  corepack enable && corepack prepare pnpm@9.12.1        │    │
│  │  └── Deterministic pnpm installation                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          ▼                                      │
│  Stage 3: Copy Source                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  COPY package.json pnpm-lock.yaml pnpm-workspace.yaml   │    │
│  │  COPY packages/ srcbook/ turbo.json                     │    │
│  │  └── All monorepo packages and configuration            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          ▼                                      │
│  Stage 4: Install Dependencies                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  pnpm install                                           │    │
│  │  └── Install all workspace dependencies                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          ▼                                      │
│  Stage 5: Build Application                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  pnpm build (via Turbo)                                 │    │
│  │  ├── Build @srcbook/shared                              │    │
│  │  ├── Build @srcbook/components                          │    │
│  │  ├── Build @srcbook/api                                 │    │
│  │  ├── Build @srcbook/web → copy to srcbook/public        │    │
│  │  └── Build srcbook CLI                                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          ▼                                      │
│  Stage 6: Prepare Volumes                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  mkdir -p /root/.srcbook /root/.npm                     │    │
│  │  └── Create mount points for persistent data            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          ▼                                      │
│  Runtime: Start Server                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  CMD ["pnpm", "start"]                                  │    │
│  │  EXPOSE 2150                                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Docker Compose Configuration

```yaml
version: '3'
services:
  srcbook:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '${HOST_BIND:-127.0.0.1}:2150:2150'    # Configurable host binding
    volumes:
      - type: bind
        source: ~/.srcbook
        target: /root/.srcbook
        bind:
          create_host_path: true               # Auto-create if missing
    environment:
      - NODE_ENV=production
      - HOST=${HOST_BIND:-127.0.0.1}
      - SRCBOOK_INSTALL_DEPS=true
    command: ['pnpm', 'start']
```

---

## Server Architecture

### Request Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           Client (Browser)                                │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  React SPA                                                          │ │
│  │  ├── HTTP Client ──────────────────────► REST API calls             │ │
│  │  └── WebSocket Client ─────────────────► Real-time communication    │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/WS on port 2150
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         Node.js HTTP Server                               │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      Express Application                             │ │
│  │                                                                      │ │
│  │  ┌────────────────────────────────────────────────────────────────┐ │ │
│  │  │  Static File Middleware                                        │ │ │
│  │  │  └── Serves React SPA from /srcbook/public                     │ │ │
│  │  └────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                      │ │
│  │  ┌────────────────────────────────────────────────────────────────┐ │ │
│  │  │  /api Router                                                   │ │ │
│  │  │  ├── POST /api/srcbooks        Create notebook                 │ │ │
│  │  │  ├── POST /api/sessions        Open notebook session           │ │ │
│  │  │  ├── GET  /api/settings        Get configuration               │ │ │
│  │  │  ├── POST /api/apps            Create web app                  │ │ │
│  │  │  ├── POST /api/generate        AI notebook generation          │ │ │
│  │  │  └── ...more endpoints                                         │ │ │
│  │  └────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                      │ │
│  │  ┌────────────────────────────────────────────────────────────────┐ │ │
│  │  │  SPA Fallback                                                  │ │ │
│  │  │  └── GET * → index.html (client-side routing)                  │ │ │
│  │  └────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    WebSocket Server                                  │ │
│  │                                                                      │ │
│  │  Channel: session:<sessionId>                                       │ │
│  │  ├── cell:exec        Execute code cell                             │ │
│  │  ├── cell:update      Update cell content                           │ │
│  │  ├── cell:output      Stream stdout/stderr                          │ │
│  │  ├── deps:install     Install npm packages                          │ │
│  │  ├── tsserver:start   Start TypeScript analysis                     │ │
│  │  └── ai:generate      AI-powered code generation                    │ │
│  │                                                                      │ │
│  │  Channel: app:<appId>                                               │ │
│  │  ├── app:preview      Stream dev server output                      │ │
│  │  └── app:file:updated File change notifications                     │ │
│  │                                                                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Data Persistence Model

### Local-First Storage Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        ~/.srcbook (Host Volume Mount)                       │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────┐    │
│  │  srcbook.db (SQLite Database)                                     │    │
│  │                                                                    │    │
│  │  ┌─────────────────────────────────────────────────────────────┐  │    │
│  │  │  config table                                               │  │    │
│  │  │  ├── baseDir: string          Base directory for srcbooks   │  │    │
│  │  │  ├── defaultLanguage: string  'typescript' | 'javascript'   │  │    │
│  │  │  ├── openaiKey: string        OpenAI API key                │  │    │
│  │  │  ├── anthropicKey: string     Anthropic API key             │  │    │
│  │  │  ├── geminiKey: string        Google AI key                 │  │    │
│  │  │  ├── openrouterKey: string    OpenRouter API key            │  │    │
│  │  │  ├── aiProvider: string       Selected AI provider          │  │    │
│  │  │  ├── aiModel: string          Selected model name           │  │    │
│  │  │  ├── aiBaseUrl: string        Custom API endpoint           │  │    │
│  │  │  └── installId: string        Unique installation ID        │  │    │
│  │  └─────────────────────────────────────────────────────────────┘  │    │
│  │                                                                    │    │
│  │  ┌─────────────────────────────────────────────────────────────┐  │    │
│  │  │  secrets table                                              │  │    │
│  │  │  ├── id: integer              Primary key                   │  │    │
│  │  │  ├── name: string             Secret name (unique)          │  │    │
│  │  │  └── value: string            Secret value                  │  │    │
│  │  └─────────────────────────────────────────────────────────────┘  │    │
│  │                                                                    │    │
│  │  ┌─────────────────────────────────────────────────────────────┐  │    │
│  │  │  secrets_to_sessions table                                  │  │    │
│  │  │  ├── session_id: string       Associated session            │  │    │
│  │  │  └── secret_id: integer       Foreign key to secrets        │  │    │
│  │  └─────────────────────────────────────────────────────────────┘  │    │
│  │                                                                    │    │
│  │  ┌─────────────────────────────────────────────────────────────┐  │    │
│  │  │  apps table                                                 │  │    │
│  │  │  ├── id: integer              Primary key                   │  │    │
│  │  │  ├── name: string             App display name              │  │    │
│  │  │  ├── externalId: string       Directory identifier          │  │    │
│  │  │  ├── history: JSON            Chat/change history           │  │    │
│  │  │  ├── createdAt: timestamp     Creation time                 │  │    │
│  │  │  └── updatedAt: timestamp     Last modification             │  │    │
│  │  └─────────────────────────────────────────────────────────────┘  │    │
│  │                                                                    │    │
│  └───────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────┐    │
│  │  srcbooks/ (Notebook Storage)                                     │    │
│  │                                                                    │    │
│  │  └── {session-id}/                                                │    │
│  │      ├── README.md          Metadata + cell definitions (.src.md) │    │
│  │      ├── package.json       Node.js dependencies                  │    │
│  │      ├── tsconfig.json      TypeScript config (if TS)             │    │
│  │      ├── env.d.ts           Environment type declarations         │    │
│  │      ├── node_modules/      Installed dependencies                │    │
│  │      └── src/               Code cell files                       │    │
│  │          ├── index.ts       Code cells stored as files            │    │
│  │          └── utils.ts                                             │    │
│  │                                                                    │    │
│  └───────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────┐    │
│  │  apps/ (Web Application Storage)                                  │    │
│  │                                                                    │    │
│  │  └── {app-id}/                                                    │    │
│  │      ├── .git/              Git repository for version control    │    │
│  │      ├── package.json       App dependencies                      │    │
│  │      ├── src/               Application source code               │    │
│  │      │   ├── App.tsx                                              │    │
│  │      │   └── main.tsx                                             │    │
│  │      ├── public/            Static assets                         │    │
│  │      └── vite.config.ts     Build configuration                   │    │
│  │                                                                    │    │
│  └───────────────────────────────────────────────────────────────────┘    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Code Execution Model

### Cell Execution Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Code Cell Execution Flow                           │
└──────────────────────────────────────────────────────────────────────────┘

 Client                    WebSocket Server              Execution Layer
   │                             │                             │
   │  cell:exec                  │                             │
   ├────────────────────────────►│                             │
   │  {cellId, sessionId}        │                             │
   │                             │                             │
   │                             │  Validate session           │
   │                             │  Load secrets               │
   │                             │  Check dependencies         │
   │                             │                             │
   │  cell:updated               │                             │
   │◄────────────────────────────┤                             │
   │  {status: 'running'}        │                             │
   │                             │                             │
   │                             │  spawn('node'/'tsx')        │
   │                             ├────────────────────────────►│
   │                             │                             │
   │                             │              stdout/stderr  │
   │                             │◄────────────────────────────┤
   │  cell:output                │                             │
   │◄────────────────────────────┤                             │
   │  {type: 'stdout', data}     │                             │
   │                             │                             │
   │  cell:output                │                             │
   │◄────────────────────────────┤                             │
   │  {type: 'stderr', data}     │                             │
   │                             │                             │
   │                             │              process exit   │
   │                             │◄────────────────────────────┤
   │  cell:updated               │                             │
   │◄────────────────────────────┤                             │
   │  {status: 'idle'}           │                             │
   │                             │                             │

Execution Commands:
┌─────────────────────────────────────────────────────────────┐
│  JavaScript:  node {session-dir}/src/{filename}.mjs         │
│  TypeScript:  tsx {session-dir}/src/{filename}.ts           │
└─────────────────────────────────────────────────────────────┘
```

---

## TypeScript Language Services

### TSServer Integration

```
┌────────────────────────────────────────────────────────────────────────────┐
│                      TypeScript Server Architecture                         │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────┐         ┌─────────────────────────────────────┐  │
│  │   Browser Client    │         │         Node.js Server              │  │
│  │                     │         │                                     │  │
│  │  ┌───────────────┐  │         │  ┌───────────────────────────────┐  │  │
│  │  │  CodeMirror   │  │   WS    │  │       WebSocket Handler       │  │  │
│  │  │    Editor     │──┼────────►│──│                               │  │  │
│  │  │               │  │         │  │  tsserver:start               │  │  │
│  │  │  ┌─────────┐  │  │         │  │  tsserver:cell:quickinfo      │  │  │
│  │  │  │ Hover   │  │  │         │  │  tsserver:cell:completions    │  │  │
│  │  │  │ Info    │  │  │         │  │  tsserver:cell:definition     │  │  │
│  │  │  └─────────┘  │  │         │  │                               │  │  │
│  │  │               │  │         │  └───────────────┬───────────────┘  │  │
│  │  │  ┌─────────┐  │  │         │                  │                  │  │
│  │  │  │ Auto-   │  │  │         │                  ▼                  │  │
│  │  │  │complete │  │  │         │  ┌───────────────────────────────┐  │  │
│  │  │  └─────────┘  │  │         │  │     TSServer Manager          │  │  │
│  │  │               │  │         │  │                               │  │  │
│  │  │  ┌─────────┐  │  │         │  │  ┌─────────────────────────┐  │  │  │
│  │  │  │ Error   │  │  │◄────────│──│  │  Per-Session TSServer   │  │  │  │
│  │  │  │ Markers │  │  │  Diags  │  │  │                         │  │  │  │
│  │  │  └─────────┘  │  │         │  │  │  - Semantic diagnostics │  │  │  │
│  │  └───────────────┘  │         │  │  │  - Suggestion hints     │  │  │  │
│  │                     │         │  │  │  - Quick info (hover)   │  │  │  │
│  └─────────────────────┘         │  │  │  - Go to definition     │  │  │  │
│                                  │  │  │  - Completions          │  │  │  │
│                                  │  │  └─────────────────────────┘  │  │  │
│                                  │  │                               │  │  │
│                                  │  │  Uses tsconfig.json from      │  │  │
│                                  │  │  each srcbook directory       │  │  │
│                                  │  └───────────────────────────────┘  │  │
│                                  │                                     │  │
│                                  └─────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Network Architecture in Docker

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         Network Configuration                               │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Default Configuration (Localhost Only)                                    │
│  ═══════════════════════════════════════                                   │
│                                                                            │
│    HOST_BIND=127.0.0.1 (default)                                          │
│                                                                            │
│    ┌─────────────────────────────────────────────────────────────────┐    │
│    │  Host Machine                                                    │    │
│    │                                                                  │    │
│    │    Browser ─────► 127.0.0.1:2150 ─────► Docker Container        │    │
│    │                                                                  │    │
│    │    Only accessible from localhost                               │    │
│    │                                                                  │    │
│    └─────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  Network Access Configuration                                              │
│  ════════════════════════════════                                          │
│                                                                            │
│    HOST_BIND=0.0.0.0                                                      │
│                                                                            │
│    ┌─────────────────────────────────────────────────────────────────┐    │
│    │  Host Machine                                                    │    │
│    │                                                                  │    │
│    │    Local Browser ──► 127.0.0.1:2150 ─┐                          │    │
│    │                                       ├──► Docker Container     │    │
│    │    Remote Client ───► {host-ip}:2150 ─┘                         │    │
│    │                                                                  │    │
│    │    Accessible from network                                      │    │
│    │                                                                  │    │
│    └─────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  Protocol Stack                                                            │
│  ══════════════                                                            │
│                                                                            │
│    ┌─────────────────────────────────────────────────────────────────┐    │
│    │                                                                  │    │
│    │    HTTP (Express)                                               │    │
│    │    ├── GET  /                React SPA                          │    │
│    │    ├── GET  /api/*           REST endpoints                     │    │
│    │    └── POST /api/*           REST endpoints                     │    │
│    │                                                                  │    │
│    │    WebSocket (ws)                                               │    │
│    │    └── ws://host:2150/       Real-time communication            │    │
│    │        └── Upgraded from HTTP                                   │    │
│    │                                                                  │    │
│    └─────────────────────────────────────────────────────────────────┘    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Local-First Principles

### Why Srcbook is Local-First

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        Local-First Architecture                             │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────┐    │
│  │  PRINCIPLE 1: Data Ownership                                      │    │
│  │  ═══════════════════════════════                                  │    │
│  │                                                                    │    │
│  │  ✓ All data stored on YOUR machine                                │    │
│  │  ✓ No cloud accounts required                                     │    │
│  │  ✓ No data leaves your system unless YOU export it                │    │
│  │  ✓ Full filesystem access for your code                           │    │
│  │                                                                    │    │
│  │    ~/.srcbook/                                                    │    │
│  │    ├── srcbook.db      ← Your configuration                       │    │
│  │    ├── srcbooks/       ← Your notebooks                           │    │
│  │    └── apps/           ← Your applications                        │    │
│  │                                                                    │    │
│  └───────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────┐    │
│  │  PRINCIPLE 2: Offline Capability                                  │    │
│  │  ═══════════════════════════════════                              │    │
│  │                                                                    │    │
│  │  ✓ Works without internet (except for):                           │    │
│  │    • npm package installation                                     │    │
│  │    • AI features (requires API keys)                              │    │
│  │                                                                    │    │
│  │  ✓ Code execution is completely local                             │    │
│  │  ✓ All editing and navigation works offline                       │    │
│  │  ✓ No server-side compilation or execution                        │    │
│  │                                                                    │    │
│  └───────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────┐    │
│  │  PRINCIPLE 3: Portable & Shareable                                │    │
│  │  ═════════════════════════════════════                            │    │
│  │                                                                    │    │
│  │  Export Options:                                                  │    │
│  │  ┌──────────────────────────────────────────────────────────┐    │    │
│  │  │  Srcbooks (.src.md)                                      │    │    │
│  │  │  ├── Human-readable markdown format                      │    │    │
│  │  │  ├── Contains all metadata and code                      │    │    │
│  │  │  └── Can be imported anywhere                            │    │    │
│  │  └──────────────────────────────────────────────────────────┘    │    │
│  │                                                                    │    │
│  │  ┌──────────────────────────────────────────────────────────┐    │    │
│  │  │  Apps (.zip)                                             │    │    │
│  │  │  ├── Complete project archive                            │    │    │
│  │  │  ├── Includes all source files                           │    │    │
│  │  │  └── Ready to deploy anywhere                            │    │    │
│  │  └──────────────────────────────────────────────────────────┘    │    │
│  │                                                                    │    │
│  └───────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────┐    │
│  │  PRINCIPLE 4: Transparent Storage                                 │    │
│  │  ════════════════════════════════════                             │    │
│  │                                                                    │    │
│  │  ✓ All files are regular filesystem files                         │    │
│  │  ✓ SQLite database is a single portable file                      │    │
│  │  ✓ No proprietary formats or binary blobs                         │    │
│  │  ✓ Easy to backup, migrate, or inspect                            │    │
│  │                                                                    │    │
│  │  ┌────────────────────────────────────────────────────────────┐   │    │
│  │  │  # Backup your entire Srcbook installation:                │   │    │
│  │  │  cp -r ~/.srcbook ~/srcbook-backup                         │   │    │
│  │  │                                                            │   │    │
│  │  │  # Or just view any srcbook:                               │   │    │
│  │  │  cat ~/.srcbook/srcbooks/{id}/README.md                    │   │    │
│  │  └────────────────────────────────────────────────────────────┘   │    │
│  │                                                                    │    │
│  └───────────────────────────────────────────────────────────────────┘    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `2150` | Server listen port |
| `HOST_BIND` | `127.0.0.1` | Network interface binding |
| `SRCBOOK_DISABLE_ANALYTICS` | `false` | Disable PostHog analytics |
| `SRCBOOK_INSTALL_DEPS` | `true` | Auto-install dependencies |

---

## Quick Start with Docker

```bash
# Build the image
docker build -t srcbook .

# Run with default settings (localhost only)
docker run -p 2150:2150 \
  -v ~/.srcbook:/root/.srcbook \
  srcbook

# Run with network access
docker run -p 0.0.0.0:2150:2150 \
  -v ~/.srcbook:/root/.srcbook \
  -e HOST_BIND=0.0.0.0 \
  srcbook

# Using docker-compose
docker-compose up -d

# Access the application
open http://localhost:2150
```

---

## Summary

Srcbook's Docker architecture embodies **local-first principles** while providing:

1. **Isolation**: Containerized execution environment
2. **Persistence**: Volume-mounted data directory survives container restarts
3. **Portability**: Same behavior across any Docker-capable host
4. **Security**: Default localhost-only binding prevents network exposure
5. **Simplicity**: Single container with all components (HTTP, WebSocket, static files)

The application runs entirely on your machine—your data never leaves your control.
