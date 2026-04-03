# SHCW2026 Passport / Registration / Verification Flow

> System documentation for the Climate Passport, event registration, QR code generation, and check-in verification subsystems.

---

## 1. Data Model Overview

### RegistrationStatus Enum

| Value | Meaning |
|---|---|
| `PENDING_APPROVAL` | 待审批 — user registered but admin has not yet approved |
| `REGISTERED` | 已批准/已报名 — approved or auto-approved; user may attend |
| `CANCELLED` | 已取消 — user-cancelled registration |
| `ATTENDED` | 已入场 — on-site check-in completed |
| `WAITLIST` | 候补名单 — capacity full, user is on the waitlist |
| `REJECTED` | 已拒绝 — admin rejected the registration |

### Registration Model (key fields)

| Field | Type | Purpose |
|---|---|---|
| `userId + eventId` | Unique compound | One registration per user per event |
| `status` | `RegistrationStatus` | Current lifecycle state |
| `notes` | `String?` | Free-form attendee notes |
| `dietaryReq` | `String?` | Dietary requirements |
| `checkedInAt` | `DateTime?` | Timestamp of on-site check-in |
| `checkedInBy` | `String?` | User ID of the verifier who scanned |
| `checkInMethod` | `String?` | `QR_CODE` or `MANUAL` |
| `pointsEarned` | `Int` | Points awarded at check-in |

### Event Model (registration-relevant fields)

| Field | Type | Purpose |
|---|---|---|
| `maxAttendees` | `Int?` | Capacity cap (null = unlimited) |
| `requireApproval` | `Boolean` | If `true`, registrations start as `PENDING_APPROVAL` |
| `isPublished` | `Boolean` | Only published events accept registrations |
| `type` | `String` | `forum`, `workshop`, `ceremony`, `conference`, `networking` — drives point rewards |
| `startDate / endDate` | `DateTime` | Event date range |
| `startTime / endTime` | `String` | HH:mm format, used with `startDate` for time window calculations |

### User Model (passport-relevant fields)

| Field | Type | Purpose |
|---|---|---|
| `passCode` | `String` (unique, uuid) | Secret code embedded in passport QR |
| `climatePassportId` | `String?` (unique) | Public ID, format `SCW2026-XXXXXX` |
| `points` | `Int` | Cumulative reward points |

---

## 2. Registration Flow

**Endpoint:** `POST /api/events/[id]/register`  
**Auth:** Requires authenticated session (`session.user.id`).

### Business Logic

1. **Event validation** — must exist and `isPublished === true`.
2. **Duplicate check** — looks up existing registration by `(userId, eventId)`. Allows re-registration only if previous status is `CANCELLED` or `REJECTED` (updates existing row instead of creating a new one).
3. **Initial status decision:**
   - `event.requireApproval === true` → `PENDING_APPROVAL`
   - `event.requireApproval === false` → `REGISTERED`
4. **Capacity check (auto-approve events only):**
   - When `maxAttendees` is set AND `requireApproval === false`, a Prisma `$transaction` counts active registrations (`REGISTERED`, `ATTENDED`, `WAITLIST`) and rejects if `>=` capacity.
   - When `requireApproval === true`, capacity is not checked at registration time — it is deferred to the approval step.
   - When `maxAttendees` is null, no capacity check.
5. **Wishlist cleanup** — on successful registration, any wishlist entry for the same `(userId, eventId)` is deleted.
6. **Re-registration reset** — when updating a previously cancelled/rejected registration, `checkedInAt`, `checkedInBy`, and `checkInMethod` are reset to null.

### Status Transitions at Registration

```
(no record / CANCELLED / REJECTED)
    │
    ├── requireApproval=false ──► REGISTERED
    │
    └── requireApproval=true  ──► PENDING_APPROVAL
```

---

## 3. Batch Approval / Rejection Flow

**Endpoint:** `PATCH /api/events/[id]/registrations`  
**Auth:** Requires `canManageEvents` role (ADMIN, STAFF, EVENT_MANAGER).

### Request Body

```json
{
  "registrationIds": ["id1", "id2", ...],
  "action": "approve" | "reject"
}
```

### Approval Logic

1. Only registrations with status `PENDING_APPROVAL` belonging to the target event are considered valid.
2. **Capacity check (approve only):** Runs inside a `$transaction`. Counts current approved registrations (`REGISTERED` + `ATTENDED`). If `currentApproved + batchSize > maxAttendees`, the entire batch is rejected with a `409` and a `remaining` count is returned. No partial approval.
3. Approved registrations transition: `PENDING_APPROVAL → REGISTERED`.

### Rejection Logic

