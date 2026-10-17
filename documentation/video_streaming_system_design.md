# Video Streaming System: Design Document

**Audience:** the implementation agent (and the product owner).
**Purpose:** fix requirements, architecture, failure handling and invariants *before* any code is written.
**How to use it:** read it fully, then produce the implementation plan. Section 14 (Hard Rules) is non-negotiable. Section 15 lists what is verified against vendor docs and what you must still verify or test.

Product: paid recorded video lectures for a cooking teacher. Users are mostly on mobile in India (mid and low-end Android, some iPhone, patchy 4G, many opening links from WhatsApp/Instagram). Offline video caching/downloading is **out of scope**.

---

## 1. Context and scope

```
 Student (phone/web) ─────────────┐
 Admin / teacher (phone/desktop) ─┤
                                  ▼
                    ┌───────────────────────────┐
                    │  Next.js web app (Vercel) │
                    └─────────────┬─────────────┘
                                  │ REST + Bearer JWT
                    ┌─────────────▼─────────────┐        ┌──────────────┐
                    │  Express API (Render)     │◀──────▶│ Neon Postgres│
                    │  auth, payments, access,  │        └──────────────┘
                    │  signing, webhooks        │        ┌──────────────┐
                    └───┬───────────┬───────────┘───────▶│ R2 (PDFs,    │
                        │           │                    │  thumbnails) │
          signed upload │           │ webhooks / API     └──────────────┘
          + signed play │           ▼
                        │   ┌───────────────┐   ┌──────────┐
                        └──▶│ Bunny Stream  │◀──│ Razorpay │ (payment webhooks → API)
                            │ store/encode/ │   └──────────┘
   Admin browser ══TUS═════▶│ deliver (CDN) │
   Student player ◀═HLS════ └───────────────┘
```

**In scope:** upload, encoding, catalog, purchase-to-access, protected playback, resume/progress, admin management, content protection (deterrent level), observability, cost guardrails.
**Out of scope (v1):** offline downloads, live classes, DRM (revisit later), coupons, subscriptions beyond the existing PLAN flow, comments/forums, mobile apps, multi-teacher marketplace.

**Trust boundaries:** the browser is untrusted. The API is the only holder of the Bunny API key, the embed-token key, the Razorpay secrets and DB credentials. Bunny and Razorpay calls into our API are untrusted until verified.

---

## 2. Assumptions and capacity (planning numbers, adjust with real data)

| Item | Assumption |
|---|---|
| Content | 20–100 hours at launch, 1080p H.264 uploads, ~4–5 GB stored per hour after encoding |
| Students | launch 100, 12 months 1,000–5,000 |
| Peak concurrency | ~10% of students; launch/promo spike up to ~500 concurrent |
| Viewing | ~1 GB streamed per viewing hour (mobile-heavy ABR mix) |
| API load at peak | 500 viewers × 1 progress write / 15 s ≈ 33 req/s, plus bursty `/play` at lecture starts. Small for one instance **if** writes are single indexed upserts |
| Video bytes through our API | **Zero.** CDN carries video; our API carries only small JSON |
| Real bottlenecks | (1) API cold starts, (2) DB connection limits during spikes, (3) delivery cost, (4) playback quirks on real devices, not raw throughput |

---

## 3. Functional requirements

Priority: **P1** = MVP, **P2** = full product, **P3** = hardening.

### 3.1 Admin / teacher
| ID | Requirement | Pri |
|---|---|---|
| FR-A1 | Create/edit/archive courses (title, description, thumbnail, price, publish state) | P1 |
| FR-A2 | Create/edit/reorder sections and lectures; mark a lecture as free preview | P1 |
| FR-A3 | Attach a video to a lecture: P1 by pasting a Bunny video ID, P2 by direct upload from the browser (resumable) | P1/P2 |
| FR-A4 | See per-lecture video status (UPLOADING, PROCESSING, READY, FAILED) and trigger "refresh status" | P2 |
| FR-A5 | Replace a lecture's video without breaking student progress or access | P2 |
| FR-A6 | Attach resources (PDFs) to courses/lectures | P2 |
| FR-A7 | Grant or revoke a student's access manually, with a reason (WhatsApp/UPI-direct sales, refunds, goodwill) | P2 |
| FR-A8 | Basic stats: enrollments, revenue, most-watched lectures, stuck/failed videos | P2 |
| FR-A9 | Publish/unpublish; unpublishing hides from catalog but never removes access from existing students | P1 |

