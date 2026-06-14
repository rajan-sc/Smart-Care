# SmartCare — API Design

> **Version:** 1.0  
> **Last Updated:** 2026-06-06  
> **Base URL:** `/api/v1`  
> **Auth:** Bearer JWT  
> **Validation:** Zod  
> **Format:** JSON

---

## Table of Contents

1. [API Conventions](#1-api-conventions)
2. [Auth Endpoints](#2-auth-endpoints)
3. [User Endpoints](#3-user-endpoints)
4. [Doctor Profile Endpoints](#4-doctor-profile-endpoints)
5. [Appointment Endpoints](#5-appointment-endpoints)
6. [Queue Endpoints](#6-queue-endpoints)
7. [Medicine Endpoints](#7-medicine-endpoints)
8. [Medication Log Endpoints](#8-medication-log-endpoints)
9. [Vitals Endpoints](#9-vitals-endpoints)
10. [Caregiver Endpoints](#10-caregiver-endpoints)
11. [Notification Endpoints](#11-notification-endpoints)
12. [Analytics Endpoints](#12-analytics-endpoints)
13. [Admin Endpoints](#13-admin-endpoints)
14. [Socket.IO Events](#14-socketio-events)
15. [Error Codes Reference](#15-error-codes-reference)

---

## 1. API Conventions

### 1.1 Versioning

All endpoints are prefixed with `/api/v1`. Breaking changes will increment the version (`/api/v2`). Non-breaking additions (new optional fields, new endpoints) are added to the current version.

### 1.2 Standard Response Envelope

Every response follows this structure:

**Success Response:**

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "email": "Invalid email format",
      "password": "Must be at least 8 characters"
    }
  }
}
```

### 1.3 Pagination

Offset-based pagination using query parameters:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `20` | Items per page (max: 100) |
| `sortBy` | string | `createdAt` | Field to sort by |
| `sortOrder` | string | `desc` | `asc` or `desc` |

### 1.4 Date Filtering

Date range filters use ISO 8601 format:

| Parameter | Type | Example |
|---|---|---|
| `startDate` | string (ISO 8601) | `2026-01-01T00:00:00Z` |
| `endDate` | string (ISO 8601) | `2026-01-31T23:59:59Z` |

### 1.5 Authentication

- All authenticated routes require `Authorization: Bearer <accessToken>` header
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days and are rotated on each use
- Public routes are explicitly marked

### 1.6 Rate Limiting

| Scope | Window | Max Requests |
|---|---|---|
| Global (per IP) | 1 minute | 100 |
| Auth endpoints | 15 minutes | 10 |
| Vitals recording | 1 minute | 30 |

Rate limit headers returned:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1717660800
```

### 1.7 Request Validation

All request bodies, query parameters, and path parameters are validated using Zod schemas. Validation errors return `400` with field-level error details.

### 1.8 CORS Configuration

```
Access-Control-Allow-Origin: <CORS_ORIGIN env var>
Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

---

## 2. Auth Endpoints

### 2.1 Register User

```
POST /api/v1/auth/register
```

**Auth:** Public

**Request Body:**

```json
{
  "email": "patient@example.com",
  "password": "SecureP@ss123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+919876543210",
  "role": "PATIENT"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | ✅ | Valid email, unique |
| `password` | string | ✅ | Min 8 chars, 1 upper, 1 lower, 1 number, 1 special |
| `firstName` | string | ✅ | 2–50 chars |
| `lastName` | string | ✅ | 2–50 chars |
| `phone` | string | ❌ | E.164 format |
| `role` | enum | ✅ | `PATIENT`, `DOCTOR`, `CAREGIVER` (ADMIN created via seed only) |

**Success Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "patient@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "PATIENT",
      "isVerified": false,
      "createdAt": "2026-06-06T08:00:00Z"
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid request body |
| 409 | `EMAIL_ALREADY_EXISTS` | Email already registered |

**Notes:**
- Password is hashed with bcrypt (12 salt rounds) before storage
- Verification email is queued via BullMQ (stretch goal)
- ADMIN role cannot be self-registered

---

### 2.2 Login

```
POST /api/v1/auth/login
```

**Auth:** Public

**Request Body:**

```json
{
  "email": "patient@example.com",
  "password": "SecureP@ss123"
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "patient@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "PATIENT",
      "isVerified": true
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing fields |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |
| 403 | `ACCOUNT_DEACTIVATED` | User soft-deleted or deactivated |

**Notes:**
- Previous refresh tokens for this user are NOT revoked (supports multi-device)
- Login creates an audit log entry

---

### 2.3 Refresh Token

```
POST /api/v1/auth/refresh
```

**Auth:** Public (but requires valid refresh token)

**Request Body:**

```json
{
  "refreshToken": "eyJhbG..."
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| 401 | `INVALID_REFRESH_TOKEN` | Token expired, revoked, or not found |
| 401 | `TOKEN_REUSE_DETECTED` | Token already used (entire family revoked) |

**Notes:**
- Old refresh token is revoked immediately (rotation)
- If a revoked token is reused, ALL tokens for that user are revoked (security measure)

---

### 2.4 Logout

```
POST /api/v1/auth/logout
```

**Auth:** Authenticated

**Request Body:**

```json
{
  "refreshToken": "eyJhbG..."
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

**Notes:**
- Revokes the specific refresh token
- Access token remains valid until expiry (stateless) — client should discard it

---

### 2.5 Get Current User

```
GET /api/v1/auth/me
```

**Auth:** Authenticated

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "patient@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+919876543210",
    "role": "PATIENT",
    "isVerified": true,
    "isActive": true,
    "createdAt": "2026-06-06T08:00:00Z",
    "updatedAt": "2026-06-06T08:00:00Z"
  }
}
```

---

### 2.6 Change Password

```
PATCH /api/v1/auth/change-password
```

**Auth:** Authenticated

**Request Body:**

```json
{
  "currentPassword": "OldP@ss123",
  "newPassword": "NewP@ss456"
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Weak password |
| 401 | `INVALID_CREDENTIALS` | Current password incorrect |
| 400 | `SAME_PASSWORD` | New password same as old |

**Notes:**
- All existing refresh tokens are revoked after password change
- Audit log entry created

---

## 3. User Endpoints

> **Access:** ADMIN only (except where noted)

### 3.1 List Users

```
GET /api/v1/users
```

**Auth:** ADMIN

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page |
| `role` | enum | — | Filter by role |
| `isActive` | boolean | — | Filter active/inactive |
| `search` | string | — | Search by name or email |
| `sortBy` | string | `createdAt` | Sort field |
| `sortOrder` | string | `desc` | `asc` or `desc` |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "PATIENT",
      "isVerified": true,
      "isActive": true,
      "createdAt": "2026-06-06T08:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### 3.2 Get User by ID

```
GET /api/v1/users/:id
```

**Auth:** ADMIN

**Success Response:** `200 OK`

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| 404 | `USER_NOT_FOUND` | User doesn't exist or is soft-deleted |

---

### 3.3 Update User

```
PATCH /api/v1/users/:id
```

**Auth:** ADMIN

**Request Body:**

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+919876543210",
  "isActive": false,
  "role": "DOCTOR"
}
```

All fields are optional.

**Success Response:** `200 OK`

**Notes:**
- Role changes trigger audit log
- Deactivating a user revokes all refresh tokens

---

### 3.4 Delete User (Soft)

```
DELETE /api/v1/users/:id
```

**Auth:** ADMIN

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "message": "User deactivated successfully"
  }
}
```

**Notes:**
- Sets `deletedAt` timestamp (soft delete)
- Revokes all refresh tokens
- User data is retained for audit trail

---

## 4. Doctor Profile Endpoints

### 4.1 List Doctors

```
GET /api/v1/doctors
```

**Auth:** Public

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `page` | integer | Page number |
| `limit` | integer | Items per page |
| `specialty` | string | Filter by specialty |
| `search` | string | Search by first name, last name, or specialty |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "firstName": "Jane",
      "lastName": "Smith",
      "doctorProfile": {
        "specialty": "Cardiology",
        "bio": "Experienced cardiologist...",
        "clinicAddress": "123 Medical Lane",
        "consultationFee": 500.00,
        "avgConsultationMinutes": 15
      }
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 25, "totalPages": 3 }
}
```

---

### 4.2 Get Doctor Profile

```
GET /api/v1/doctors/:id
```

**Auth:** Public

**Success Response:** `200 OK` — Doctor profile with availability slots

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "user": {
      "firstName": "Dr. Jane",
      "lastName": "Smith",
      "email": "drjane@example.com"
    },
    "specialization": "Cardiology",
    "clinicName": "Heart Care Clinic",
    "clinicAddress": "123 Medical Lane",
    "consultationFee": 500.00,
    "avgConsultationMinutes": 15,
    "availability": [
      {
        "id": "uuid",
        "dayOfWeek": "MONDAY",
        "startTime": "09:00",
        "endTime": "13:00",
        "maxPatients": 20,
        "isActive": true
      }
    ],
    "createdAt": "2026-06-06T08:00:00Z"
  }
}
```

---

### 4.3 Create / Update Own Doctor Profile

```
PUT /api/v1/doctors/profile
```

**Auth:** DOCTOR

**Request Body:**

```json
{
  "specialization": "Cardiology",
  "clinicName": "Heart Care Clinic",
  "clinicAddress": "123 Medical Lane, City",
  "consultationFee": 500.00,
  "avgConsultationMinutes": 15
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `specialization` | string | ✅ | 2–100 chars |
| `clinicName` | string | ✅ | 2–200 chars |
| `clinicAddress` | string | ❌ | Max 500 chars |
| `consultationFee` | decimal | ✅ | ≥ 0 |
| `avgConsultationMinutes` | integer | ✅ | 1–120 |

**Success Response:** `200 OK` (update) or `201 Created` (create)

**Notes:**
- Uses upsert — creates if profile doesn't exist, updates if it does
- Only the doctor themselves can modify their profile

---

### 4.4 Get Doctor Availability

```
GET /api/v1/doctors/:id/availability
```

**Auth:** Public

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "dayOfWeek": "MONDAY",
      "startTime": "09:00",
      "endTime": "13:00",
      "maxPatients": 20,
      "isActive": true
    },
    {
      "id": "uuid",
      "dayOfWeek": "WEDNESDAY",
      "startTime": "14:00",
      "endTime": "18:00",
      "maxPatients": 15,
      "isActive": true
    }
  ]
}
```

---

### 4.5 Set Availability Slots

```
PUT /api/v1/doctors/availability
```

**Auth:** DOCTOR

**Request Body:**

```json
{
  "slots": [
    {
      "dayOfWeek": "MONDAY",
      "startTime": "09:00",
      "endTime": "13:00",
      "maxPatients": 20,
      "isActive": true
    },
    {
      "dayOfWeek": "WEDNESDAY",
      "startTime": "14:00",
      "endTime": "18:00",
      "maxPatients": 15,
      "isActive": true
    }
  ]
}
```

**Success Response:** `200 OK`

**Notes:**
- Replaces ALL availability for the doctor (full replacement strategy)
- Validates `startTime < endTime`
- `maxPatients` determines appointment capacity per slot

---

## 5. Appointment Endpoints

### 5.1 Book Appointment

```
POST /api/v1/appointments
```

**Auth:** PATIENT

**Request Body:**

```json
{
  "doctorId": "uuid",
  "scheduledDate": "2026-06-10",
  "slotStart": "09:00",
  "slotEnd": "09:15",
  "type": "IN_PERSON",
  "notes": "Follow-up for BP medication"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `doctorId` | UUID | ✅ | Must exist, must be a DOCTOR |
| `scheduledDate` | date | ✅ | Must be today or future |
| `slotStart` | string (HH:mm) | ✅ | Within doctor's availability |
| `slotEnd` | string (HH:mm) | ✅ | Must be after slotStart |
| `type` | enum | ✅ | `IN_PERSON` or `TELECONSULT` |
| `notes` | string | ❌ | Max 500 chars |

**Success Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patientId": "uuid",
    "doctorId": "uuid",
    "scheduledDate": "2026-06-10",
    "slotStart": "09:00",
    "slotEnd": "09:15",
    "tokenNumber": 5,
    "status": "PENDING",
    "type": "IN_PERSON",
    "notes": "Follow-up for BP medication",
    "queueToken": {
      "id": "uuid",
      "tokenNumber": 5,
      "status": "WAITING",
      "estimatedWaitMinutes": 60
    },
    "createdAt": "2026-06-06T08:00:00Z"
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| 400 | `SLOT_NOT_AVAILABLE` | Doctor unavailable on that day/time |
| 400 | `SLOT_FULL` | Max patients reached for that slot |
| 409 | `DUPLICATE_APPOINTMENT` | Patient already has appointment with doctor on that date |
| 404 | `DOCTOR_NOT_FOUND` | Invalid doctorId |

**Notes:**
- Auto-generates a queue token number (sequential per doctor per date)
- Wait time estimated from `avgConsultationMinutes × position in queue`
- Appointment reminder job scheduled via BullMQ (30 min before)

---

### 5.2 List Own Appointments

```
GET /api/v1/appointments
```

**Auth:** PATIENT, DOCTOR, ADMIN

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `page` | integer | Page number |
| `limit` | integer | Items per page |
| `status` | enum | Filter: `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW` |
| `startDate` | date | Filter from date |
| `endDate` | date | Filter to date |
| `doctorId` | UUID | Filter by doctor (PATIENT/ADMIN) |
| `patientId` | UUID | Filter by patient (DOCTOR/ADMIN) |

**Success Response:** `200 OK` — Paginated list of appointments with doctor/patient info

**Notes:**
- PATIENT sees own appointments
- DOCTOR sees appointments where they are the doctor
- ADMIN sees all appointments

---

### 5.3 Get Appointment Details

```
GET /api/v1/appointments/:id
```

**Auth:** PATIENT (own), DOCTOR (own), ADMIN

**Success Response:** `200 OK` — Full appointment with doctor profile, patient info, and queue token

---

### 5.4 Update Appointment Status

```
PATCH /api/v1/appointments/:id/status
```

**Auth:** DOCTOR, ADMIN

**Request Body:**

```json
{
  "status": "CONFIRMED"
}
```

**Allowed State Transitions:**

```
PENDING → CONFIRMED → IN_PROGRESS → COMPLETED
PENDING → CANCELLED
CONFIRMED → CANCELLED
CONFIRMED → NO_SHOW
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| 400 | `INVALID_STATUS_TRANSITION` | Transition not allowed |
| 403 | `FORBIDDEN` | Not the assigned doctor |

**Notes:**
- Status change to `IN_PROGRESS` updates queue token status to `IN_PROGRESS`
- Status change to `COMPLETED` updates queue token to `COMPLETED` and broadcasts via Socket.IO

---

### 5.5 Cancel Appointment

```
PATCH /api/v1/appointments/:id/cancel
```

**Auth:** PATIENT (own), DOCTOR (assigned), ADMIN

**Request Body:**

```json
{
  "reason": "Unable to attend"
}
```

**Success Response:** `200 OK`

**Notes:**
- Sets `status = CANCELLED`, `cancelReason`, `cancelledBy`
- Queue token status set to `SKIPPED`
- Cancellation notification sent to the other party

---

### 5.6 Doctor's Today Appointments

```
GET /api/v1/appointments/doctor/today
```

**Auth:** DOCTOR

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "date": "2026-06-06",
    "totalAppointments": 15,
    "completed": 5,
    "remaining": 10,
    "currentToken": 6,
    "appointments": [
      {
        "id": "uuid",
        "tokenNumber": 1,
        "patient": { "firstName": "John", "lastName": "Doe" },
        "slotStart": "09:00",
        "status": "COMPLETED",
        "queueToken": { "status": "COMPLETED", "completedAt": "..." }
      }
    ]
  }
}
```

---

## 6. Queue Endpoints

### 6.1 Get Live Queue

```
GET /api/v1/queue/doctor/:doctorId/live
```

**Auth:** Public

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "doctorId": "uuid",
    "doctorName": "Dr. Jane Smith",
    "date": "2026-06-06",
    "currentToken": {
      "tokenNumber": 6,
      "status": "IN_PROGRESS",
      "calledAt": "2026-06-06T10:30:00Z"
    },
    "waitingCount": 8,
    "estimatedWaitMinutes": 120,
    "tokens": [
      {
        "id": "uuid",
        "tokenNumber": 5,
        "status": "COMPLETED",
        "completedAt": "2026-06-06T10:25:00Z"
      },
      {
        "id": "uuid",
        "tokenNumber": 6,
        "status": "IN_PROGRESS",
        "calledAt": "2026-06-06T10:30:00Z"
      },
      {
        "id": "uuid",
        "tokenNumber": 7,
        "status": "WAITING",
        "estimatedWaitMinutes": 15
      }
    ]
  }
}
```

**Notes:**
- This data is cached in Redis and updated on every queue state change
- Clients should also connect via Socket.IO for realtime updates

---

### 6.2 Get My Token Status

```
GET /api/v1/queue/my-token
```

**Auth:** PATIENT

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `date` | date | Optional, defaults to today |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "tokenNumber": 7,
    "status": "WAITING",
    "estimatedWaitMinutes": 15,
    "positionInQueue": 2,
    "doctorName": "Dr. Jane Smith",
    "appointment": {
      "id": "uuid",
      "slotStart": "09:00",
      "scheduledDate": "2026-06-06"
    }
  }
}
```

---

### 6.3 Call Next Patient

```
PATCH /api/v1/queue/tokens/:id/call
```

**Auth:** DOCTOR

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "tokenNumber": 7,
    "status": "IN_PROGRESS",
    "calledAt": "2026-06-06T10:45:00Z",
    "patient": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

**Notes:**
- Previous IN_PROGRESS token must be completed or skipped first
- Broadcasts `queue:called` event via Socket.IO
- Sends notification to the called patient

---

### 6.4 Complete Current Patient

```
PATCH /api/v1/queue/tokens/:id/complete
```

**Auth:** DOCTOR

**Success Response:** `200 OK`

**Notes:**
- Sets token status to `COMPLETED`, `completedAt = now()`
- Updates appointment status to `COMPLETED`
- Broadcasts `queue:completed` via Socket.IO
- Recalculates wait times for remaining tokens

---

### 6.5 Skip Patient

```
PATCH /api/v1/queue/tokens/:id/skip
```

**Auth:** DOCTOR

**Success Response:** `200 OK`

**Notes:**
- Sets token status to `SKIPPED`
- Broadcasts `queue:updated` via Socket.IO
- Sends notification to the skipped patient

---

## 7. Medicine Endpoints

### 7.1 Add Medicine Schedule

```
POST /api/v1/medicines
```

**Auth:** PATIENT

**Request Body:**

```json
{
  "name": "Amlodipine",
  "dosage": "5",
  "unit": "mg",
  "frequency": "TWICE_DAILY",
  "timings": ["08:00", "20:00"],
  "startDate": "2026-06-06",
  "endDate": "2026-09-06",
  "instructions": "Take after meals"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | string | ✅ | 2–200 chars |
| `dosage` | string | ✅ | Non-empty |
| `unit` | string | ✅ | e.g., `mg`, `ml`, `tablet` |
| `frequency` | enum | ✅ | `DAILY`, `TWICE_DAILY`, `THRICE_DAILY`, `WEEKLY`, `AS_NEEDED`, `CUSTOM` |
| `timings` | string[] | ✅ | Array of HH:mm times, min 1 |
| `startDate` | date | ✅ | Today or future |
| `endDate` | date | ❌ | Must be after startDate |
| `instructions` | string | ❌ | Max 500 chars |

**Success Response:** `201 Created`

**Notes:**
- Creates medication log entries for today via BullMQ job
- Daily cron job generates future logs

---

### 7.2 List Own Medicines

```
GET /api/v1/medicines
```

**Auth:** PATIENT, CAREGIVER (linked patients)

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `isActive` | boolean | Filter active/inactive |
| `patientId` | UUID | For CAREGIVER: linked patient ID |

**Success Response:** `200 OK` — List of medicines with frequency and timing info

---

### 7.3 Get Medicine Details

```
GET /api/v1/medicines/:id
```

**Auth:** PATIENT (own), CAREGIVER (linked), ADMIN

**Success Response:** `200 OK`

---

### 7.4 Update Medicine

```
PATCH /api/v1/medicines/:id
```

**Auth:** PATIENT (own)

**Request Body:** Same fields as create, all optional

**Notes:**
- If timings or frequency changes, future pending medication logs are regenerated
- Completed/taken logs are never modified

---

### 7.5 Deactivate Medicine

```
DELETE /api/v1/medicines/:id
```

**Auth:** PATIENT (own)

**Success Response:** `200 OK`

**Notes:**
- Sets `isActive = false` (soft delete)
- Cancels all future pending medication logs
- Historical logs are preserved

---

## 8. Medication Log Endpoints

### 8.1 List Medication Logs

```
GET /api/v1/medication-logs
```

**Auth:** PATIENT, CAREGIVER (linked)

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `page` | integer | Page number |
| `limit` | integer | Items per page |
| `startDate` | date | Filter from date |
| `endDate` | date | Filter to date |
| `status` | enum | `PENDING`, `TAKEN`, `SKIPPED`, `MISSED`, `SNOOZED` |
| `medicineId` | UUID | Filter by specific medicine |
| `patientId` | UUID | For CAREGIVER |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "medicine": {
        "id": "uuid",
        "name": "Amlodipine",
        "dosage": "5",
        "unit": "mg"
      },
      "scheduledAt": "2026-06-06T08:00:00Z",
      "takenAt": "2026-06-06T08:05:00Z",
      "status": "TAKEN",
      "notes": null
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 60, "totalPages": 3 }
}
```

---

### 8.2 Today's Schedule

```
GET /api/v1/medication-logs/today
```

**Auth:** PATIENT

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "date": "2026-06-06",
    "totalDoses": 6,
    "taken": 2,
    "pending": 3,
    "missed": 1,
    "logs": [
      {
        "id": "uuid",
        "medicine": { "name": "Amlodipine", "dosage": "5mg" },
        "scheduledAt": "2026-06-06T08:00:00Z",
        "status": "TAKEN",
        "takenAt": "2026-06-06T08:05:00Z"
      },
      {
        "id": "uuid",
        "medicine": { "name": "Metformin", "dosage": "500mg" },
        "scheduledAt": "2026-06-06T13:00:00Z",
        "status": "PENDING"
      }
    ]
  }
}
```

---

### 8.3 Mark as Taken

```
PATCH /api/v1/medication-logs/:id/take
```

**Auth:** PATIENT

**Request Body:**

```json
{
  "notes": "Took with lunch"
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "TAKEN",
    "takenAt": "2026-06-06T13:05:00Z",
    "notes": "Took with lunch"
  }
}
```

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| 400 | `ALREADY_TAKEN` | Log already marked as TAKEN |
| 403 | `FORBIDDEN` | Not the owner |

**Notes:**
- Idempotency: Re-marking as TAKEN returns the existing record without error (if `notes` unchanged)
- `takenAt` is set to server timestamp

---

### 8.4 Mark as Skipped

```
PATCH /api/v1/medication-logs/:id/skip
```

**Auth:** PATIENT

**Request Body:**

```json
{
  "notes": "Feeling nauseous"
}
```

**Success Response:** `200 OK`

---

### 8.5 Snooze Reminder

```
PATCH /api/v1/medication-logs/:id/snooze
```

**Auth:** PATIENT

**Request Body:**

```json
{
  "snoozeMinutes": 15
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `snoozeMinutes` | integer | ✅ | 5, 10, 15, 30 (allowed values) |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "SNOOZED",
    "snoozeUntil": "2026-06-06T08:15:00Z"
  }
}
```

**Notes:**
- Reschedules the BullMQ reminder job
- Maximum 3 snoozes per dose

---

## 9. Vitals Endpoints

### 9.1 Record Vital

```
POST /api/v1/vitals
```

**Auth:** PATIENT

**Request Body (example — blood pressure):**

```json
{
  "type": "BLOOD_PRESSURE",
  "systolic": 140,
  "diastolic": 90,
  "notes": "Measured after morning walk",
  "recordedAt": "2026-06-06T08:00:00Z"
}
```

**Request Body (example — glucose):**

```json
{
  "type": "GLUCOSE",
  "glucoseLevel": 180.5,
  "unit": "mg/dL",
  "notes": "Fasting glucose"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `type` | enum | ✅ | `BLOOD_PRESSURE`, `GLUCOSE`, `PULSE`, `WEIGHT`, `TEMPERATURE`, `OXYGEN_SATURATION` |
| `systolic` | integer | conditional | Required if type = BLOOD_PRESSURE (60–300) |
| `diastolic` | integer | conditional | Required if type = BLOOD_PRESSURE (30–200) |
| `glucoseLevel` | decimal | conditional | Required if type = GLUCOSE (20–600) |
| `pulseRate` | integer | conditional | Required if type = PULSE (30–250) |
| `weight` | decimal | conditional | Required if type = WEIGHT (1–500) |
| `temperature` | decimal | conditional | Required if type = TEMPERATURE (30–45) |
| `oxygenSaturation` | integer | conditional | Required if type = OXYGEN_SATURATION (50–100) |
| `unit` | string | ❌ | e.g., `mmHg`, `mg/dL`, `bpm`, `kg`, `°C`, `%` |
| `notes` | string | ❌ | Max 500 chars |
| `recordedAt` | datetime | ❌ | Defaults to now(), must not be in future |

**Success Response:** `201 Created`

**Notes:**
- If vital exceeds alert thresholds (e.g., systolic > 180), a caregiver alert is triggered
- Alert thresholds:
  - BP: systolic > 180 or < 90, diastolic > 120 or < 60
  - Glucose: > 300 or < 70
  - Pulse: > 150 or < 50
  - Oxygen: < 90

---

### 9.2 List Vitals

```
GET /api/v1/vitals
```

**Auth:** PATIENT, DOCTOR (patients), CAREGIVER (linked), ADMIN

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `page` | integer | Page number |
| `limit` | integer | Items per page |
| `type` | enum | Filter by vital type |
| `startDate` | datetime | Filter from |
| `endDate` | datetime | Filter to |
| `patientId` | UUID | For DOCTOR/CAREGIVER/ADMIN |

**Success Response:** `200 OK`

---

### 9.3 Get Latest Vitals

```
GET /api/v1/vitals/latest
```

**Auth:** PATIENT, CAREGIVER (linked)

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "BLOOD_PRESSURE": {
      "systolic": 130,
      "diastolic": 85,
      "recordedAt": "2026-06-06T08:00:00Z"
    },
    "GLUCOSE": {
      "glucoseLevel": 120.5,
      "recordedAt": "2026-06-05T07:30:00Z"
    },
    "PULSE": {
      "pulseRate": 72,
      "recordedAt": "2026-06-06T08:00:00Z"
    },
    "WEIGHT": {
      "weight": 75.5,
      "recordedAt": "2026-06-01T07:00:00Z"
    }
  }
}
```

---

### 9.4 Get Vitals Trends

```
GET /api/v1/vitals/trends
```

**Auth:** PATIENT, CAREGIVER (linked)

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `type` | enum | Required — vital type |
| `period` | enum | `7d`, `30d`, `90d`, `1y` |
| `patientId` | UUID | For CAREGIVER |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "type": "BLOOD_PRESSURE",
    "period": "30d",
    "dataPoints": [
      {
        "date": "2026-05-07",
        "avgSystolic": 135,
        "avgDiastolic": 88,
        "minSystolic": 120,
        "maxSystolic": 150
      }
    ],
    "summary": {
      "avgSystolic": 132,
      "avgDiastolic": 85,
      "trend": "STABLE"
    }
  }
}
```

**Notes:**
- Data is aggregated per day for charting
- Trend is calculated: `IMPROVING`, `STABLE`, `WORSENING`

---

## 10. Caregiver Endpoints

### 10.1 Link Caregiver to Patient

```
POST /api/v1/caregivers/link
```

**Auth:** PATIENT

**Request Body:**

```json
{
  "caregiverEmail": "caregiver@example.com",
  "relationship": "Spouse",
  "permissions": ["VIEW_VITALS", "VIEW_MEDICATIONS", "RECEIVE_ALERTS"]
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `caregiverEmail` | string | ✅ | Must be a registered user with CAREGIVER role |
| `relationship` | string | ✅ | e.g., Spouse, Parent, Child, Sibling, Other |
| `permissions` | string[] | ✅ | Array of: `VIEW_VITALS`, `VIEW_MEDICATIONS`, `VIEW_APPOINTMENTS`, `RECEIVE_ALERTS` |

**Success Response:** `201 Created`

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| 404 | `CAREGIVER_NOT_FOUND` | Email not registered or not a CAREGIVER |
| 409 | `LINK_ALREADY_EXISTS` | Caregiver already linked to patient |
| 400 | `SELF_LINK_NOT_ALLOWED` | Cannot link yourself |

---

### 10.2 Get My Caregivers

```
GET /api/v1/caregivers/my-caregivers
```

**Auth:** PATIENT

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "status": "ACTIVE",
      "relationship": "Spouse",
      "permissions": ["VIEW_VITALS"],
      "caregiver": {
        "id": "uuid",
        "firstName": "Jane",
        "lastName": "Doe",
        "email": "caregiver@example.com"
      }
    }
  ]
}
```

---

### 10.3 Get Linked Patients

```
GET /api/v1/caregivers/patients
```

**Auth:** CAREGIVER

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "patient": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe"
      },
      "relationship": "Spouse",
      "permissions": ["VIEW_VITALS", "VIEW_MEDICATIONS", "RECEIVE_ALERTS"],
      "isActive": true,
      "createdAt": "2026-06-01T00:00:00Z"
    }
  ]
}
```

---

### 10.3 View Patient Vitals

```
GET /api/v1/caregivers/patients/:patientId/vitals
```

**Auth:** CAREGIVER (must have `VIEW_VITALS` permission for this patient)

**Query Parameters:** Same as vitals list endpoint

**Success Response:** `200 OK`

**Error Responses:**

| Status | Code | Condition |
|---|---|---|
| 403 | `INSUFFICIENT_PERMISSIONS` | Caregiver doesn't have VIEW_VITALS permission |
| 404 | `LINK_NOT_FOUND` | No active link between caregiver and patient |

---

### 10.4 View Patient Medications

```
GET /api/v1/caregivers/patients/:patientId/medications
```

**Auth:** CAREGIVER (must have `VIEW_MEDICATIONS` permission)

**Success Response:** `200 OK` — List of medicines with today's logs

---

### 10.6 Get Patient Appointments

GET /api/v1/caregivers/patients/:patientId/appointments

**Auth:** CAREGIVER (must have `VIEW_APPOINTMENTS` permission)

Returns the upcoming and past appointments for the linked patient.

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "date": "2026-06-15T10:00:00.000Z",
      "status": "CONFIRMED",
      "doctor": { "firstName": "John", "lastName": "Doe" }
    }
  ]
}
```