- Filtered to `PENDING_APPROVAL` only.
- No capacity check needed.
- Rejected registrations transition: `PENDING_APPROVAL → REJECTED`.

### Status Transitions at Approval

```
PENDING_APPROVAL
    ├── approve ──► REGISTERED
    └── reject  ──► REJECTED
```

---

## 4. Climate Passport Module

**File:** `lib/climate-passport.ts`

### Constants

| Constant | Value | Purpose |
|---|---|---|
| `EVENT_PASS_ENTRY_WINDOW_MS` | 90 minutes (5,400,000 ms) | How early before event start a QR code becomes active |
| `EVENT_PASS_QR_TTL_MS` | 60 seconds (60,000 ms) | Time-to-live for event QR codes (anti-screenshot) |

### EventPassState Enum

| State | Condition |
|---|---|
| `checkedIn` | `checkedInAt` is set (takes priority over all others) |
| `expired` | Current time is past the end time of the last event day |
| `upcoming` | Current time is before the current or next event day's start time minus 90 minutes |
| `active` | Between the current or next event day's start time minus 90 minutes and that day's end time |
| `pendingApproval` | (UI-level only, not computed by `getEventPassState`) |
| `rejected` | (UI-level only) |

### Key Functions

| Function | Purpose |
|---|---|
| `combineEventDateTime(date, time)` | Merges a `Date` and `HH:mm` string into a single `Date` |
| `getEventDurationMinutes(date, start, end)` | Calculates event length in minutes |
| `getEventTotalDurationMinutes(event)` | Sums total learning minutes across all scheduled event days |
| `getEventPassState(event, now?)` | Returns the current pass state for time-gated QR display |
| `formatLearningHours(minutes, locale)` | Formats accumulated learning time (zh/en) |
| `buildPassportAchievements(input, locale)` | Builds the 6 achievement badges for the passport UI |

### Multi-day Event Schedule

- Events can now store `eventDateSlots`, one row per event day.
- Each slot contains `scheduleDate`, `startTime`, and `endTime`.
- Event display helpers and QR gating logic normalize these slots so the same per-day schedule is used across:
  - public event pages
  - dashboard schedule and event pass
  - QR generation and check-in validation
  - climate passport learning-hour calculation

### Achievement System (6 badges)

| ID | Unlock Condition |
|---|---|
| `passport-issued` | User has a climate passport |
| `first-registration` | `registeredCount >= 1` |
| `on-site-participant` | `attendedCount >= 1` |
| `community-connector` | `registeredCount + wishlistCount >= 4` |
| `point-pioneer` | `points >= 20` |
| `steady-learner` | `learningMinutes >= 120` (2 hours) |

---

## 5. QR Code Generation

**Endpoint:** `GET /api/qrcode?type=passport|event&eventId=xxx`  
**Auth:** Requires authenticated session.

### QR Type: `passport`

- **Format:** `SCW2026://PASSPORT/{userId}/{passCode}`
- **No expiry** — the passport QR is static; passCode is a UUID secret.
- **No time-gating** — always available.
- Returns SVG (400px, 2px margin).

### QR Type: `event`

- **Format:** `SCW2026://EVENT/{eventId}/{userId}/{registrationId}/{timestamp}`
- **Pre-conditions checked:**
  - Registration exists and is not `CANCELLED`, `PENDING_APPROVAL`, or `REJECTED`.
  - Pass state is `active` (not `upcoming`, `expired`, or `checkedIn`).
- **Timestamp:** `Date.now()` embedded in the QR data — used by the check-in endpoint to enforce 60-second TTL.
- Returns SVG with `expiresInMs: 60000` so the frontend can auto-refresh.

### QR Validation Matrix (event type)

| Registration Status | Pass State | Result |
|---|---|---|
| `CANCELLED` | any | 403 — registration cancelled |
| `PENDING_APPROVAL` | any | 403 — pending approval |
| `REJECTED` | any | 403 — rejected |
| `REGISTERED` | `upcoming` | 403 — not active yet |
| `REGISTERED` | `expired` | 403 — event ended |
| `REGISTERED` | `checkedIn` | 403 — already used |
| `REGISTERED` | `active` | 200 — QR generated |

---

## 6. Check-in / Verification Flow

**Endpoint:** `POST /api/checkin`  
**Auth:** Requires role `ADMIN`, `STAFF`, or `VERIFIER`.

### Request Body

```json
{
  "qrData": "SCW2026://...",
  "eventId": "optional-target-event-id"
}
```

### QR Parsing

Two regex patterns are matched:

| Pattern | Format | Handler |
|---|---|---|
| `SCW2026://PASSPORT/{userId}/{passCode}` | Passport verification | `verifyPassport()` |
| `SCW2026://EVENT/{eventId}/{userId}/{registrationId}/{timestamp}` | Event check-in | `verifyAndCheckIn()` |

