# Frontend Specification - Audio Processing Web Application

## Overview

A web-based frontend for the Event-Driven Audio Processing Engine that allows users to upload audio files, apply effects, and download processed results.

---

## Architecture Context

```
┌──────────────┐     REST API      ┌──────────────┐     RabbitMQ      ┌──────────────┐
│   Frontend   │ ←───────────────→ │   NestJS     │ ←──────────────→ │    Rust       │
│   (React)    │   POST /upload   │   Backend    │   audio_jobs     │   Worker      │
└──────────────┘                  └──────────────┘                  └──────────────┘
                                        │                                   │
                                        ↓                                   ↓
                                   ┌──────────┐                      ┌──────────┐
                                   │ Postgres │                      │ Cloudflare│
                                   │    DB    │                      │    R2     │
                                   └──────────┘                      └──────────┘
```

---

## Core Features

### 1. Authentication

- **Login Page**
  - Email/password form
  - JWT token storage (localStorage/cookies)
  - Redirect to dashboard on success

- **Registration Page**
  - Username, email, password fields
  - Form validation
  - Redirect to login on success

- **Session Management**
  - Protected routes requiring authentication
  - Auto-logout on token expiration (69 seconds)
  - User profile display

### 2. Audio Upload & Processing

- **File Upload Component**
  - Drag-and-drop zone
  - File type validation (mp3, wav, flac, ogg, etc.)
  - File size limit display
  - Upload progress indicator

- **Effects Panel**
  - Toggle switches to enable/disable effects
  - Sliders/inputs for effect parameters:
    - **Gain**: Volume multiplier (0.1 - 5.0)
    - **BitCrusher**: Bit depth (1-16)
    - **Delay**: Delay time (ms), Feedback (0-1), Mix (0-1)
  - Preview effect settings before processing

- **Processing Controls**
  - Submit button to dispatch job
  - Real-time job status polling
  - Cancel job option (if supported)

### 3. Job Status & Results

- **Processing Status**
  - Visual progress indicator
  - Status messages: queued, processing, completed, failed
  - Estimated time remaining

- **Results Display**
  - Download button for processed WAV file
  - Presigned URL playback (audio player)
  - Share link option

### 4. User Dashboard

- **Job History**
  - List of past processing jobs
  - Date, original filename, effects applied
  - Re-process option with same settings

- **Profile Section**
  - Display username, email, avatar
  - Plan status (free/premium)

---

## API Integration

### Authentication Endpoints

| Method | Endpoint              | Body                            | Response           |
| ------ | --------------------- | ------------------------------- | ------------------ |
| POST   | `/auth/login`         | `{ email, password }`           | `{ access_token }` |
| POST   | `/api/users/register` | `{ username, email, password }` | `{ user }`         |
| GET    | `/api/users/profile`  | -                               | `{ user }`         |

### Audio Processing Endpoints

| Method | Endpoint             | Body                       | Response             |
| ------ | -------------------- | -------------------------- | -------------------- |
| POST   | `/api/audio/process` | `{ input_url, effects[] }` | `{ job_id, status }` |

### Job Status Polling

The backend listens to `audio_status` queue. Frontend should poll for status:

```
Response structure:
{
  job_id: string,
  status: "queued" | "processing" | "completed" | "failed",
  output_url?: string
}
```

---

## Frontend Pages

### Pages Required

1. `/` - Landing page (public)
2. `/login` - Login page (public)
3. `/register` - Registration page (public)
4. `/dashboard` - Main app page (protected)
   - Audio upload
   - Effects configuration
   - Processing status
   - Download results

---

## Technical Stack Recommendations

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand or React Query
- **Styling**: Tailwind CSS
- **HTTP Client**: fetch
- **UI Components**: shadcn/ui or Radix UI

---

## File Structure (Proposed)

```
web/
├── public/
├── src/
│   ├── api/
│   │   ├── auth.ts
│   │   └── audio.ts
│   ├── components/
│   │   ├── AudioUploader.tsx
│   │   ├── EffectsPanel.tsx
│   │   ├── StatusDisplay.tsx
│   │   └── ui/
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useAudioProcessing.ts
│   ├── pages/
│   │   ├── Landing.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── Dashboard.tsx
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Data Types

```typescript
interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  plan: "free" | "premium";
}

interface GainEffect {
  type: "gain";
  amount: number;
}

interface BitcrusherEffect {
  type: "bitcrusher";
  bits: number;
}

interface DelayEffect {
  type: "delay";
  delay_ms: number;
  feedback: number;
  mix: number;
}

type Effect = GainEffect | BitcrusherEffect | DelayEffect;

interface ProcessingJob {
  job_id: string;
  input_url: string;
  output_url?: string;
  effects: Effect[];
  status: "queued" | "processing" | "completed" | "failed";
  created_at: string;
  completed_at?: string;
}

interface ProcessAudioRequest {
  input_url: string;
  effects: Effect[];
}

interface ProcessAudioResponse {
  job_id: string;
  status: string;
}
```

---

## Key Implementation Notes

1. **File Upload Flow**:
   - Frontend uploads file to Cloudflare R2 directly OR
   - Frontend sends file to backend which handles R2 upload
   - Backend provides presigned URL for upload

2. **Status Polling**:
   - Poll `/api/jobs/:id/status` every 2-3 seconds
   - Stop polling on completion or failure
   - Show toast notification on completion

3. **Audio Playback**:
   - Use HTML5 `<audio>` element with `output_url`
   - Generate presigned URLs with sufficient expiration time

4. **Error Handling**:
   - Network errors: Retry with exponential backoff
   - API errors: Display user-friendly messages
   - Processing failures: Show error details and retry option