### 10.7 Remove Caregiver Link

```
DELETE /api/v1/caregivers/links/:id
```

**Auth:** PATIENT

**Success Response:** `200 OK`

**Notes:**
- Sets `status = "REJECTED"` (soft deactivation)
- Caregiver immediately loses access to patient data

---

## 11. Notification Endpoints

### 11.1 List Notifications

```
GET /api/v1/notifications
```

**Auth:** Authenticated

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `page` | integer | Page number |
| `limit` | integer | Items per page |
| `type` | enum | Filter by notification type |
| `isRead` | boolean | Filter read/unread |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "MEDICATION_REMINDER",
      "title": "Time for your medicine",
      "message": "Take Amlodipine 5mg",
      "isRead": false,
      "metadata": {
        "medicineId": "uuid",
        "medicationLogId": "uuid"
      },
      "createdAt": "2026-06-06T08:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 }
}
```

---

### 11.2 Mark as Read

```
PATCH /api/v1/notifications/:id/read
```

**Auth:** Authenticated (own only)

**Success Response:** `200 OK`

---

### 11.3 Mark All as Read

```
PATCH /api/v1/notifications/read-all
```

**Auth:** Authenticated

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "updatedCount": 12
  }
}
```

---

### 11.4 Get Unread Count

```
GET /api/v1/notifications/unread-count
```

