# SmartCare — Architecture Document

> **Version:** 1.0  
> **Last Updated:** 2026-06-06  
> **Status:** Living Document

Smart patient care platform for chronic patients. This document is the single source of truth for every architectural decision, pattern, and convention used across the SmartCare backend and frontend systems.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack & Justifications](#2-tech-stack--justifications)
3. [Layered Architecture](#3-layered-architecture)
4. [Folder Structure](#4-folder-structure)
5. [Service Layer Design](#5-service-layer-design)
6. [Background Job Architecture](#6-background-job-architecture)
7. [Realtime Layer — Socket.IO](#7-realtime-layer--socketio)
8. [Caching Strategy — Redis](#8-caching-strategy--redis)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Error Handling Strategy](#10-error-handling-strategy)
11. [Database Design Principles](#11-database-design-principles)
12. [Deployment Architecture](#12-deployment-architecture)
13. [Environment Configuration](#13-environment-configuration)
14. [Frontend Architecture & Design System](#14-frontend-architecture--design-system)

---

## 1. System Overview

SmartCare enables chronic-disease patients, their doctors, caregivers, and clinic admins to coordinate care through:

| Module | Purpose |
|---|---|
| **Smart Queue & Appointments** | Book appointments, live queue token, wait-time estimation, history |
| **Medication Engine** | Recurring schedules, reminders, mark taken/snooze/skip, adherence |
| **Vitals Monitoring** | Blood pressure, glucose, pulse, weight tracking |
| **Analytics** | Adherence %, delayed medicines, health correlations |
| **Notifications** | Medication reminders, appointment alerts, caregiver escalation |
| **Auth & RBAC** | JWT auth with patient / doctor / caregiver / admin roles |

### 1.1 High-Level Architecture Diagram

```mermaid
graph TB
    subgraph Clients
        WEB["React SPA<br/>(Vercel)"]
        MOB["Mobile PWA"]
    end

    subgraph API_Gateway["API Layer (Render)"]
        EXP["Express.js<br/>+ Middleware Stack"]
    end

    subgraph Services["Service Layer"]
        AUTH["Auth Service"]
        APPT["Appointment Service"]
        MED["Medication Service"]
        VIT["Vitals Service"]
        ANLY["Analytics Service"]
        NOTIF["Notification Service"]
        QUEUE["Queue Service"]
        PAY["Payment Service"]
        MR["MedicalRecord Service"]
    end

    subgraph Data["Data Layer"]
        PG["PostgreSQL<br/>(Managed)"]
        REDIS["Redis<br/>(Upstash)"]
    end

    subgraph Workers["Background Workers"]
        CRON["node-cron<br/>Scheduler"]
        BULL["BullMQ Queues"]
        W1["Reminder Worker"]
        W2["Analytics Worker"]
        W3["Escalation Worker"]
    end

    subgraph Realtime["Realtime Layer"]
        SIO["Socket.IO Server"]
    end

    WEB -->|HTTPS| EXP
    MOB -->|HTTPS| EXP
    WEB <-->|WSS| SIO

    EXP --> AUTH
    EXP --> APPT
    EXP --> MED
    EXP --> VIT
    EXP --> ANLY
    EXP --> NOTIF
    EXP --> QUEUE
    EXP --> PAY
    EXP --> MR

    AUTH --> PG
    APPT --> PG
    MED --> PG
    VIT --> PG
    ANLY --> PG
    NOTIF --> PG
    QUEUE --> PG
    PAY --> PG
    MR --> PG

    ANLY --> REDIS
    APPT --> REDIS
    AUTH --> REDIS

    CRON -->|"enqueue jobs"| BULL
    BULL --> W1
    BULL --> W2
    BULL --> W3
    W1 --> PG
    W2 --> PG
    W2 --> REDIS
    W3 --> PG

    QUEUE --> SIO
    APPT --> SIO

    style PG fill:#336791,color:#fff
    style REDIS fill:#DC382D,color:#fff
    style EXP fill:#68A063,color:#fff
    style SIO fill:#010101,color:#fff
```

### 1.2 Request Lifecycle

```
Client Request
  → Rate Limiter (express-rate-limit)
  → Helmet (security headers)
  → CORS
  → Body Parser
  → JWT Auth Middleware
  → Role Guard Middleware
  → Zod Validation Middleware
  → Controller
  → Service (business logic)
  → Prisma Client (DB access)
  → Response Serializer
  → Client Response
```

---

## 2. Tech Stack & Justifications

### 2.1 Backend

| Technology | Role | Why |
|---|---|---|
| **Node.js 20 LTS** | Runtime | Event-loop handles I/O-heavy healthcare workloads efficiently; huge ecosystem |
| **TypeScript 5.x** | Language | Type safety prevents runtime bugs in critical medication/vitals logic; great DX |
| **Express.js 4.x** | HTTP Framework | Mature, minimal, enormous middleware ecosystem; team familiarity |
| **PostgreSQL 16** | Primary Database | ACID compliance for medication logs and appointments; relational model fits structured healthcare data; rich indexing (B-tree, GIN) for analytics queries |
| **Prisma ORM** | Database Access | Type-safe queries generated from schema; migrations built-in; excellent TypeScript integration; readable relation queries |
| **AWS S3** | File Storage | Secure storage for patient medical records |
| **Cashfree** | Payment Gateway | Processing appointment payments |
| **Redis 7** | Cache / Pub-Sub / Queue Backend | Sub-millisecond reads for dashboard caching; BullMQ backend; Socket.IO adapter for horizontal scaling |
| **BullMQ** | Job Queues | Reliable delayed/recurring jobs for reminders; built-in retry, backoff, rate-limiting; Redis-backed persistence |
| **Socket.IO** | Realtime | Bi-directional communication for live queue tokens; automatic reconnection and fallback transports |
| **node-cron** | Scheduler | Lightweight cron expressions to trigger BullMQ job batches (e.g., "every minute scan upcoming reminders") |
| **Zod** | Validation | Runtime schema validation with full TypeScript type inference; composes well |
| **Pino** | Logging | Fastest Node.js logger; structured JSON output for log aggregation |
| **bcrypt** | Password Hashing | Industry-standard adaptive hashing; configurable cost factor |

### 2.2 Frontend

| Technology | Role |
|---|---|
| **React 18** | UI Library |
| **React Router v6** | Client-side routing |
| **TanStack Query** | Server state management, caching, background refetch |
| **Chart.js / Recharts** | Vitals & analytics charts |
| **Socket.IO Client** | Realtime queue updates |
| **Tailwind CSS** | Utility-first styling |

### 2.3 Infrastructure

| Technology | Role |
|---|---|
| **Docker** | Containerized local dev & CI |
| **Render** | Backend API hosting (auto-deploy from `main`) |
| **Vercel** | Frontend hosting (edge network, preview deploys) |
| **PostgreSQL (Managed)** | Render PostgreSQL / Neon / Supabase |
| **Upstash / Redis Cloud** | Managed Redis with TLS |

### 2.4 Suggested Packages

```bash
# Core
npm install express @prisma/client bcrypt jsonwebtoken cors dotenv zod

# Security & Middleware
npm install express-rate-limit helmet cookie-parser

# Background Jobs & Realtime
npm install bullmq ioredis socket.io node-cron

# Logging
npm install pino pino-pretty

# Dev Dependencies
npm install -D typescript tsx prisma @types/express @types/node @types/bcrypt @types/jsonwebtoken @types/cors vitest
```

---

## 3. Layered Architecture

SmartCare follows a strict **4-layer architecture** to enforce separation of concerns. Each layer can only call the layer directly below it.

```mermaid
graph TD
    subgraph Layer1["Layer 1 — Routes"]
        R["Route Definitions<br/>HTTP verb + path mapping"]
    end

    subgraph Layer2["Layer 2 — Controllers"]
        C["Controllers<br/>Parse request, call service, send response"]
    end

    subgraph Layer3["Layer 3 — Services"]
        S["Services<br/>Business logic, orchestration, validation"]
    end

    subgraph Layer4["Layer 4 — Data Access"]
        P["Prisma Client<br/>Type-safe queries, transactions"]
    end

    subgraph DB["PostgreSQL"]
        D["Tables, Indexes, Constraints"]
    end

    R --> C
    C --> S
    S --> P
    P --> D

    style Layer1 fill:#E3F2FD
    style Layer2 fill:#E8F5E9
    style Layer3 fill:#FFF3E0
    style Layer4 fill:#FCE4EC
```

### 3.1 Layer Rules

| Layer | Responsibility | Allowed Dependencies |
|---|---|---|
| **Routes** | Map HTTP verbs/paths to controllers; apply middleware | Controllers, Middleware |
| **Controllers** | Extract params/body/query, call services, format HTTP response | Services, Validators |
| **Services** | All business logic, orchestration, cross-cutting concerns | Prisma Client, Redis, BullMQ, Socket.IO emitters |
| **Data Access (Prisma)** | Type-safe DB queries, transactions, raw SQL when needed | PostgreSQL only |

### 3.2 Key Conventions

- **Controllers never import Prisma directly** — all DB access goes through services.
- **Services are stateless classes/functions** — no request/response objects; they receive plain typed arguments and return typed results.
- **Transactions** are managed at the service layer using `prisma.$transaction()`.
- **Validation** happens before the controller body executes, via Zod middleware on the route.

---

## 4. Folder Structure

```
Smart-Care/
├── server/
│   ├── prisma/
│   │   ├── schema.prisma              # Single source of truth for DB schema
│   │   ├── migrations/                # Prisma-managed migration history
│   │   └── seed.ts                    # Seed data (demo patients, doctors)
│   │
│   ├── src/
│   │   ├── index.ts                   # Entry point — creates server
│   │   ├── app.ts                     # Express app factory (middleware stack)
│   │   ├── server.ts                  # HTTP server bootstrap
│   │   │
│   │   ├── config/                    # Configuration and env validation
│   │   ├── controllers/               # Express route controllers
│   │   ├── jobs/                      # Background jobs and scheduler
│   │   ├── lib/                       # Third-party integrations
│   │   ├── middleware/                # Express middleware
│   │   ├── routes/                    # API route definitions
│   │   ├── services/                  # Core business logic
│   │   ├── types/                     # TypeScript type definitions
│   │   ├── utils/                     # Helper functions
│   │   └── validators/                # Zod schemas for request validation
│   │
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── setup.ts                   # Test DB, Redis mocks
│   │
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example
│
├── client/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/                # Reusable UI components
│   │   ├── context/                   # React context providers
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── layouts/                   # Page layout wrappers
│   │   ├── pages/                     # Application pages
│   │   ├── services/                  # API client functions
│   │   ├── types/                     # TypeScript definitions
│   │   ├── utils/                     # Utility functions
│   │   ├── validators/                # Frontend Zod schemas
│   │   ├── index.css                  # Core design system and utilities
│   │   ├── main.tsx
│   │   └── App.tsx
│   ├── tailwind.config.js             # Tailwind design tokens
│   ├── package.json
│   └── ...
│
└── docs/
    ├── architecture.md                # ← This document
    ├── 00_PROJECT_INDEX.md
    └── ...
```

---

## 5. Service Layer Design

Each service encapsulates all business logic for its domain. Services are **plain TypeScript modules** exporting async functions — no class inheritance, no framework coupling.

### 5.1 Auth Service

```typescript
// services/auth.service.ts
export const AuthService = {
  register(data: RegisterInput): Promise<{ user: User; token: string }>,
  login(data: LoginInput): Promise<{ user: User; token: string }>,
  refreshToken(token: string): Promise<{ accessToken: string }>,
  forgotPassword(email: string): Promise<void>,
  resetPassword(token: string, newPassword: string): Promise<void>,
  changePassword(userId: string, oldPw: string, newPw: string): Promise<void>,
  getProfile(userId: string): Promise<UserProfile>,
  updateProfile(userId: string, data: UpdateProfileInput): Promise<UserProfile>,
};
```

**Key decisions:**
- Passwords hashed with **bcrypt** (cost factor 12).
- JWT access tokens (15 min) + refresh tokens (7 days, stored in DB).
- Refresh token rotation — old token invalidated on use.
- Failed login attempts tracked in Redis; account locked after 5 failures for 15 minutes.

### 5.2 Appointment Service

```typescript
// services/appointment.service.ts
export const AppointmentService = {
  bookAppointment(patientId: string, data: BookInput): Promise<Appointment>,
  cancelAppointment(appointmentId: string, userId: string): Promise<void>,
  getQueueStatus(doctorId: string, date: Date): Promise<QueueStatus>,
  callNextPatient(doctorId: string): Promise<TokenUpdate>,
  getWaitTimeEstimate(appointmentId: string): Promise<{ estimatedMinutes: number }>,
  getAppointmentHistory(userId: string, pagination: PaginationInput): Promise<PaginatedResult<Appointment>>,
  getDoctorSchedule(doctorId: string, date: Date): Promise<TimeSlot[]>,
};
```

**Key decisions:**
- Token numbers are **auto-incremented per doctor per day** using a PostgreSQL sequence or `SERIAL` scoped counter.
- When a doctor calls the next patient, `callNextPatient` emits a Socket.IO event to the `/queue` namespace.
- Wait-time estimation: `(tokensAhead × avgConsultationMinutes)` — `avgConsultationMinutes` fetched from Redis cache.
- Unique constraint on `(doctorId, date, tokenNumber)` prevents duplicate tokens.

### 5.3 Medication Service

```typescript
// services/medication.service.ts
export const MedicationService = {
  createSchedule(patientId: string, data: MedicineInput): Promise<Medicine>,
  updateSchedule(medicineId: string, data: Partial<MedicineInput>): Promise<Medicine>,
  deleteSchedule(medicineId: string): Promise<void>,
  getSchedules(patientId: string): Promise<Medicine[]>,
  getTodaySchedule(patientId: string): Promise<ScheduleWithLogs[]>,

  // Medication log actions
  markTaken(logId: string): Promise<MedicationLog>,
  markSkipped(logId: string, reason?: string): Promise<MedicationLog>,
  snoozeReminder(logId: string, snoozeMinutes: number): Promise<MedicationLog>,

  // Adherence
  getAdherence(patientId: string, range: DateRange): Promise<AdherenceReport>,
};
```

**Key decisions:**
- Medicine schedules define `timings` as an array of `HH:MM` strings and a `repeatType` enum (`daily`, `weekly`, `custom`).
- A **cron job** (every 60 seconds) scans medicines where the next scheduled time is within the upcoming 2-minute window, then enqueues a `medication-reminder` BullMQ job for each.
- `MedicationLog` rows are **pre-generated** nightly for the next day, so the patient sees their full schedule at midnight.
- **Idempotency:** `UNIQUE(medicineId, scheduledTime)` on `MedicationLog` prevents duplicate logs.
- Snooze re-enqueues a delayed BullMQ job for `snoozeMinutes` later.

### 5.4 Vitals Service

```typescript
// services/vitals.service.ts
export const VitalsService = {
  recordVital(patientId: string, data: VitalInput): Promise<Vital>,
  getVitals(patientId: string, filters: VitalFilters): Promise<PaginatedResult<Vital>>,
  getLatestVitals(patientId: string): Promise<LatestVitals>,
  getVitalTrends(patientId: string, type: VitalType, range: DateRange): Promise<TrendData>,
  checkThresholds(patientId: string, vital: Vital): Promise<Alert | null>,
};
```

**Key decisions:**
- After recording a vital, `checkThresholds` compares against configurable per-patient thresholds (set by their doctor).
- If a threshold is breached, a `caregiver-escalation` BullMQ job is enqueued.
- Vitals are indexed on `(patientId, recordedAt)` for efficient time-range queries.

### 5.5 Analytics Service

```typescript
// services/analytics.service.ts
export const AnalyticsService = {
  getPatientDashboard(patientId: string): Promise<PatientDashboard>,
  getDoctorDashboard(doctorId: string): Promise<DoctorDashboard>,
  getAdminDashboard(): Promise<AdminDashboard>,
  precomputeAnalytics(): Promise<void>,  // Called by nightly job
  getAdherenceReport(patientId: string, range: DateRange): Promise<AdherenceReport>,
  getHealthCorrelations(patientId: string): Promise<Correlation[]>,
};
```

**Key decisions:**
- **Nightly precomputation** (`analytics-precompute` job at 02:00 AM) aggregates:
  - Per-patient adherence % (7-day, 30-day)
  - Delayed medicine count
  - Vital averages and trends
  - Doctor-level patient compliance summaries
- Results written to a `AnalyticsSnapshot` table AND cached in Redis with `analytics:{patientId}:{date}` keys (TTL 24 hours).
- Dashboard API reads from Redis first → falls back to DB → triggers async recompute if stale.

### 5.6 Notification Service

```typescript
// services/notification.service.ts
export const NotificationService = {
  createNotification(data: CreateNotificationInput): Promise<Notification>,
  getUserNotifications(userId: string, pagination: PaginationInput): Promise<PaginatedResult<Notification>>,
  markAsRead(notificationId: string): Promise<void>,
  markAllAsRead(userId: string): Promise<void>,
  getUnreadCount(userId: string): Promise<number>,
  sendPushNotification(userId: string, payload: PushPayload): Promise<void>,
  escalateToCaregiver(patientId: string, reason: string): Promise<void>,
};
```

**Key decisions:**
- Every notification is **persisted in PostgreSQL** for audit trail.
- Real-time delivery via Socket.IO to connected clients.
- Caregiver escalation triggers when: missed medication > 2 hours, critical vital threshold breach, or 3+ consecutive missed doses.
- Future: WhatsApp/SMS via pluggable transport (strategy pattern).

### 5.7 Queue Service

```typescript
// services/queue.service.ts
export const QueueService = {
  issueToken(doctorId: string, patientId: string, date: Date): Promise<QueueToken>,
  advanceQueue(doctorId: string): Promise<QueueToken>,
  getCurrentToken(doctorId: string): Promise<number>,
  getQueueLength(doctorId: string): Promise<number>,
  estimateWaitTime(tokenNumber: number, doctorId: string): Promise<number>,
};
```

**Key decisions:**
- Queue state is **dual-written**: PostgreSQL for persistence, Redis for fast reads.
- `advanceQueue` updates both stores and emits `queue:update` via Socket.IO.
- Redis key pattern: `queue:{doctorId}:{YYYY-MM-DD}` → hash with `currentToken`, `lastTokenIssued`, `avgTime`.

---

## 6. Background Job Architecture

### 6.1 Queue Topology

```mermaid
graph LR
    subgraph Schedulers
        C1["node-cron<br/>Every 60s"]
        C2["node-cron<br/>Daily 02:00"]
        C3["node-cron<br/>Daily 00:00"]
        C4["node-cron<br/>Weekly Sun 03:00"]
    end

    subgraph BullMQ_Queues["BullMQ Queues (Redis-backed)"]
        Q1["medication-reminder"]
        Q2["appointment-reminder"]
        Q3["analytics-precompute"]
        Q4["caregiver-escalation"]
        Q5["log-generation"]
        Q6["cleanup"]
    end

    subgraph Workers
        W1["MedicationReminderWorker<br/>concurrency: 10"]
        W2["AppointmentReminderWorker<br/>concurrency: 5"]
        W3["AnalyticsWorker<br/>concurrency: 2"]
        W4["EscalationWorker<br/>concurrency: 3"]
        W5["LogGenerationWorker<br/>concurrency: 2"]
        W6["CleanupWorker<br/>concurrency: 1"]
    end

    C1 -->|scan & enqueue| Q1
    C1 -->|scan & enqueue| Q2
    C2 --> Q3
    C3 --> Q5
    C4 --> Q6

    Q1 --> W1
    Q2 --> W2
    Q3 --> W3
    Q4 --> W4
    Q5 --> W5
    Q6 --> W6

    style Q1 fill:#DC382D,color:#fff
    style Q2 fill:#DC382D,color:#fff
    style Q3 fill:#DC382D,color:#fff
    style Q4 fill:#DC382D,color:#fff
    style Q5 fill:#DC382D,color:#fff
    style Q6 fill:#DC382D,color:#fff
```

### 6.2 Queue Definitions

| Queue Name | Trigger | Job Payload | Worker Action | Concurrency | Retry |
|---|---|---|---|---|---|
| `medication-reminder` | Cron (60s scan) | `{ logId, patientId, medicineName, scheduledTime }` | Create notification → emit Socket.IO → persist | 10 | 3× exponential |
| `appointment-reminder` | Cron (60s scan) | `{ appointmentId, patientId, doctorName, slot }` | Create notification → emit Socket.IO | 5 | 3× exponential |
| `analytics-precompute` | Daily 02:00 AM | `{ date }` or per-patient batch | Aggregate queries → write `AnalyticsSnapshot` → set Redis cache | 2 | 2× exponential |
| `caregiver-escalation` | Event-driven (vital breach, missed med) | `{ patientId, caregiverId, reason, severity }` | Notify caregiver via all channels | 3 | 5× exponential |
| `log-generation` | Daily 00:00 AM | `{ date }` | Pre-generate `MedicationLog` rows for all active schedules | 2 | 2× exponential |
| `cleanup` | Weekly Sun 03:00 | `{ olderThanDays: 90 }` | Archive/delete old notifications, expired tokens | 1 | 1× |

### 6.3 Job Configuration Pattern

```typescript
// jobs/queue.registry.ts
import { Queue } from 'bullmq';
import { redisConnection } from '../lib/redis';

export const medicationReminderQueue = new Queue('medication-reminder', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 86400 },    // keep completed jobs for 24h
    removeOnFail: { age: 604800 },       // keep failed jobs for 7 days
  },
});
```

```typescript
// jobs/worker.registry.ts
import { Worker } from 'bullmq';
import { redisConnection } from '../lib/redis';
import { processMedicationReminder } from '../jobs/medication-reminder.job';

export const medicationReminderWorker = new Worker(
  'medication-reminder',
  processMedicationReminder,
  {
    connection: redisConnection,
    concurrency: 10,
    limiter: { max: 100, duration: 60000 },  // max 100 jobs/min
  }
);
```

### 6.4 Reminder Spike Handling

**Problem:** At common medication times (08:00, 13:00, 21:00), thousands of reminders trigger simultaneously.

**Solution:**
1. **Cron scanner** runs every 60 seconds, queries medicines due in the next 2-minute window.
2. Jobs are enqueued with a **random delay (0–30s jitter)** to spread the spike.
3. Worker concurrency is capped at 10 with a rate limiter of 100 jobs/min.
4. BullMQ's built-in **backpressure** pauses the queue if Redis memory exceeds threshold.

---

## 7. Realtime Layer — Socket.IO

### 7.1 Namespace Design

| Namespace | Purpose | Events |
|---|---|---|
| `/queue` | Live queue updates for waiting rooms | `queue:update`, `queue:called`, `queue:waitTime` |
| `/notifications` | Real-time notification delivery | `notification:new`, `notification:count` |

### 7.2 Authentication

Socket.IO connections are authenticated via the JWT token passed as a handshake query parameter or `auth` object:

```typescript
// lib/socket.ts
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    const payload = verifyAccessToken(token);
    socket.data.userId = payload.userId;
    socket.data.role = payload.role;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});
```

### 7.3 Room Strategy

```
Patient connects → auto-joins room `user:{userId}`
Doctor connects  → auto-joins room `doctor:{doctorId}` + `queue:{doctorId}`
Caregiver        → auto-joins rooms of all linked patients
```

### 7.4 Event Flow — Queue Update Example

```mermaid
sequenceDiagram
    participant D as Doctor Client
    participant API as Express API
    participant SVC as QueueService
    participant PG as PostgreSQL
    participant R as Redis
    participant SIO as Socket.IO
    participant P as Patient Client

    D->>API: POST /api/v1/queue/next
    API->>SVC: advanceQueue(doctorId)
    SVC->>PG: UPDATE appointment SET status='in_progress'
    SVC->>R: HINCRBY queue:{doctorId}:{date} currentToken 1
    SVC->>SIO: emit('queue:update', { currentToken, doctorId })
    SIO->>P: queue:update event (to room queue:{doctorId})
    P->>P: Update UI — "Now Serving: Token #12"
```

### 7.5 Scaling Consideration

For horizontal scaling (multiple server instances), use the **Redis adapter** for Socket.IO:

```typescript
import { createAdapter } from '@socket.io/redis-adapter';

const pubClient = new Redis(REDIS_URL);
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

---

## 8. Caching Strategy — Redis

### 8.1 Cache Key Patterns

| Key Pattern | Data | TTL | Invalidation |
|---|---|---|---|
| `analytics:{patientId}:{date}` | Precomputed dashboard JSON | 24h | Nightly recompute overwrite |
| `queue:{doctorId}:{date}` | Hash: `currentToken`, `lastToken`, `avgTime` | End of day | On queue advance |
| `vitals:latest:{patientId}` | Latest vitals snapshot | 10 min | On new vital recorded |
| `user:profile:{userId}` | User profile data | 1h | On profile update |
| `rate:login:{ip}` | Login attempt counter | 15 min | Auto-expire |
| `session:refresh:{tokenId}` | Refresh token validity flag | 7 days | On token rotation |
| `adherence:{patientId}:7d` | 7-day adherence percentage | 6h | Nightly recompute |

### 8.2 Cache-Aside Pattern (Default)

```typescript
async function getPatientDashboard(patientId: string) {
  const cacheKey = `analytics:${patientId}:${today()}`;

  // 1. Try cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. Fallback to DB
  const data = await computeDashboard(patientId);

  // 3. Populate cache
  await redis.setex(cacheKey, 86400, JSON.stringify(data));

  return data;
}
```

### 8.3 Write-Through Pattern (Queue State)

Queue state uses **write-through** — every mutation writes to both PostgreSQL and Redis atomically:

```typescript
async function advanceQueue(doctorId: string) {
  const result = await prisma.$transaction(async (tx) => {
    // Update DB
    const next = await tx.appointment.updateMany({ /* ... */ });
    return next;
  });

  // Update Redis (always after successful DB commit)
  await redis.hincrby(`queue:${doctorId}:${today()}`, 'currentToken', 1);

  return result;
}
```

### 8.4 Cache Invalidation Rules

- **Time-based:** Most caches have explicit TTLs; stale data is acceptable for dashboards (up to 24h).
- **Event-based:** Profile updates, vital recordings, and medication actions invalidate their specific keys immediately.
- **Bulk invalidation:** Nightly analytics job overwrites all `analytics:*` keys.

---

## 9. Authentication & Authorization

### 9.1 Auth Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Express API
    participant AUTH as Auth Service
    participant PG as PostgreSQL
    participant R as Redis

    Note over C,R: Registration
    C->>API: POST /api/v1/auth/register
    API->>AUTH: register({ email, password, role })
    AUTH->>AUTH: bcrypt.hash(password, 12)
    AUTH->>PG: INSERT INTO users
    AUTH->>AUTH: signAccessToken(15min) + signRefreshToken(7d)
    AUTH->>PG: INSERT INTO refresh_tokens
    AUTH-->>C: { user, accessToken, refreshToken }

    Note over C,R: Login
    C->>API: POST /api/v1/auth/login
    API->>R: CHECK rate:login:{ip}
    R-->>API: attempts < 5 ✓
    API->>AUTH: login({ email, password })
    AUTH->>PG: SELECT user WHERE email
    AUTH->>AUTH: bcrypt.compare(password, hash)
    AUTH->>AUTH: signAccessToken + signRefreshToken
    AUTH->>R: DEL rate:login:{ip}
    AUTH-->>C: { user, accessToken, refreshToken }

    Note over C,R: Authenticated Request
    C->>API: GET /api/v1/medications (Authorization: Bearer <token>)
    API->>API: authenticate middleware → verify JWT
    API->>API: authorize(['patient']) → check role
    API->>API: proceed to controller
```

### 9.2 JWT Token Structure

```typescript
// Access Token Payload (short-lived, 15 min)
{
  userId: string;
  email: string;
  role: 'patient' | 'doctor' | 'caregiver' | 'admin';
  iat: number;
  exp: number;
}

// Refresh Token — opaque UUID stored in DB
// Table: RefreshToken { id, userId, token, expiresAt, isRevoked }
```

### 9.3 Role-Based Access Control (RBAC)

| Endpoint | patient | doctor | caregiver | admin |
|---|:---:|:---:|:---:|:---:|
| `POST /medications` | ✅ | ✅ | ❌ | ✅ |
| `GET /medications/:patientId` | own | assigned | linked | ✅ |
| `POST /appointments` | ✅ | ❌ | ✅ | ✅ |
| `POST /queue/next` | ❌ | ✅ | ❌ | ✅ |
| `GET /vitals/:patientId` | own | assigned | linked | ✅ |
| `POST /vitals` | ✅ | ❌ | ✅ | ❌ |
| `GET /analytics/admin` | ❌ | ❌ | ❌ | ✅ |
| `GET /analytics/patient/:id` | own | assigned | linked | ✅ |

### 9.4 Authorization Middleware

```typescript
// middleware/authorize.ts
export function authorize(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError('Not authenticated', 401);
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403);
    }
    next();
  };
}

// Usage in routes:
router.post('/queue/next',
  authenticate,
  authorize(['doctor', 'admin']),
  validate(advanceQueueSchema),
  queueController.advanceQueue
);
```

### 9.5 Resource-Level Authorization

Beyond role checks, services enforce **ownership/relationship checks**:

```typescript
// Inside medication.service.ts
async function getPatientMedications(requesterId: string, requesterRole: Role, patientId: string) {
  // Patient can only see own data
  if (requesterRole === 'patient' && requesterId !== patientId) {
    throw new AppError('Forbidden', 403);
  }

  // Caregiver must be linked to this patient
  if (requesterRole === 'caregiver') {
    const link = await prisma.caregiverPatient.findUnique({
      where: { caregiverId_patientId: { caregiverId: requesterId, patientId } },
    });
    if (!link) throw new AppError('Forbidden', 403);
  }

  // Doctor must be assigned to this patient
  if (requesterRole === 'doctor') {
    const assignment = await prisma.doctorPatient.findUnique({
      where: { doctorId_patientId: { doctorId: requesterId, patientId } },
    });
    if (!assignment) throw new AppError('Forbidden', 403);
  }

  return prisma.medicine.findMany({ where: { patientId } });
}
```

---

## 10. Error Handling Strategy

### 10.1 Custom Error Class

```typescript
// utils/apiError.ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined errors
export const Errors = {
  NotFound:      (resource: string) => new AppError(`${resource} not found`, 404, 'NOT_FOUND'),
  Unauthorized:  ()                 => new AppError('Authentication required', 401, 'UNAUTHORIZED'),
  Forbidden:     ()                 => new AppError('Insufficient permissions', 403, 'FORBIDDEN'),
  Conflict:      (msg: string)      => new AppError(msg, 409, 'CONFLICT'),
  Validation:    (msg: string)      => new AppError(msg, 422, 'VALIDATION_ERROR'),
  RateLimited:   ()                 => new AppError('Too many requests', 429, 'RATE_LIMITED'),
};
```

### 10.2 Global Error Handler

```typescript
// middleware/errorHandler.ts
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  // Zod validation error
  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  // Known operational error
  if (err instanceof AppError) {
    logger.warn({ err, requestId: req.id }, err.message);
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }

  // Prisma known errors (unique constraint, not found, etc.)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        code: 'CONFLICT',
        message: 'Resource already exists',
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Resource not found',
      });
    }
  }

  // Unknown/programmer error
  logger.error({ err, requestId: req.id }, 'Unhandled error');
  return res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
}
```

### 10.3 Standardized API Response

```typescript
// utils/apiResponse.ts
export class ApiResponse<T> {
  constructor(
    public success: boolean,
    public message: string,
    public data?: T,
    public meta?: { page?: number; limit?: number; total?: number }
  ) {}

  static ok<T>(data: T, message = 'Success') {
    return new ApiResponse(true, message, data);
  }

  static paginated<T>(data: T[], total: number, page: number, limit: number) {
    return new ApiResponse(true, 'Success', data, { page, limit, total });
  }

  static created<T>(data: T, message = 'Created successfully') {
    return new ApiResponse(true, message, data);
  }
}
```

### 10.4 Async Handler Wrapper

```typescript
// utils/asyncHandler.ts
export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

### 10.5 Error Handling Rules

1. **Services throw `AppError`** for expected failures (not found, validation, forbidden).
2. **Controllers never try/catch** — they use `asyncHandler` which forwards to `errorHandler`.
3. **Workers** catch errors and let BullMQ retry logic handle transient failures; permanent failures are logged with full context.
4. **Unhandled rejections and uncaught exceptions** are caught at process level, logged, and trigger graceful shutdown.

---

## 11. Database Design Principles

### 11.1 Prisma Schema Conventions

```prisma
// ============================================================
// SmartCare — Prisma Schema
// Database: PostgreSQL 17
// ============================================================

datasource db {
  provider = "postgresql"
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearchPostgres"]
  binaryTargets   = ["native", "linux-musl-openssl-3.0.x"]
}

// ============================================================
// ENUMS
// ============================================================

enum Role {
  PATIENT
  DOCTOR
  CAREGIVER
  ADMIN

  @@map("role")
}

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY

  @@map("day_of_week")
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW

  @@map("appointment_status")
}

enum AppointmentType {
  IN_PERSON
  TELECONSULT

  @@map("appointment_type")
}

enum QueueStatus {
  WAITING
  IN_PROGRESS
  COMPLETED
  SKIPPED

  @@map("queue_status")
}

enum Frequency {
  DAILY
  TWICE_DAILY
  THRICE_DAILY
  WEEKLY
  AS_NEEDED
  CUSTOM

  @@map("frequency")
}

enum MedicationLogStatus {
  PENDING
  TAKEN
  SKIPPED
  MISSED
  SNOOZED

  @@map("medication_log_status")
}

enum VitalType {
  BLOOD_PRESSURE
  GLUCOSE
  PULSE
  WEIGHT
  TEMPERATURE
  OXYGEN_SATURATION

  @@map("vital_type")
}

enum NotificationType {
  MEDICATION_REMINDER
  APPOINTMENT_REMINDER
  VITAL_ALERT
  CAREGIVER_ALERT
  SYSTEM

  @@map("notification_type")
}

enum CaregiverLinkStatus {
  PENDING
  ACCEPTED
  REJECTED

  @@map("caregiver_link_status")
}

// ============================================================
// MODELS
// ============================================================

// ------------------------------------------------------------
// 1. User — Central identity for all roles
// ------------------------------------------------------------
model User {
  id           String    @id @default(uuid()) @db.Uuid
  email        String    @unique
  passwordHash String    @map("password_hash")
  role         Role
  firstName    String    @map("first_name") @db.VarChar(100)
  lastName     String    @map("last_name") @db.VarChar(100)
  phone        String?   @db.VarChar(20)
  isVerified   Boolean   @default(false) @map("is_verified")
  isActive     Boolean   @default(true) @map("is_active")
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  doctorProfile         DoctorProfile?
  appointmentsAsPatient Appointment[]    @relation("PatientAppointments")
  appointmentsAsDoctor  Appointment[]    @relation("DoctorAppointments")
  queueTokensAsDoctor   QueueToken[]     @relation("DoctorQueueTokens")
  queueTokensAsPatient  QueueToken[]     @relation("PatientQueueTokens")
  medicines             Medicine[]
  medicationLogs        MedicationLog[]
  vitals                Vital[]
  caregiverLinks        CaregiverLink[]  @relation("CaregiverUser")
  patientLinks          CaregiverLink[]  @relation("PatientUser")
  notifications         Notification[]
  auditLogs             AuditLog[]
  refreshTokens         RefreshToken[]
  analyticsSnapshots    AnalyticsSnapshot[]

  @@index([email])
  @@index([role])
  @@index([isActive, deletedAt])
  @@map("users")
}

// ------------------------------------------------------------
// 2. DoctorProfile — Extended profile for DOCTOR users
// ------------------------------------------------------------
model DoctorProfile {
  id                     String   @id @default(uuid()) @db.Uuid
  userId                 String   @unique @map("user_id") @db.Uuid
  specialization         String   @db.VarChar(150)
  clinicName             String   @map("clinic_name") @db.VarChar(200)
  clinicAddress          String?  @map("clinic_address") @db.Text
  consultationFee        Decimal  @map("consultation_fee") @db.Decimal(10, 2)
  avgConsultationMinutes Int      @default(15) @map("avg_consultation_minutes")
  createdAt              DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt              DateTime @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  user          User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  availability  DoctorAvailability[]
  appointments  Appointment[]

  @@index([specialization])
  @@map("doctor_profiles")
}

// ------------------------------------------------------------
// 3. DoctorAvailability — Weekly recurring slot definitions
// ------------------------------------------------------------
model DoctorAvailability {
  id              String    @id @default(uuid()) @db.Uuid
  doctorProfileId String    @map("doctor_profile_id") @db.Uuid
  dayOfWeek       DayOfWeek @map("day_of_week")
  startTime       String    @map("start_time") @db.VarChar(5) // "09:00"
  endTime         String    @map("end_time") @db.VarChar(5)   // "17:00"
  maxPatients     Int       @default(20) @map("max_patients")
  isActive        Boolean   @default(true) @map("is_active")

  // --- Relations ---
  doctorProfile DoctorProfile @relation(fields: [doctorProfileId], references: [id], onDelete: Cascade)

  @@unique([doctorProfileId, dayOfWeek, startTime], name: "uq_doctor_day_slot")
  @@index([doctorProfileId, isActive])
  @@map("doctor_availability")
}

// ------------------------------------------------------------
// 4. Appointment — Scheduled visit between patient and doctor
// ------------------------------------------------------------
model Appointment {
  id              String            @id @default(uuid()) @db.Uuid
  patientId       String            @map("patient_id") @db.Uuid
  doctorId        String            @map("doctor_id") @db.Uuid
  doctorProfileId String            @map("doctor_profile_id") @db.Uuid
  scheduledDate   DateTime          @map("scheduled_date") @db.Date
  slotStart       DateTime          @map("slot_start") @db.Timestamptz
  slotEnd         DateTime          @map("slot_end") @db.Timestamptz
  tokenNumber     Int               @map("token_number")
  status          AppointmentStatus @default(PENDING)
  type            AppointmentType   @default(IN_PERSON)
  notes           String?           @db.Text
  cancelReason    String?           @map("cancel_reason") @db.Text
  cancelledBy     String?           @map("cancelled_by") @db.Uuid
  createdAt       DateTime          @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime          @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  patient       User          @relation("PatientAppointments", fields: [patientId], references: [id], onDelete: Restrict)
  doctor        User          @relation("DoctorAppointments", fields: [doctorId], references: [id], onDelete: Restrict)
  doctorProfile DoctorProfile @relation(fields: [doctorProfileId], references: [id], onDelete: Restrict)
  queueToken    QueueToken?

  @@unique([doctorId, scheduledDate, tokenNumber], name: "uq_doctor_date_token")
  @@index([patientId, status])
  @@index([doctorId, scheduledDate])
  @@index([scheduledDate, status])
  @@index([status])
  @@map("appointments")
}

// ------------------------------------------------------------
// 5. QueueToken — Real-time queue position for an appointment
// ------------------------------------------------------------
model QueueToken {
  id                  String      @id @default(uuid()) @db.Uuid
  appointmentId       String      @unique @map("appointment_id") @db.Uuid
  doctorId            String      @map("doctor_id") @db.Uuid
  patientId           String      @map("patient_id") @db.Uuid
  tokenNumber         Int         @map("token_number")
  status              QueueStatus @default(WAITING)
  estimatedWaitMinutes Int?       @map("estimated_wait_minutes")
  calledAt            DateTime?   @map("called_at") @db.Timestamptz
  completedAt         DateTime?   @map("completed_at") @db.Timestamptz
  createdAt           DateTime    @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  appointment Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  doctor      User        @relation("DoctorQueueTokens", fields: [doctorId], references: [id], onDelete: Restrict)
  patient     User        @relation("PatientQueueTokens", fields: [patientId], references: [id], onDelete: Restrict)

  @@index([doctorId, status])
  @@index([doctorId, createdAt])
  @@map("queue_tokens")
}

// ------------------------------------------------------------
// 6. Medicine — Recurring medication schedule definition
// ------------------------------------------------------------
model Medicine {
  id           String    @id @default(uuid()) @db.Uuid
  userId       String    @map("user_id") @db.Uuid
  name         String    @db.VarChar(200)
  dosage       String    @db.VarChar(50)  // e.g. "500" or "10"
  unit         String    @db.VarChar(30)  // e.g. "mg", "ml", "tablets"
  frequency    Frequency
  timings      String[]  @db.VarChar(5)   // ["08:00", "14:00", "21:00"]
  startDate    DateTime  @map("start_date") @db.Date
  endDate      DateTime? @map("end_date") @db.Date
  instructions String?   @db.Text
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  medicationLogs MedicationLog[]

  @@index([userId, isActive])
  @@index([userId, startDate, endDate])
  @@map("medicines")
}

// ------------------------------------------------------------
// 7. MedicationLog — Individual dose-level adherence record
// ------------------------------------------------------------
model MedicationLog {
  id          String              @id @default(uuid()) @db.Uuid
  medicineId  String              @map("medicine_id") @db.Uuid
  userId      String              @map("user_id") @db.Uuid
  scheduledAt DateTime            @map("scheduled_at") @db.Timestamptz
  takenAt     DateTime?           @map("taken_at") @db.Timestamptz
  status      MedicationLogStatus @default(PENDING)
  snoozeUntil DateTime?           @map("snooze_until") @db.Timestamptz
  notes       String?             @db.Text
  createdAt   DateTime            @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  medicine Medicine @relation(fields: [medicineId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([medicineId, scheduledAt], name: "uq_medicine_scheduled")
  @@index([userId, scheduledAt])
  @@index([userId, status])
  @@index([scheduledAt, status])
  @@map("medication_logs")
}

// ------------------------------------------------------------
// 8. Vital — Point-in-time health measurement
// ------------------------------------------------------------
model Vital {
  id         String    @id @default(uuid()) @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  vitalType  VitalType @map("type")
  values     Json      @db.JsonB
  notes      String?   @db.Text
  recordedAt DateTime  @map("recorded_at") @db.Timestamptz
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, vitalType, recordedAt])
  @@index([userId, recordedAt])
  @@map("vitals")
}

// ------------------------------------------------------------
// 9. CaregiverLink — Permission-based caregiver-patient link
// ------------------------------------------------------------
model CaregiverLink {
  id           String   @id @default(uuid()) @db.Uuid
  caregiverId  String   @map("caregiver_id") @db.Uuid
  patientId    String   @map("patient_id") @db.Uuid
  relationship String   @db.VarChar(50) // "spouse", "child", "sibling", etc.
  permissions  String[] // ["VIEW_VITALS", "VIEW_MEDICATIONS", "VIEW_APPOINTMENTS", "BOOK_APPOINTMENTS", "RECEIVE_ALERTS"]
  status       CaregiverLinkStatus @default(PENDING)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  caregiver User @relation("CaregiverUser", fields: [caregiverId], references: [id], onDelete: Cascade)
  patient   User @relation("PatientUser", fields: [patientId], references: [id], onDelete: Cascade)

  @@unique([caregiverId, patientId], name: "uq_caregiver_patient")
  @@index([patientId, status])
  @@map("caregiver_links")
}

// ------------------------------------------------------------
// 10. Notification — Multi-channel notification record
// ------------------------------------------------------------
model Notification {
  id        String           @id @default(uuid()) @db.Uuid
  userId    String           @map("user_id") @db.Uuid
  type      NotificationType
  title     String           @db.VarChar(200)
  message   String           @db.Text
  isRead    Boolean          @default(false) @map("is_read")
  readAt    DateTime?        @map("read_at") @db.Timestamptz
  metadata  Json?            @db.JsonB
  createdAt DateTime         @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, type, createdAt])
  @@index([createdAt])
  @@map("notifications")
}

// ------------------------------------------------------------
// 11. AuditLog — Immutable system-wide change log
// ------------------------------------------------------------
model AuditLog {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String?  @map("user_id") @db.Uuid
  action    String   @db.VarChar(50) // "CREATE", "UPDATE", "DELETE", "LOGIN"
  entity    String   @db.VarChar(50) // "User", "Appointment", etc.
  entityId  String   @map("entity_id") @db.VarChar(100)
  oldValues Json?    @map("old_values") @db.JsonB
  newValues Json?    @map("new_values") @db.JsonB
  ipAddress String?  @map("ip_address") @db.VarChar(45) // IPv6 max length
  userAgent String?  @map("user_agent") @db.Text
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@index([entity, entityId])
  @@index([createdAt])
  @@map("audit_logs")
}

// ------------------------------------------------------------
// 12. RefreshToken — JWT refresh token rotation tracking
// ------------------------------------------------------------
model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  token     String   @unique
  expiresAt DateTime @map("expires_at") @db.Timestamptz
  isRevoked Boolean  @default(false) @map("is_revoked")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRevoked])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

// ------------------------------------------------------------
// 13. AnalyticsSnapshot — Nightly precomputed stats
// ------------------------------------------------------------
model AnalyticsSnapshot {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @map("user_id") @db.Uuid
  date            DateTime @db.Date
  adherenceRate   Float    @map("adherence_rate")
  maxStreak       Int      @map("max_streak")
  currentStreak   Int      @map("current_streak")
  delayedDoses    Int      @map("delayed_doses")
  vitalsCount     Int      @map("vitals_count")
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date], name: "uq_user_date")
  @@index([date])
  @@map("analytics_snapshots")
}

```

### 11.2 Index Strategy

| Index | Purpose |
|---|---|
| `users.email` (unique) | Login lookup |
| `appointments.slot` | Time-range queries for scheduling |
| `appointments(doctorId, slot)` (unique) | Prevent double-booking |
| `medication_logs(medicineId, scheduledTime)` (unique) | Idempotent log generation |
| `medication_logs.scheduledTime` | Cron scanner query: "logs due in next 2 min" |
| `vitals(patientId, recordedAt)` | Time-series trend queries |
| `notifications(userId, isRead)` | Unread notification count |
| `audit_logs.createdAt` | Time-range audit queries |

---

## 12. Deployment Architecture

### 12.1 Deployment Diagram

```mermaid
graph TB
    subgraph Internet
        USER["Users<br/>(Browser / PWA)"]
    end

    subgraph Vercel["Vercel (Edge Network)"]
        FE["React SPA<br/>Static Assets + CDN"]
    end

    subgraph Render["Render (Backend)"]
        API["Express API Server<br/>(Node.js Container)"]
        WRK["Worker Process<br/>(BullMQ Workers)"]
    end

    subgraph Managed_Services["Managed Services"]
        PG["PostgreSQL<br/>(Render DB / Neon)"]
        REDIS["Redis<br/>(Upstash / Redis Cloud)"]
    end

    USER -->|HTTPS| FE
    FE -->|API Calls| API
    USER <-->|WSS| API

    API --> PG
    API --> REDIS
    WRK --> PG
    WRK --> REDIS

    API -.->|"enqueue jobs via Redis"| WRK

    style FE fill:#000,color:#fff
    style API fill:#68A063,color:#fff
    style WRK fill:#68A063,color:#fff
    style PG fill:#336791,color:#fff
    style REDIS fill:#DC382D,color:#fff
```

### 12.2 Docker Configuration

```yaml
# docker-compose.yml (local development)
version: '3.8'

services:
  api:
    build:
      context: ./Backend
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/smartcare?schema=public
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./Backend/src:/app/src  # Hot reload

  worker:
    build:
      context: ./Backend
      dockerfile: Dockerfile
    command: npx tsx src/worker.ts
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/smartcare?schema=public
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: smartcare
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

```dockerfile
# Backend/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Dependencies
COPY package*.json ./
RUN npm ci --only=production

# Build
FROM base AS build
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Production
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 12.3 Deployment Environments

| Environment | API Host | DB | Redis | Branch |
|---|---|---|---|---|
| **Development** | `localhost:3000` | Docker PostgreSQL | Docker Redis | `dev` |
| **Staging** | `staging-api.smartcare.app` | Render PostgreSQL (staging) | Upstash (staging) | `staging` |
| **Production** | `api.smartcare.app` | Render PostgreSQL (prod) | Upstash (prod) | `main` |

### 12.4 CI/CD Pipeline

```
Push to main
  → GitHub Actions
  → Lint + Type Check
  → Run Tests (unit + integration against test DB)
  → Build Docker Image
  → Run Prisma Migrations (prisma migrate deploy)
  → Deploy to Render (auto-deploy)
  → Post-deploy health check
```

### 12.5 Health Endpoint

```typescript
// routes/health.routes.ts
router.get('/health', async (_req, res) => {
  const checks = {
    server: 'ok',
    database: 'ok',
    redis: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    checks.database = 'error';
  }

  try {
    await redis.ping();
  } catch {
    checks.redis = 'error';
  }

  const isHealthy = checks.database === 'ok' && checks.redis === 'ok';
  res.status(isHealthy ? 200 : 503).json(checks);
});
```

---

## 13. Environment Configuration

### 13.1 Environment Variables

```bash
# .env.example

# ─── Server ───────────────────────────────────
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000
CLIENT_URL=http://localhost:5173

# ─── Database (PostgreSQL) ────────────────────
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smartcare?schema=public

# ─── Redis ────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── JWT ──────────────────────────────────────
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ─── Bcrypt ───────────────────────────────────
BCRYPT_SALT_ROUNDS=12

# ─── Rate Limiting ────────────────────────────
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ─── Logging ──────────────────────────────────
LOG_LEVEL=info

# ─── CORS ─────────────────────────────────────
CORS_ORIGIN=http://localhost:5173

# ─── Bull Board (optional admin UI) ──────────
BULL_BOARD_ENABLED=true
BULL_BOARD_USER=admin
BULL_BOARD_PASSWORD=admin123
```

### 13.2 Validated Config Module

All environment variables are parsed and validated at startup using Zod. The app **fails fast** if any required variable is missing:

```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_BASE_URL: z.string().url(),
  CLIENT_URL: z.string().url(),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = validateEnv();
```

---

## 14. Frontend Architecture & Design System

The client application is a React Single Page Application (SPA) structured around a strict **flat minimal design system**, prioritizing clean utility over decorative elements.

### 14.1 Styling Principles

- **Flat Minimal Design:** The UI strictly adheres to a flat aesthetic. **Glassmorphism, gradients, and heavy drop shadows are explicitly forbidden.**
- **No Shadows:** A global CSS reset (`* { box-shadow: none !important; }`) ensures all components remain perfectly flat. Depth is communicated through color contrast and crisp borders (`hairline-gray`).
- **Color Palette:** A custom muted palette is defined in Tailwind, featuring `forest-ink`, `sage-wash`, `mist-blue`, `mint-veil`, `linen`, and `linen-white`. Generics like "indigo" and "slate" exist purely for legacy fallback during transition.
- **Typography:** Uses modern geometric/editorial fonts: `Inter` for standard UI elements and `Fraunces` for display/serif moments.

### 14.2 Component Architecture

- **Tailwind CSS:** Used exclusively for utility-first styling.
- **CSS Variables:** Core colors are mapped to CSS variables in `index.css` for consistent usage across utilities and base layers.
- **Base Components:** Elements like `.btn-primary` and `.card` are extracted into `@layer components` in `index.css` for reusability, maintaining the flat design requirements (e.g. `border border-hairline-gray shadow-none`).

---

## Appendix A — Security Checklist

| Concern | Solution |
|---|---|
| **XSS** | Helmet sets security headers; React escapes output by default |
| **CSRF** | SameSite cookies; token-based auth (no cookies for API) |
| **SQL Injection** | Prisma parameterized queries (never raw string interpolation) |
| **Brute Force** | `express-rate-limit` on auth endpoints; Redis-backed attempt counter |
| **Password Storage** | bcrypt with cost factor 12 |
| **Sensitive Data Exposure** | Access tokens short-lived (15 min); refresh rotation; no secrets in responses |
| **Broken Access Control** | Role middleware + resource-level ownership checks in services |
| **Request Validation** | Zod schemas on every mutable endpoint |
| **Dependency Vulnerabilities** | `npm audit` in CI; Dependabot alerts |

## Appendix B — Monitoring & Observability

| Concern | Tool |
|---|---|
| **Structured Logging** | Pino with JSON output → log aggregator (Render logs / Betterstack) |
| **Request Tracing** | Request ID generated in middleware, propagated through all layers |
| **Health Checks** | `GET /health` — checks PostgreSQL and Redis connectivity |
| **Audit Logs** | `AuditLog` table — tracks all mutations with actor, action, entity, timestamp |
| **Queue Monitoring** | BullMQ Dashboard (`@bull-board/express`) — optional admin route |
| **Error Tracking** | Sentry integration (future) |
| **Uptime Monitoring** | Render built-in + external (UptimeRobot) |

## Appendix C — Future Enhancements

| Feature | Notes |
|---|---|
| OCR Prescription Upload | Tesseract.js or cloud OCR API → parse medicine names → auto-create schedules |
| PDF Health Reports | `@react-pdf/renderer` or `puppeteer` → generate downloadable reports |
| WhatsApp/SMS Reminders | Twilio / WhatsApp Business API → pluggable notification transport |
| Multi-tenancy | Clinic-level data isolation via `clinicId` column + RLS |
| API Versioning | URL-based (`/api/v2/`) with deprecation headers |
| GraphQL Layer | Apollo Server alongside REST for flexible frontend queries |

---

> **Document maintained by:** SmartCare Engineering Team  
> **Review cadence:** Updated with each major architectural decision