### 3.2 Student
| ID | Requirement | Pri |
|---|---|---|
| FR-S1 | Browse published courses; view curriculum with FREE PREVIEW and LOCKED markers (no video IDs exposed) | P1 |
| FR-S2 | Watch free-preview lectures when logged in | P1 |
| FR-S3 | Buy a course (Razorpay, UPI/cards) and get access automatically | P2 |
| FR-S4 | Watch purchased lectures in an adaptive-quality player | P1 |
| FR-S5 | Resume from the last position; see progress per lecture and per course; "Continue watching" | P2 |
| FR-S6 | Mark lecture complete (automatic at ≥90% or on end; manual toggle) | P2 |
| FR-S7 | Download attached PDF resources if entitled | P2 |
| FR-S8 | "Report a playback problem" button that creates a support ticket with diagnostics attached | P2 |
| FR-S9 | Clear states: not logged in, not purchased, payment processing, access expired, video processing, video unavailable | P1 |

### 3.3 Access and payments
| ID | Requirement | Pri |
|---|---|---|
| FR-P1 | Entitlement rule, evaluated on **every** playback request: free preview OR role CONTENT_MANAGER/SUPER_ADMIN OR active PAID plan (not expired) OR active enrollment (not revoked, not expired) | P1 |
| FR-P2 | Course purchase creates an enrollment idempotently via webhook (source of truth) and verify | P2 |
| FR-P3 | Free courses (price 0) enroll via a dedicated endpoint (Razorpay cannot create zero-amount orders) | P2 |
| FR-P4 | Full refund revokes the enrollment (set `revokedAt`, keep the row for audit) | P2 |
| FR-P5 | The existing PLAN flow keeps working unchanged (regression-tested) | P1 |

### 3.4 System
| ID | Requirement | Pri |
|---|---|---|
| FR-Y1 | Verified Bunny webhook updates lecture status and duration idempotently | P2 |
| FR-Y2 | Reconciliation job repairs missed webhooks and detects orphaned videos and paid-without-access orders | P2 |
| FR-Y3 | Audit trail of playback grants (who got a signed URL for what, when, from where) | P2 |
| FR-Y4 | Per-user and per-IP rate limits on `/play` and progress | P2 |
| FR-Y5 | Dynamic watermark overlay with the student's name/phone | P3 |
| FR-Y6 | Concurrent-session limit per account (default 2) | P3 |
| FR-Y7 | Health endpoints and alerting (section 12) | P1 |

---

## 4. Non-functional requirements

| ID | Category | Requirement | Target | Verified by |
|---|---|---|---|---|
| NFR-1 | Availability | `/play` and progress endpoints available | ≥ 99.5% monthly, excluding vendor outages | uptime monitor |
| NFR-2 | Cold starts | API must not sleep or cold-start in production (paid instance, or equivalent) | 0 cold starts at `/play` | deploy config + monitor |
| NFR-3 | Latency | `/play` p95 warm | < 400 ms | APM / logs |
| NFR-4 | Latency | progress write p95 | < 300 ms | APM / logs |
| NFR-5 | Playback start | time to first frame, warmed video, 4G | p75 ≤ 3 s | manual device tests + feedback |
| NFR-6 | Payment to access | webhook-granted access after successful payment | p95 < 30 s; hard alert at 5 min | reconciliation query |
| NFR-7 | Security | video IDs, API keys, signing keys never reach the browser; signed URLs short-lived; entitlement checked on every grant | 0 leaks | tests + code review |
| NFR-8 | Integrity | no paid order without access; no access without a valid reason | invariant checks pass hourly | reconciliation job |
| NFR-9 | Durability | no single copy of source video; DB restorable | originals backed up outside Bunny; DB PITR enabled | backup drill |
| NFR-10 | Compatibility | playback works on latest and previous major iOS Safari, Chrome Android (incl. low-end), Samsung Internet, desktop Chrome/Edge/Firefox, installed PWA, WhatsApp/Instagram in-app browsers (graceful fallback) | pass device matrix (section 13) | manual QA |
| NFR-11 | Cost | delivery cost per viewing hour tracked; alerts on anomalies | alert at 2× trailing weekly average | Bunny dashboard + alert |
| NFR-12 | Scalability | handle a 500-concurrent launch spike without errors | zero 5xx at 50 req/s on `/play`+progress | load test |
| NFR-13 | Observability | every playback grant/deny, webhook, and payment grant is logged with a request ID | 100% coverage | log review |
| NFR-14 | Accessibility | WCAG AA on watch/course/checkout pages; keyboard and screen-reader usable controls around the player | AA | audit |
| NFR-15 | Maintainability | video provider behind an adapter interface; all Bunny-specific code in one module | single module | code review |
| NFR-16 | Privacy | store minimum PII; watermark data is display-only; audit log retention bounded (default 90 days) | documented | review |

---

## 5. Architecture

### 5.1 Components
| Component | Responsibility | Must NOT |
|---|---|---|
| Next.js web | UI, player page, TUS upload from admin browser, calls API with Bearer JWT via the existing api-client (so token refresh works) | hold secrets; construct video URLs itself |
| Express API (Render, long-running) | auth, entitlement, signing playback URLs and upload authorizations, webhooks, reconciliation, admin CRUD | proxy video bytes |
| Neon Postgres | courses, lectures, enrollments, progress, payments, audit | store video |
| Bunny Stream | store, transcode to adaptive HLS, deliver via CDN, host the player | be the only copy of the source files |
| R2 | PDFs, course thumbnails | host lecture video |
| Razorpay | payments; webhook is the source of truth | |
| Service worker | cache static shell | cache `/api/*` or video-provider domains, ever |

