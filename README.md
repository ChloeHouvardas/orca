# Orca

A full-stack application with a Next.js frontend and Python FastAPI backend.

## Prerequisites

- [Node.js](https://nodejs.org/) v22+
- [pnpm](https://pnpm.io/) v10+
- [Python](https://www.python.org/) 3.12+
- [uv](https://docs.astral.sh/uv/) (Python package manager)

## Project Structure

```
orca/
├── frontend/    # Next.js (App Router, TypeScript, Tailwind CSS)
└── backend/     # Python FastAPI
```

## Installing Prerequisites

### pnpm

```bash
# via npm
npm install -g pnpm

# or via Homebrew (macOS)
brew install pnpm
```

See the [pnpm installation docs](https://pnpm.io/installation) for other methods.

### uv

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# or via Homebrew (macOS)
brew install uv
```

See the [uv installation docs](https://docs.astral.sh/uv/getting-started/installation/) for other methods.

## Getting Started

### Backend

```bash
cd backend

# Install dependencies (creates .venv automatically)
uv sync

# Start the dev server (http://localhost:8000)
uv run uvicorn main:app --reload
```

API docs are available at http://localhost:8000/docs once the server is running.

### Frontend

```bash
cd frontend

# Install dependencies
pnpm install

# Start the dev server (http://localhost:3000)
pnpm dev
```

## Tech Stack

| Layer    | Technology                        |
| -------- | --------------------------------- |
| Frontend | Next.js 16, React 19, Tailwind v4 |
| Backend  | FastAPI, Uvicorn                  |
| Language | TypeScript, Python                |
