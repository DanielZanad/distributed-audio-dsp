# Audio Console Frontend

React + Vite frontend for the event-driven audio processing system.

## Stack

- React 19 + TypeScript
- Tailwind CSS (v4)
- shadcn-style UI components
- TanStack Query for API state
- React Router for auth/public routing

## Screens

- `/login` sign in with `POST /auth/login`
- `/register` user registration with `POST /api/users/register`
- `/app/process` protected audio processing console with `POST /api/audio/process`

## Environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

`VITE_API_URL` defaults to `http://localhost:3000` when omitted.

## Run

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint
npm run build
```

## Current API limitation

The UI shows dispatch confirmation (`job_id`, `status`) after processing submission. Backend job completion status/output URL is not exposed as HTTP endpoints yet.