### 5.2 Key decisions (ADR summary)
| # | Decision | Why | Alternative rejected |
|---|---|---|---|
| D1 | Managed video (Bunny Stream) | encoding, ABR, CDN, player without owning a pipeline | self-hosted FFmpeg + CDN: months of work, ongoing ops |
| D2 | Browser uploads straight to Bunny via resumable TUS | multi-GB files; keep API light; resumable on flaky links | upload through API: timeouts, memory, cost |
| D3 | Server-signed, short-lived embed URLs per playback request | entitlement enforced server-side | public/unsigned embeds: free access for anyone with the link |
| D4 | Bunny's iframe player for v1 | fastest, handles HLS/fullscreen/quality across devices | custom hls.js player: only if we need quality caps or precise events |
| D5 | Webhook = primary status path; reconciliation job = safety net | webhooks can be missed or delayed | polling only: slow and wasteful |
| D6 | Entitlements as rows (Enrollment) plus existing PLAN flag | per-course sales and all-access pass both work | one boolean: cannot sell courses |
| D7 | Postgres for everything, no Redis in v1 | codebase has no Redis; load is small | add Redis early: extra infra for no v1 need |
| D8 | Revocation is eventual: bounded by token TTL | simplicity; no per-segment checks | per-segment authorization: not available with the iframe |

---

## 6. Core flows

### 6.1 Upload (P2)
1. Admin clicks "Add video" on a lecture. API creates/updates the Lecture (`UPLOADING`) **first**, then creates the Bunny video object (title = lecture ID for traceability), stores `videoId`.
2. API returns a signed TUS upload authorization (short expiry). The Bunny API key never leaves the server.
3. Browser uploads the file directly to Bunny (resumable, with progress). Closing the tab or losing the network pauses; reopening resumes.
4. Bunny queues and encodes, and calls our webhook as the state changes (6.2).

### 6.2 Encoding status (P2)
1. `POST /api/webhooks/bunny` receives the raw body first, **verifies the signature**, then parses.
2. It re-fetches the video from Bunny's API and trusts that response for status and duration (belt and braces).
3. Status mapping and rules in section 7.1. Respond 2xx fast; heavy work is out of band.
4. Reconciliation (FR-Y2) polls lectures stuck in UPLOADING/PROCESSING beyond a threshold.

### 6.3 Purchase to access (P2)
1. Student taps Buy. `create-order` (`productType=COURSE`, `courseId`): price read from DB, order created, `Payment` row stored with amount, order `notes` carry product info.
2. Razorpay checkout runs on the client. On success the client calls `verify` (HMAC check) and shows a "Activating your access…" state.
3. The Razorpay **webhook** independently confirms. Both paths call one idempotent `grantAccess(payment)` function. Whichever arrives first wins; the second is a no-op.
4. The UI polls a lightweight "am I enrolled?" check for up to ~60 s, then shows "Payment received; access will appear shortly" with support link.

### 6.4 Playback (P1)
1. Student opens `/watch/:lectureId`. The page calls `GET /api/lectures/:id/play` (Bearer JWT).
2. API loads lecture + course, runs `canWatchLecture(user, lecture)`. Denials return a machine-readable reason.
3. If allowed and `status = READY`: sign a fresh embed URL (TTL per 10.3), insert a `PlaybackGrant` audit row, return `{ embedUrl, expiresAt, resumePositionSec, next/prev }`.
4. The page renders the iframe. The student sees the player; the browser never sees the library key or token key.
5. If the player errors (403/expired), the page transparently calls `/play` again and reloads at the saved position, with a clear message if it fails twice.

### 6.5 Progress (P2)
- Client sends `{ positionSec, completed? }` about every 15 s while playing, on pause, on end, and when the tab is hidden (`fetch` with `keepalive: true` and the Authorization header; **not** `sendBeacon`, which cannot set headers).
- Server does one upsert on `(userId, lectureId)`; ignores writes older than the stored `updatedAt`; `completed` is sticky (never flips back to false automatically).

### 6.6 Refund / revoke (P2)
- Razorpay refund webhook for a COURSE payment sets `Enrollment.revokedAt` (full refunds only; partial refunds ignored and logged).
- Already-issued playback URLs keep working until they expire (D8). This window is documented and accepted.
- Admin manual revoke does the same with an `AuditLog` entry.

### 6.7 Replace video (P2)
1. Upload the new file to a **new** Bunny video, stored in `Lecture.pendingVideoId`.
2. When the pending video reaches READY, swap `videoId` ← `pendingVideoId` in one transaction, then delete the old Bunny video asynchronously.
3. Students keep watching the old version until the swap. Progress is kept; saved positions are clamped to the new duration.

