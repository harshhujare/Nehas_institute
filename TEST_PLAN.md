# Test Plan

## Stack and current test commands

- **Language:** TypeScript (with JavaScript build artifacts also present in `packages/shared/src`).
- **Web:** Next.js App Router 16, React 19, Jest 30 with `ts-jest` and `jest-environment-jsdom` available.
- **API:** Express 4, Prisma 6, Zod; test files use Node's built-in `node:test` and `node:assert`.
- **Shared package:** TypeScript schemas, models, and role helpers using Zod.
- **Commands:** `npm run test --workspace=web` runs the web Jest suite; `npm run test:coverage --workspace=web` runs its coverage suite; a focused web test can be run with `npm run test --workspace=web -- --runInBand <path-or-pattern>`. The root has `lint`, `type-check`, and `build` scripts, but no test script. The API package has no test script or declared test runner; its existing `node:test` files currently have no documented repository command. The shared package has no tests or test command.

## Scope and allocation

The slices below are a target distribution of test effort: **Unit ~80%, Integration ~15%, E2E/Browser ~5%**. Checkboxes are all unchecked because this is a proposed plan, not evidence that tests have been written. Existing test coverage is noted separately.

## Unit tests — target ~80%

### Shared contracts and pure logic

- [ ] Validate Register, Login, Google Auth, Create Note, plan/course order, payment verification, and user-plan schemas (valid inputs, invalid boundaries, defaults, and transforms).
- [ ] Validate Support ticket/reply, FAQ create/update, enrollment grant/revoke, course query/course/section/lecture, and lecture-progress schemas, including pagination limits and optional fields.
- [ ] Cover shared role helpers (`isAdmin`, `isSuperAdmin`) and model-level formatting/normalization logic where present.

### API middleware, services, and helpers

- [ ] Auth middleware: bearer/cookie token parsing, optional auth, expiry/invalid-token behavior, role hierarchy, plan checks, and support/content-manager/admin/super-admin gates.
- [ ] `canWatchLecture`: preview, unauthenticated, paywall, staff, active all-access pass, course enrollment, revoked/expired enrollment, and missing records.
- [ ] JWT service: access/refresh token claims, expiry, valid verification, and invalid/expired token rejection.
- [ ] Razorpay service: order option mapping, payment signature and webhook HMAC validation, malformed signatures, and configuration status.
- [ ] Bunny video service: signed embed URL/token calculation, TUS upload authorization, local fallback, and provider status parsing.
- [ ] Google identity verification: valid claims, invalid token, missing required claims, and provider failure.
- [ ] Storage service: key/URL handling and upload, signed-view, stream, and delete error mapping using controlled provider boundaries.
- [ ] `grantAccess`: free/purchase/admin-grant paths, expiry, duplicate/idempotent grant handling, and revoked access.
- [ ] Prisma retry helper: transient vs non-transient errors, retry limits, and successful recovery.
- [ ] Upload middleware configuration: file type/size restrictions and accepted upload fields.
- [ ] Shared API helpers: async handler forwarding, error response shape, and raw-body capture behavior needed for signed hooks.

### Web business logic and state

- [ ] Payment utilities: note access rules for free/timed/lifetime notes, role overrides, paid timestamp behavior, expiry boundaries, and missing user data.
- [ ] Payment success parsing and formatting: missing/malformed/stale query parameters, expiry formatting, and duration labels.
- [ ] Razorpay loader and payment polling: already-loaded script, load failure, readiness, retry/timeout behavior, and terminal success/failure.
- [ ] Checkout flow logic: plan/course order payloads, duplicate submissions, gateway success/cancel/failure, verification response, and post-payment access refresh.
- [ ] API client: auth-failure classification, transient errors, refresh-once behavior, request replay, and logout/refresh failure handling.
- [ ] Auth store: initial restore, register/login/Google/logout state transitions, cache clearing, and network/refresh failures.
- [ ] Online status: probe success/failure, offline/online events, cleanup, and stale probe handling.
- [ ] Query hooks: query keys, request parameters, response mapping, pagination/infinite loading, mutation outcomes, invalidation, and errors for courses, lecture progress, notes, FAQs, and announcements.
- [ ] PDF cache and viewer security hooks: cache key/expiry and invalidation; protected content state, access loss, and cleanup.
- [ ] Theme provider and query provider: persisted/default theme and provider configuration behavior.
- [ ] Small reusable UI components: button variants/disabled state, badge/card/skeleton rendering props, bottom-sheet open/close behavior, and slider navigation state.
- [ ] Help and note components: status labels, ticket reply rendering, FAQ presentation, contact form validation/submission states, note card actions, and watermark rendering inputs.
- [ ] Payment/auth components: plan-card selection/loading/disabled states, paywall navigation, Google sign-in pending/error/success states.
- [ ] Secure PDF viewer components: page rendering boundaries, lazy-page selection, loading/error states, and protected viewer controls.