**Auth:** Authenticated

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "unreadCount": 5
  }
}
```

**Notes:**
- This value is also pushed via Socket.IO when notifications are created

---

## 12. Analytics Endpoints

### 12.1 Dashboard Summary

```
GET /api/v1/analytics/dashboard
```

**Auth:** Authenticated

**Success Response (PATIENT):** `200 OK`

```json
{
  "success": true,
  "data": {
    "todayMedications": {
      "total": 6,
      "taken": 4,
      "pending": 1,
      "missed": 1
    },
    "adherenceRate": 85.5,
    "upcomingAppointment": {
      "doctorName": "Dr. Jane Smith",
      "date": "2026-06-10",
      "tokenNumber": 5
    },
    "latestVitals": {
      "bloodPressure": { "systolic": 130, "diastolic": 85 },
      "glucose": 120.5,
      "pulse": 72
    },
    "alerts": 2
  }
}
```

**Success Response (DOCTOR):** `200 OK`

```json
{
  "success": true,
  "data": {
    "todayAppointments": {
      "total": 15,
      "completed": 5,
      "remaining": 10,
      "currentToken": 6
    },
    "weeklyPatients": 52,
    "averageWaitTime": 18,
    "monthlyCompletionRate": 92.3
  }
}
```

**Notes:**
- Results are cached in Redis (TTL: 1 hour)
- Nightly precomputation job updates heavy aggregations
- Real-time data (today's stats) computed on request

---

### 12.2 Medication Adherence Stats

```
GET /api/v1/analytics/adherence
```

**Auth:** PATIENT, CAREGIVER (linked), DOCTOR, ADMIN

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `period` | enum | `7d`, `30d`, `90d` |
| `patientId` | UUID | For CAREGIVER/DOCTOR/ADMIN |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "period": "30d",
    "overallAdherence": 85.5,
    "totalDoses": 180,
    "taken": 154,
    "missed": 18,
    "skipped": 8,
    "dailyBreakdown": [
      {
        "date": "2026-06-05",
        "total": 6,
        "taken": 5,
        "missed": 1,
        "adherence": 83.3
      }
    ],
    "byMedicine": [
      {
        "medicineId": "uuid",
        "name": "Amlodipine",
        "adherence": 92.0,
        "taken": 56,
        "missed": 4,
        "skipped": 0
      }
    ],
    "currentStreak": 5,
    "longestStreak": 14
  }
}
```