---

## 7. Data model additions and state machines

### 7.1 Lecture video state machine
| Bunny status | Meaning | Our action |
|---|---|---|
| 0 Queued, 1 Processing, 2 Encoding | in progress | `PROCESSING` |
| 4 Resolution finished | first rendition playable | stay `PROCESSING`; admin may preview; log |
| 3 Finished | fully available | `READY`, set `durationSec` |
| 5 Failed | encoding failed | `FAILED`, surface in admin |
| 6–10 | pre-signed upload / captions / metadata events | log and ignore (return 200) |

Rules: transitions are **monotonic** (a late or duplicate event never moves READY back to PROCESSING; only an explicit replace flow or admin re-upload resets). Unknown `VideoGuid` returns 200 and is logged. All updates use compare-and-set so concurrent webhooks cannot corrupt state.

### 7.2 Enrollment lifecycle
`ACTIVE` → (`expiresAt` passes) → `EXPIRED` (derived) or → (`revokedAt` set) → `REVOKED`. Rows are never hard-deleted. `source`: `PURCHASE | FREE | ADMIN_GRANT`. `grantedBy` and `reason` are required for ADMIN_GRANT.

### 7.3 Additions beyond the Phase 1/2 schema (reconcile with what exists)
| Table/field | Purpose |
|---|---|
| `Enrollment.revokedAt, source, grantedBy, reason` | auditable access changes |
| `Lecture.pendingVideoId` | safe video replacement |
| `Course.archivedAt` | soft delete when enrollments exist; hard delete only for never-sold drafts |
| `PlaybackGrant(id, userId, lectureId, issuedAt, expiresAt, ip, userAgent)` | leak tracing, anomaly detection, abuse caps. Index `(userId, issuedAt)`. Retention 90 days |
| `AuditLog(id, actorId, action, entityType, entityId, meta, createdAt)` | admin actions, grants, revokes, replacements |
| `PlaybackSession(userId, deviceId, lectureId, lastSeenAt)` (P3) | concurrent-session limit using Postgres, no Redis |

### 7.4 Invariants (enforced by constraints/tests where possible)
1. `Enrollment` unique on `(userId, courseId)`.
2. `Payment.status = SUCCESS` for a COURSE order ⇒ an Enrollment exists, or an alert fires within minutes.
3. A `Lecture` with `status = READY` has a non-null `videoId`.
4. `videoId` appears only in admin-only API responses and server logic.
5. Progress rows are keyed by `(userId, lectureId)` and survive reorders/renames/video replacement.

---

## 8. API contracts (summary; keep `{ error, code?, details? }` error shape; validate with zod)

| Endpoint | Auth | Success | Errors |
|---|---|---|---|
| `GET /api/courses`, `GET /api/courses/:id` | public (optional JWT adds viewer state, then `Cache-Control: private, no-store`) | course/sections/lectures with `isFreePreview`, `durationSec`, **no `videoId`** | 404 |
| `GET /api/lectures/:id/play` | JWT | `{ embedUrl, expiresAt, resumePositionSec, next, prev }` | 401; 403 `NOT_ENTITLED / PLAN_EXPIRED / ENROLLMENT_REVOKED`; 404; 409 `NOT_READY`; 429; 503 `VIDEO_PROVIDER_UNAVAILABLE` |
| `POST /api/lectures/:id/progress` | JWT | 204 | 401/403/429; idempotent |
| `POST /api/courses/:id/enroll` | JWT | 201 (free courses only) | 409 already enrolled; 400 if price > 0 |
| `POST /api/payments/create-order` | JWT | order (missing `productType` ⇒ PLAN, backward compatible) | 409 already enrolled / active plan |
| `POST /api/payments/verify`, `POST /api/payments/webhook` | JWT / signature | idempotent grant | |
| `POST /api/admin/lectures/:id/upload-auth` | admin | `{ videoId, tus: { endpoint, headers, expiresAt } }` | |
| `POST /api/admin/lectures/:id/refresh-status`, `/replace-video` | admin | updated lecture | |
| `POST /api/admin/enrollments`, `POST /api/admin/enrollments/:id/revoke` | admin | enrollment | |
| `POST /api/webhooks/bunny` | HMAC signature | 200 | 401 invalid signature |
| `POST /internal/reconcile` | secret header (called by scheduled job) | summary | 401 |
| `GET /api/health`, `GET /api/ready` | public | liveness / DB reachable | |

---

## 9. Security and threat model