### Passport Verification (`verifyPassport`)

- Looks up user by `(id, passCode)` pair.
- **Read-only** — does not modify any data.
- Returns user profile info (name, email, role, org, passport ID, avatar).

### Event Check-in (`verifyAndCheckIn`)

**Validation chain (in order):**

1. **QR TTL check** — `Date.now() - timestamp > 60,000ms` → expired QR, must regenerate.
2. **Event ID match** — if `targetEventId` is provided, must match the QR's `eventId`.
3. **Registration lookup** — by `(registrationId, userId, eventId)` triple.
4. **Status gate** — rejects `CANCELLED`, `PENDING_APPROVAL`, `REJECTED`.
5. **Time window** — rejects `upcoming` and `expired` pass states.
6. **Already checked in** — if `checkedInAt` is set, returns success with `alreadyCheckedIn: true` (idempotent).

**Check-in transaction (4 operations, atomic):**

1. **Double-check guard** — re-reads `checkedInAt` inside the transaction to prevent concurrent double check-in.
2. **Update registration** — sets `status=ATTENDED`, `checkedInAt=now()`, `checkedInBy=verifierId`, `checkInMethod=QR_CODE`, `pointsEarned`.
3. **Create CheckIn record** — audit log entry with `userId`, `eventId`, `scannedBy`, `method`.
4. **Increment user points** — `user.points += pointsToAward`.
5. **Create PointTransaction** — detailed ledger entry with `type=EVENT_ATTENDANCE`, description, `createdBy`.

### Points System

| Event Type | Points Awarded |
|---|---|
| `ceremony` | 20 |
| `forum` | 15 |
| `conference` | 15 |
| `workshop` | 10 |
| `networking` | 5 |
| Unknown / other | 10 (fallback) |

### Concurrency Safety

- The check-in transaction re-reads `checkedInAt` inside the `$transaction` block. If another request completed check-in between the outer read and the transaction, the second request returns `alreadyCheckedIn: true` without awarding duplicate points.

---

## 7. Complete Status Lifecycle

```
┌─────────────────┐
│   User clicks   │
│   "Register"    │
└────────┬────────┘
         │
         ▼
  ┌──────────────┐     requireApproval=true     ┌──────────────────┐
  │  REGISTERED  │◄────────────────────────────  │ PENDING_APPROVAL │
  │              │        admin approves         │                  │
  └──────┬───────┘                               └────────┬─────────┘
         │                                                │
         │ on-site QR scan                    admin rejects│
         ▼                                                ▼
  ┌──────────────┐                               ┌──────────────┐
  │   ATTENDED   │                               │   REJECTED   │
  │  (+points)   │                               │              │
  └──────────────┘                               └──────────────┘

  Any active state ──user cancels──► CANCELLED

  CANCELLED / REJECTED ──re-register──► REGISTERED or PENDING_APPROVAL
```

---

## 8. Security Measures

| Mechanism | Purpose |
|---|---|
| **Session auth (NextAuth)** | All endpoints require `getServerSession` — no anonymous access |
| **Role-based access** | Check-in: `ADMIN/STAFF/VERIFIER` only. Approval: `canManageEvents()` |
| **passCode (UUID)** | Secret embedded in passport QR — not the public `climatePassportId` |
| **QR TTL (60s)** | Event QR codes expire in 60 seconds to prevent screenshot reuse |
| **Time-gated QR generation** | Event QRs can only be generated within the 90-min entry window |
| **Prisma $transaction** | Capacity checks and check-in operations are atomic, preventing race conditions |
| **Double check-in guard** | Transaction re-reads `checkedInAt` to prevent concurrent duplicate awards |
| **Compound unique index** | `(userId, eventId)` prevents duplicate registrations at the DB level |
| **Status gating** | QR generation and check-in both independently validate registration status |
| **Custom URI scheme** | `SCW2026://` prefix with regex parsing — rejects malformed QR data |

---

## 9. API Quick Reference

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| `POST` | `/api/events/[id]/register` | Register for an event | User session |
| `GET` | `/api/events/[id]/registrations` | List registrations (admin) | `canManageEvents` |
| `PATCH` | `/api/events/[id]/registrations` | Batch approve/reject | `canManageEvents` |
| `GET` | `/api/qrcode?type=passport` | Generate passport QR | User session |
| `GET` | `/api/qrcode?type=event&eventId=x` | Generate event pass QR | User session |
| `POST` | `/api/checkin` | Scan & verify QR code | `ADMIN/STAFF/VERIFIER` |