---

### 12.3 Vitals Summary Stats

```
GET /api/v1/analytics/vitals-summary
```

**Auth:** PATIENT, CAREGIVER (linked)

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `period` | enum | `7d`, `30d`, `90d` |
| `patientId` | UUID | For CAREGIVER |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "bloodPressure": {
      "avgSystolic": 132,
      "avgDiastolic": 85,
      "trend": "IMPROVING",
      "readings": 25,
      "highReadings": 3
    },
    "glucose": {
      "avgLevel": 125.3,
      "trend": "STABLE",
      "readings": 20,
      "highReadings": 2,
      "lowReadings": 0
    },
    "pulse": {
      "avgRate": 74,
      "trend": "STABLE",
      "readings": 25
    }
  }
}
```

---

### 12.4 Appointment Summary Stats

```
GET /api/v1/analytics/appointments-summary
```

**Auth:** DOCTOR, ADMIN

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `period` | enum | `7d`, `30d`, `90d` |
| `doctorId` | UUID | For ADMIN |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "totalAppointments": 120,
    "completed": 105,
    "cancelled": 10,
    "noShow": 5,
    "completionRate": 87.5,
    "avgWaitTimeMinutes": 22,
    "busiestDay": "MONDAY",
    "peakHour": "10:00"
  }
}
```