| Threat | Mitigation | Residual risk |
|---|---|---|
| Free access by sharing the embed link | server-signed URL per grant, short TTL, embed token auth on, referrer allowlist (with in-app-browser caveat, 10.4) | link works until it expires |
| Direct file/MP4 access | disable MP4 fallback and direct file access in library settings | none expected |
| Library key or token key leaks | server-only module; never in `NEXT_PUBLIC_*`; rotate on suspicion; token key can sign every video in the library | operational discipline |
| Enumerating or scraping video IDs | IDs never in student-facing responses; GUIDs unguessable; token required anyway | ID visible inside the embed URL during playback (unavoidable) |
| Forged webhooks | HMAC verification on raw body plus re-fetch from Bunny API | none expected |
| Replay or duplicate webhooks | monotonic CAS state transitions | none |
| Payment tampering (client sets price) | amount computed server-side; verify captured amount equals stored amount | none |
| Double grant / race between verify and webhook | one `grantAccess` function, upsert on unique key, CAS on payment status | none |
| Screen recording / yt-dlp style capture | watermark (P3), `PlaybackGrant` audit for leak tracing, optional DRM later | **accepted**; no browser can stop it |
| Account sharing | concurrent-session limit (P3), anomaly flags (many IPs/devices) | some sharing persists |
| Bandwidth-burning abuse by a paid account | per-user daily grant cap, rate limits, delivery cost alerts | bounded by caps |
| Admin account takeover | existing auth plus admin actions in `AuditLog`; consider 2FA later | |
| XSS stealing the localStorage access token | strict output escaping, no raw HTML rendering of user content, careful third-party scripts | token in localStorage is an existing design choice |

---

## 10. Edge cases and solutions

### 10.1 Upload and encoding
| # | Scenario | Solution |
|---|---|---|
| U1 | Admin's connection drops mid-upload | resumable TUS; UI shows "paused, will resume"; keep the Lecture in UPLOADING |
| U2 | Admin closes the tab | upload resumes on reopen if the file is re-selected; stale UPLOADING items are flagged in admin after N hours |
| U3 | Uploading from a phone on mobile data | warn about size, suggest Wi-Fi, keep-screen-awake hint; do not block |
| U4 | Missed or delayed webhook | "Refresh status" button plus scheduled reconciliation that asks Bunny for the real status |
| U5 | Encoding fails | `FAILED` with clear message and re-upload action; alert if failure rate rises |
| U6 | Create-video succeeds but DB write fails (or reverse) | write DB first with `videoId = null`; create Bunny video with title = lecture ID; reconciliation matches orphans by title and cleans up |
| U7 | Orphaned videos accumulate and cost storage | weekly reconciliation lists Bunny videos with no matching lecture and reports them (delete manually or after approval) |
| U8 | Wrong file type, huge file, vertical or HEVC phone video | client-side checks for type/size limits (verify vendor limits); recommend landscape 16:9 H.264 at 30 fps; player must still render other shapes |
| U9 | Duplicate click creates two Bunny videos | upload-auth is idempotent per lecture while UPLOADING; second call returns the existing video |
| U10 | Replace video while students are watching | pending/swap flow (6.7) |
| U11 | Duplicate or out-of-order webhooks (e.g. status 4 after 3) | monotonic CAS rule (7.1) |
| U12 | Webhook endpoint down during a deploy | Bunny retry behavior is unverified: do not rely on it; reconciliation covers it |

### 10.2 Payments and access
| # | Scenario | Solution |
|---|---|---|
| P1 | User pays, closes tab before verify | webhook grants access; verify is only a fast path |
| P2 | Webhook arrives before verify (or both at once) | single idempotent `grantAccess`; unique constraint; CAS |
| P3 | Webhook delayed or lost | "Activating…" state, then reconciliation grants access for SUCCESS payments lacking enrollment; alert on any older than 5 min |
| P4 | Student buys the same course twice | block `create-order` if already enrolled; reuse a recent PENDING order for the same user/course |
| P5 | Price changed after order creation | amount fixed at order creation; compare against captured amount |
| P6 | Payment succeeded but course was unpublished/deleted meanwhile | grant anyway if the course exists (archived is fine); never hard-delete courses with payments |
| P7 | Full refund | set `revokedAt`; partial refund ignored but logged and surfaced to admin |
| P8 | Chargeback or dispute | event names unverified; handle manually via admin revoke until verified |
| P9 | Plan expires mid-lecture | allow the current playback to finish; next `/play` denies with `PLAN_EXPIRED` |
| P10 | Student has both a plan and an enrollment | access if either is valid; never double-charge logic |
| P11 | Free course | `POST /courses/:id/enroll`; no Razorpay |
| P12 | Cash/UPI-direct buyers | admin grants access with reason (FR-A7) |
| P13 | Staff role bypass | only CONTENT_MANAGER and SUPER_ADMIN; not SUPPORT_MANAGER |
| P14 | Unpublished course | hidden from catalog; existing students keep access |
| P15 | GST/invoice requirements | business question for the teacher's accountant; out of scope for this design, but keep payment records complete |