## Integration tests — target ~15%

### API route and persistence contracts

- [ ] Auth endpoints: register/login/Google, refresh/logout, `/me`, cookies/JWT claims, schema errors, duplicate accounts, and unauthorized cases.
- [ ] Notes: list/search/filter/pagination; authenticated stream access rules; create/update/delete; thumbnail delivery; ensure `fileKey` and protected document bytes do not leak.
- [ ] Payments: plan configuration, plan/course order creation, verification, webhook signature validation, duplicate/idempotent events, entitlement updates, and failure paths.
- [ ] Announcements and FAQs: public active listing; admin/support listing and CRUD; image delivery/upload; role restrictions and validation errors.
- [ ] Support: student create/list/detail/reply; support queue/detail/reply/status update; super-admin delete; ownership and role restrictions.
- [ ] Admin users/payments/config: lookup, stats, pagination/filtering, plan/role mutation, payment reports, plan configuration, and super-admin restrictions.
- [ ] Courses: catalog filtering/search/pagination/aggregates; detail enrollment state and private-field redaction; free enrollment and progress summary.
- [ ] Lectures: playback authorization and signed URL response; progress persistence, completion threshold, resume position, and adjacent lecture data.
- [ ] Admin courses/curriculum: course, section, and lecture CRUD; publish state; reorder; upload authorization, status refresh, video replacement; enrollment grant/revoke audit and expiry.
- [ ] Bunny webhook and internal reconciliation: accepted/rejected signatures, event idempotency, state transitions, and shared secret protection.
- [ ] API bootstrap: health/keep-alive DB success and degraded responses, ping, CORS allow/deny, raw body preservation, mock TUS create/patch/head, and central error formatting.
- [ ] Run route tests against an isolated test database and local HTTP server; verify fixtures clean up even after failure.

### Web boundary and component integration

- [ ] API client + auth store + query cache: expired session refresh, one retried request, final sign-out, and cache clearing across account changes.
- [ ] React Query hooks with a test query client: server response mapping, loading/error/empty states, mutation invalidation, offline behavior, and persisted cache restoration.
- [ ] Payment components + API + success page: selected plan/course, pending checkout, verification, entitlement refresh, and invalid/stale success URL handling.
- [ ] Login and account UI with auth provider: sign-in, restored session, logout, protected navigation, and network failures.
- [ ] Course catalog/detail/watch components: filters and search, enrollment/purchase controls, preview vs paid playback, resume/progress, and paywall state.
- [ ] Notes list and secure PDF viewer: search/pagination, entitlement checks, authenticated stream, cache behavior, loading/error, and lost access.
- [ ] Help center and ticket pages: FAQ/contact/ticket interactions with API data, ownership errors, reply submission, and status display.
- [ ] Admin screens: permissions and CRUD workflows for courses, notes/uploads, announcements, FAQs, users, payments, and support tickets.

## E2E / Browser tests — target ~5%

- [ ] Student critical path: public landing/catalog → course details → preview or sign in → enroll/purchase → successful payment → watch lesson and retain progress.
- [ ] Notes access path: browse/search notes → free note opens; restricted note prompts for access; eligible user opens secure viewer and navigates pages.
- [ ] Support path: submit a ticket → view ticket and reply; support user changes status and student sees the updated status.
- [ ] Admin critical path: authorized admin creates/publishes a course with a section and lecture; unauthorized student cannot access admin routes/actions.
- [ ] Browser smoke/accessibility checks across login, catalog, course/watch, notes, payment success, help, and admin entry: navigation, responsive layout, keyboard-operable controls, visible errors, and no uncaught console errors.

## Existing tests and gaps

- Web currently has Jest tests for payment access control and payment success-page utilities.
- API currently has tests for Bunny helpers, lecture access middleware, course catalog/detail, and lecture playback/progress. The route tests use a real Prisma database and HTTP server.
- No tests were added or run for this audit. API/shared test execution and a stable isolated database setup should be established before implementation begins.