---

## 13. Admin Endpoints

### 13.1 System Stats

```
GET /api/v1/admin/stats
```

**Auth:** ADMIN

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "users": {
      "total": 500,
      "patients": 400,
      "doctors": 50,
      "caregivers": 45,
      "admins": 5,
      "activeToday": 120
    },
    "appointments": {
      "today": 85,
      "thisWeek": 340,
      "completionRate": 91.2
    },
    "medications": {
      "activeMedicines": 1200,
      "todayAdherence": 87.5
    },
    "vitals": {
      "recordedToday": 250,
      "alertsToday": 8
    }
  }
}
```

---

### 13.2 Audit Logs

```
GET /api/v1/admin/audit-logs
```

**Auth:** ADMIN

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `page` | integer | Page number |
| `limit` | integer | Items per page |
| `userId` | UUID | Filter by user |
| `action` | string | Filter by action (e.g., `LOGIN`, `CREATE`, `UPDATE`, `DELETE`) |
| `entity` | string | Filter by entity (e.g., `User`, `Appointment`) |
| `startDate` | datetime | Filter from |
| `endDate` | datetime | Filter to |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "email": "admin@example.com",
        "firstName": "Admin"
      },
      "action": "UPDATE",
      "entity": "User",
      "entityId": "uuid",
      "oldValues": { "role": "PATIENT" },
      "newValues": { "role": "DOCTOR" },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-06-06T08:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 500, "totalPages": 25 }
}
```