### 10.3 Playback and tokens
| # | Scenario | Solution |
|---|---|---|
| T1 | Token expiry vs long lectures and pauses | TTL = `clamp(duration × 1.5 + 10 min, 30 min, 4 h)`, configurable; unknown duration ⇒ 2 h. **Must test** pausing past expiry on real devices; on failure re-call `/play` and reload at the saved position |
| T2 | `expires` format and clock | Unix **seconds** (not milliseconds); computed on the server; never use the client clock for access decisions |
| T3 | Token reused across lectures | token is bound to the video ID by construction; sign per request |
| T4 | Stale cached `/play` response | never cache `/api/*` (HTTP cache, service worker, React Query `staleTime: 0` for play) |
| T5 | Revoked student still has a live URL | accepted window ≤ TTL (D8); keep TTL no longer than needed |
| T6 | Lecture not READY | `409 NOT_READY`; UI shows "being prepared"; admin sees status |
| T7 | Lecture deleted while being watched | player fails; page shows a friendly message; progress call returns 404 and is ignored |
| T8 | Student opens the page unauthenticated (deep link from WhatsApp) | redirect to login with return URL; after login, return to the lecture |
| T9 | Access JWT expires (120 min) during a long session | all video calls go through the existing api-client so silent refresh applies; progress writes retry once after refresh |
| T10 | Two tabs or two devices on the same lecture | progress last-write-wins by `updatedAt`; `completed` sticky; session limit in P3 |
| T11 | Resume position beyond the end or at 100% | clamp; if ≥ 95%, restart from 0 |
| T12 | Bunny/CDN outage | `503 VIDEO_PROVIDER_UNAVAILABLE` from `/play` if signing/status needs it; UI offers retry and a status message; no data loss |

### 10.4 Devices and networks
| # | Scenario | Solution |
|---|---|---|
| D1 | iPhone Safari | HLS is native; require a tap to play (no autoplay with sound); iframe needs fullscreen permissions; test on real iPhone and iPad |
| D2 | iPad reports as desktop | never branch on user-agent strings |
| D3 | WhatsApp/Instagram in-app browsers | referrer may be missing so the referrer allowlist can block playback; rely on signed tokens as primary protection, loosen referrer rule if tests fail; show "Open in Chrome/Safari" prompt when an in-app browser is detected; Google sign-in may also fail there |
| D4 | Low-end Android (≈2 GB RAM) | keep low renditions (360p/480p); H.264 only; 30 fps; manual quality menu; keep the watch page light (lazy-load PDF viewer, small images) |
| D5 | Slow or flaky 4G | adaptive bitrate; show "slow connection, try lower quality" hint if the player exposes stall events; do not auto-reload on every stall |
| D6 | Data saver / battery saver | do not autoplay next lecture; "continue" is an explicit tap |
| D7 | Installed PWA (standalone) | test fullscreen and orientation; service worker must not intercept video or `/api/*` |
| D8 | Screen reader / keyboard users | accessible controls around the player, headings, focus order; captions later (P3) |
| D9 | Orientation and fullscreen on small phones | allow rotation; test portrait player pinned top with lesson list below |
| D10 | Unwarmed video is slow on first view | after upload, the teacher plays each lecture once; consider enabling closer replication regions if cost-effective (verify) |
| D11 | Regional ISP variance (Jio/Airtel/BSNL) | test on real connections; track student reports (FR-S8) |

### 10.5 Sharing and piracy
| # | Scenario | Solution |
|---|---|---|
| S1 | A student shares the URL with friends | short TTL, referrer lock, token required |
| S2 | A student shares the account | concurrent-session limit, device/IP anomaly flag from `PlaybackGrant`, watermark |
| S3 | A leaked video appears online | watermark identifies the account; `PlaybackGrant` shows who fetched which lecture and when; admin can revoke |
| S4 | Downloader tools | accepted residual risk; DRM only if piracy becomes material (re-evaluate with revenue) |

### 10.6 Content management
| # | Scenario | Solution |
|---|---|---|
| C1 | Reorder sections/lectures | single transaction rewriting order values; IDs stable so progress is preserved |
| C2 | Two admins edit simultaneously | optimistic concurrency via `updatedAt`; reject stale writes with a clear message |
| C3 | Delete a section/lecture with videos | soft-archive when any student has progress or access; async delete of Bunny videos for hard deletes |
| C4 | Delete a course with enrollments | forbidden; archive instead |
| C5 | Lecture duration changes after replace | clamp saved positions; recompute completion thresholds |
| C6 | Course with zero READY lectures | cannot be published (validation) |
| C7 | Free-preview abuse (bandwidth) | login required; per-user/IP rate limits; grant caps |

### 10.7 Data consistency and progress
| # | Scenario | Solution |
|---|---|---|
| X1 | Progress write flood | client throttle (15 s); server single upsert on PK; rate limit |
| X2 | Out-of-order progress writes | include client timestamp/sequence; ignore older than stored |
| X3 | Completion semantics | completed at ≥ 90% or on end; sticky; manual toggle allowed |
| X4 | Course progress percentage | computed from completed lectures / total READY lectures; handle added lectures gracefully |
| X5 | DB hiccups on a serverless-style Postgres (Neon) | keep the existing retry wrapper for transient errors on all new queries; keep transactions short |
| X6 | Money and access divergence | hourly invariant check: SUCCESS COURSE payments without active enrollment, READY lectures without videoId, lectures stuck > 30 min |

### 10.8 Infrastructure and dependencies
| # | Scenario | Solution |
|---|---|---|
| I1 | API instance sleeps (free tiers) | production on an always-on instance; free-tier keep-alive pings are not good enough for paying customers |
| I2 | Deploy during a purchase or webhook | webhooks are idempotent; reconciliation heals gaps |
| I3 | Bunny prepaid balance runs out, videos stop | low-balance alert and auto-recharge (verify how billing works); weekly cost check |
| I4 | Razorpay/Bunny credentials rotated | secrets via env only; documented rotation steps; no secrets in logs |
| I5 | Clock skew between servers | tokens use server time only; allow small tolerance when verifying anything time-based |
| I6 | Scheduled jobs need a trigger | a scheduled GitHub Action calling the protected `/internal/reconcile` is enough; protect with a secret header and rate limit |
| I7 | Database connection spikes at launch | pooled connection string, short transactions, indexed single-row writes |

### 10.9 Abuse and cost
| # | Scenario | Solution |
|---|---|---|
| A1 | Scripted `/play` calls | per-user (e.g. 60/hour) and per-IP limits; 429 with `Retry-After` |
| A2 | Bandwidth spike | alert at 2× trailing average; per-user daily grant cap; look at `PlaybackGrant` for the source |
| A3 | Storage creep (originals, orphans, old replaced videos) | weekly orphan report; delete old video after successful replace |
| A4 | Viral free-preview link | login required; rate limits; consider limiting preview to the first N minutes if abused |

---

## 11. Failure modes and degradation

| Dependency down | User impact | Behavior |
|---|---|---|
| Bunny (delivery) | playback fails | clear message and retry; catalog, payments, and PDFs keep working |
| Bunny (API) | uploads and status refresh fail; playback of already-READY videos still works if signing is local | signing is a local hash and does not call Bunny; only admin operations degrade |
| Razorpay | cannot buy | disable buy button with message; existing students unaffected |
| Neon | most API calls fail | existing retry wrapper; `/api/ready` reports not ready; friendly error UI |
| Render restarting | brief errors | clients retry; webhooks are idempotent |
| Webhook delivery | statuses/grants lag | reconciliation closes the gap; admin refresh button |

---

## 12. Observability and operations

**Structured logs** (JSON, request ID, user ID where applicable) for: `play_granted`, `play_denied(reason)`, `progress_write_failed`, `webhook_received`, `webhook_invalid_signature`, `video_status_changed`, `payment_grant(source=verify|webhook|reconcile)`, `enrollment_revoked`, `admin_grant`, `reconcile_summary`. Never log secrets, tokens, or full signed URLs.

**Metrics/alerts (minimum):**
- 5xx rate on `/play`, progress, webhooks
- Invalid-signature webhooks spike
- Lectures stuck in UPLOADING/PROCESSING > 30 min; any FAILED
- SUCCESS COURSE payments without enrollment > 5 min (page the owner)
- Delivery cost/bandwidth anomaly; Bunny balance low
- `/play` p95 latency

**Runbooks (one page each):** video stuck processing; student paid but has no access; leaked video; rotate Bunny/Razorpay keys; Bunny outage communication; restore database.

**Backups:** source videos kept by the teacher outside Bunny (and optionally original retention in Bunny, verify option); Neon point-in-time restore enabled and tested once (window depends on plan, verify); periodic logical DB export to R2.

**Student feedback loop:** "Report a playback problem" creates a SupportTicket (existing system) with auto-attached lecture ID, browser/OS, connection hint where available, and timestamp.

---

## 13. Testing strategy

| Level | What |
|---|---|
| Unit | `canWatchLecture` (all branches: preview, admin roles, plan active/expired, enrollment active/expired/revoked, SUPPORT_MANAGER denied); token signing with fixed inputs; webhook signature verification with a known vector; TTL clamp; progress ordering/stickiness |
| Integration | purchase → enrollment (verify only, webhook only, both, repeated); refund → revoke; `/play` matrix of users × lectures; webhook state machine incl. duplicates/out-of-order/unknown video; free enroll; admin grant/revoke |
| Regression | existing PLAN purchase, verify, webhook, expiry, plan-config endpoints unchanged |
| Contract | `videoId` and keys never appear in any student-facing response (automated JSON scan across public endpoints) |
| Load | ~50 req/s mix of `/play` + progress for 5 minutes against staging; expect no 5xx and p95 within NFR targets |
| Failure drills | kill webhook delivery, then confirm reconciliation heals; simulate Bunny API errors; simulate DB transient errors |
| Device matrix (manual) | iPhone Safari; iPhone WhatsApp/Instagram browser; iPad; installed PWA; low-end Android (~2 GB); Samsung Internet; desktop Chrome/Edge/Firefox; Slow 4G throttling, then real Jio/Airtel; **pause past token expiry then resume**; refunded student; missed webhook |