---

## 14. Socket.IO Events

### 14.1 Connection

Clients connect to the Socket.IO server with JWT authentication:

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'Bearer eyJhbG...'
  }
});
```

The server validates the JWT on handshake. Invalid tokens result in connection rejection.

### 14.2 Queue Events

| Event | Direction | Room | Payload | Description |
|---|---|---|---|---|
| `queue:join` | Client → Server | — | `{ doctorId: string }` | Join a doctor's queue room |
| `queue:leave` | Client → Server | — | `{ doctorId: string }` | Leave a doctor's queue room |
| `queue:updated` | Server → Client | `queue:doctor:{id}` | `{ tokens: QueueToken[], currentToken: QueueToken, waitingCount: number }` | Queue state changed |
| `queue:called` | Server → Client | `queue:doctor:{id}` | `{ tokenNumber: number, patientName: string }` | Patient called |
| `queue:completed` | Server → Client | `queue:doctor:{id}` | `{ tokenNumber: number }` | Patient completed |
| `queue:skipped` | Server → Client | `queue:doctor:{id}` | `{ tokenNumber: number }` | Patient skipped |

### 14.3 Notification Events

| Event | Direction | Room | Payload | Description |
|---|---|---|---|---|
| `notification:new` | Server → Client | `user:{userId}` | `{ id, type, title, message, metadata, createdAt }` | New notification created |
| `notification:count` | Server → Client | `user:{userId}` | `{ unreadCount: number }` | Unread count updated |

### 14.4 Rooms

On successful connection, the server automatically joins the user to:

- `user:{userId}` — Personal notification room

Clients can manually join:

- `queue:doctor:{doctorId}` — To watch a doctor's live queue

---


---

## 16. Medical Record Endpoints

### 16.1 Upload Medical Record

```
POST /api/v1/medical-records
```

**Auth:** Patient Only (Bearer Token)
**Content-Type:** `multipart/form-data`

**Request Body:**
- `file`: File blob (max 10MB)
- `name`: string

**Success Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Blood Test Report",
    "fileUrl": "https://s3.amazonaws.com/bucket/medical_records/user-id/file.pdf",
    "createdAt": "2026-06-14T10:00:00Z"
  },
  "message": "Medical record uploaded successfully"
}
```