---

## 14. Hard rules (never violate)

1. No video bytes through our API, ever.
2. `videoId`, Bunny keys, token key, and unsigned playback URLs never reach student-facing responses or the browser bundle.
3. Entitlement is checked on **every** `/play`; `/api/*` responses are never cached by the HTTP cache or the service worker.
4. Webhooks (Razorpay and Bunny) verify signatures against the **raw** body before parsing.
5. Access grants are idempotent and triggered from the webhook as the source of truth.
6. The existing PLAN payment behavior does not change (regression tests must prove it).
7. Prices are computed server-side; client-supplied amounts are ignored.
8. Never hard-delete courses/lectures that have enrollments, payments, or progress; archive instead.
9. All provider-specific code lives behind the `VideoProvider` adapter in one module.
10. No secrets in the repo, logs, or client bundle; all via environment variables.
11. Every new background/reconciliation action is idempotent and logged.
12. Do not add offline caching of video, or DRM, in v1.

---

## 15. Vendor facts: verified vs must-verify

**Verified in Bunny's docs (17 Oct 2026):**
- Embed token: `SHA256_HEX(token_security_key + video_id + expires)` appended as `token` and `expires` query params to `https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}`; `expires` is Unix seconds. Enable **Embed view token authentication** in the library's Security settings; unsigned embeds then return 403. Docs recommend signing a fresh URL on every page load.
- The embed-token key can sign every video in the library, so it stays server-side. Docs note the key comes from the Security page and is a separate value from the API key (one mobile-SDK page says "API key"; test which one your library needs).
- Webhooks: JSON `{ VideoLibraryId, VideoGuid, Status }`. Statuses 0 Queued, 1 Processing, 2 Encoding, 3 Finished, 4 Resolution finished (first one means playable), 5 Failed, 6–8 pre-signed upload events, 9 captions generated, 10 title/description generated.
- Webhooks **are signed**: HMAC-SHA256 over the exact raw body, hex-encoded, header `X-BunnyStream-Signature` (signature version v1), keyed with the library's **Read-Only API key**. Validate against the raw body, not re-serialized JSON. (This corrects the earlier assumption that Stream webhooks cannot be signature-verified.)

**Must verify in docs or by test before relying on them:**
1. Whether the embed token is enforced only at iframe load or also during playback, and what happens when a paused session passes `expires` (drives TTL, T1).
2. Player events (Player.js-style `timeupdate/pause/ended`) and a start-time parameter for resume.
3. TUS endpoint, required headers and signature recipe, file-size limits, accepted formats.
4. Referrer allowlist behavior in WhatsApp/Instagram in-app browsers.
5. Whether to enable MP4 fallback and original-file retention; storage region and replication options for India.
6. Billing: prepaid balance, auto-recharge, low-balance alerts.
7. Bunny webhook retry behavior on non-2xx.
8. Razorpay refund and dispute event names and payload fields.
9. Neon point-in-time-restore window on the chosen plan; Render plan that avoids sleeping.

---

## 16. Open decisions (defaults apply unless the owner says otherwise)

| # | Question | Default |
|---|---|---|
| O1 | Selling model | per-course purchase primary; existing PLAN acts as an all-access pass |
| O2 | READY on Bunny status 3 or earlier at status 4 | READY at 3; admin can preview at 4 |
| O3 | Concurrent-session limit | 2 devices (P3) |
| O4 | Playback URL TTL | duration × 1.5 + 10 min, clamp 30 min to 4 h |
| O5 | Free preview requires login | yes |
| O6 | Keep Bunny originals | yes if low cost, plus teacher's own backup |
| O7 | Captions/transcripts | not in v1; revisit after launch |
| O8 | Custom player (hls.js) | only if iframe limitations hurt (quality caps, events) |

---

## 17. Phase mapping and definition of done

| Phase | Scope | Done when |
|---|---|---|
| P1 MVP | Lecture model, manual Bunny upload + pasted video ID, `/play` with entitlement (PLAN + free preview), lecture list + watch page, Bunny token auth + referrer settings, health endpoints, minimal admin way to add lectures | a logged-in PAID user plays a lecture on iPhone Safari and low-end Android; a FREE user is denied with the right message; `videoId` never appears in public responses (automated check) |
| P2 Full | Enrollment + per-course purchase, free enroll, TUS upload UI, verified webhook + reconciliation, progress/resume, replace-video, admin grants/revokes, resources, audit/grants tables, support-ticket diagnostics | paid-without-access invariant check is green; webhook-only and verify-only purchases both grant access; refund revokes; missed-webhook drill heals |
| P3 Hardening | watermark, session limit, rate limits and caps, anomaly flags, alerts/runbooks, load test | load test meets NFR-12; leak-tracing runbook rehearsed |