### 16.2 Get My Records

```
GET /api/v1/medical-records
```

**Auth:** Patient Only

### 16.3 Delete Record

```
DELETE /api/v1/medical-records/:id
```

**Auth:** Patient Only

---

## 17. Payment Endpoints

### 17.1 Create Order

```
POST /api/v1/payments/orders
```

**Auth:** User

**Request Body:**
```json
{
  "appointmentId": "uuid"
}
```

### 17.2 Verify Payment

```
POST /api/v1/payments/verify
```

**Auth:** User

**Request Body:**
```json
{
  "orderId": "string"
}
```

## 15. Error Codes Reference
16. Medical Record Endpoints
17. Payment Endpoints


### HTTP Status Codes

| Status | Usage |
|---|---|
| `200` | Successful GET, PATCH, PUT, DELETE |
| `201` | Successful POST (resource created) |
| `400` | Validation error, bad request |
| `401` | Unauthenticated (missing/invalid token) |
| `403` | Unauthorized (insufficient role/permissions) |
| `404` | Resource not found |
| `409` | Conflict (duplicate resource, state conflict) |
| `429` | Rate limited |
| `500` | Internal server error |

### Application Error Codes

| Code | Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body/params failed Zod validation |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `UNAUTHORIZED` | 401 | Missing or expired access token |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token invalid or expired |
| `TOKEN_REUSE_DETECTED` | 401 | Revoked refresh token reused (all tokens revoked) |
| `FORBIDDEN` | 403 | Insufficient role permissions |
| `INSUFFICIENT_PERMISSIONS` | 403 | Caregiver lacks specific permission |
| `ACCOUNT_DEACTIVATED` | 403 | User is soft-deleted or deactivated |
| `NOT_FOUND` | 404 | Generic resource not found |
| `USER_NOT_FOUND` | 404 | Specific user not found |
| `DOCTOR_NOT_FOUND` | 404 | Doctor profile not found |
| `APPOINTMENT_NOT_FOUND` | 404 | Appointment not found |
| `LINK_NOT_FOUND` | 404 | Caregiver link not found |
| `EMAIL_ALREADY_EXISTS` | 409 | Email already registered |
| `DUPLICATE_APPOINTMENT` | 409 | Duplicate appointment for same doctor/date |
| `LINK_ALREADY_EXISTS` | 409 | Caregiver link already exists |
| `ALREADY_TAKEN` | 409 | Medication log already marked taken |
| `SLOT_NOT_AVAILABLE` | 400 | Doctor not available on that slot |
| `SLOT_FULL` | 400 | Maximum patients reached for slot |
| `INVALID_STATUS_TRANSITION` | 400 | Appointment/queue status change not allowed |
| `SELF_LINK_NOT_ALLOWED` | 400 | Cannot link caregiver to self |
| `SAME_PASSWORD` | 400 | New password same as old |
| `ALREADY_VERIFIED` | 409 | Email already verified |
| `INVALID_TOKEN` | 400 | Verification token invalid |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
