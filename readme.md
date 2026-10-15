# Neha's Institute — Culinary Learning Platform

An online video-lecture and recipe resource platform built for culinary masterclasses by Neha Ma'am. Students can watch structured video courses with DRM-grade protection, download chef-curated recipe guides, track their progress, and purchase courses or all-access passes via Razorpay.

---

## 1. Architecture & Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 16 (App Router, Turbopack), React 19 | Fast static pages with server hydration and dynamic routes |
| **State & Query** | Zustand 5, TanStack React Query 5 | Offline-first query caching and global auth store |
| **PWA & Offline** | Service Worker, Cache API, IndexedDB | Shell caching, offline fallback page. **SW never caches `/api/*` or Bunny CDN domains.** |
| **Backend** | Express 4.21, Node.js 20, TypeScript | Long-running REST API server |
| **Database** | PostgreSQL on Neon Serverless with Prisma 6.5 | Pooled runtime connections (`DATABASE_URL`) + direct migration connection (`DIRECT_URL`) |
| **Video Streaming** | Bunny Stream | HLS adaptive bitrate video, signed iframe embeds, token authentication, and referrer locking |
| **Resource Storage** | AWS S3 (`@aws-sdk/client-s3`) | Secure private bucket for recipe PDFs and downloadable resources |
| **Payments** | Razorpay | UPI, cards, and netbanking with idempotent webhook handling |
| **Auth** | Custom JWT + Google Identity Services (GIS) | 120-min access token + 30-day httpOnly refresh cookie |

---

## 2. Platform Decisions (Phase 1 / Phase 2 Roadmap)

The following architectural decisions are established for Phase 1 and Phase 2:

1. **Selling Model:** Per-course purchase is the primary business model. The existing `PLAN` (e.g. 30-day / 365-day) functions as an **All-Access Pass** unlocking all published courses.
2. **Order Creation Backward Compatibility:** `POST /api/payments/create-order` remains strictly backward compatible. If `productType` is omitted, it defaults to `'PLAN'`.
3. **Refund Handling:**
   - Existing `PLAN` refund behavior is preserved.
   - For `COURSE` purchases: a full refund sets `Enrollment.revokedAt = new Date()`. Partial refunds are ignored.
4. **Free Course Enrollment:** Free courses (`priceInPaise === 0`) bypass Razorpay (as Razorpay cannot process ₹0 orders) and enroll directly via `POST /api/courses/:id/enroll`.
5. **Playback Access Bypass (`canWatchLecture`):** Only staff with `CONTENT_MANAGER` and `SUPER_ADMIN` roles bypass lecture paywalls. Other roles (`STUDENT`, `SUPPORT_MANAGER`) must have an active enrollment or valid all-access plan.
6. **Phase 1 Video Management:** Includes a minimal admin page / seed script to create sections and lectures by pasting an existing Bunny Video ID.
7. **Phase 3 Concurrency Limit:** Video stream concurrency limiting will be implemented via either a Postgres heartbeat table or Upstash Redis (to be decided during Phase 3).

---

## 3. Directory Layout

```
.
├── apps/
│   ├── api/                   # Express backend API
│   │   ├── prisma/            # Prisma schema, migrations, and seed script
│   │   ├── src/
│   │   │   ├── middleware/    # Auth, error handling, rawBody capture
│   │   │   ├── routes/        # Auth, admin, notes, payments, support, faqs
│   │   │   └── services/      # AWS S3, Razorpay, Google OAuth, token
│   │   └── .env.example
│   └── web/                   # Next.js web application
│       ├── app/               # App Router pages (homepage, notes, account, admin, help)
│       ├── components/        # Layout, auth, notes, help UI
│       ├── features/          # Payment checkout and secure PDF viewer
│       ├── hooks/             # React Query hooks
│       ├── public/            # Static assets, PWA manifest, service worker
│       └── .env.example
├── packages/
│   └── shared/                # Shared TypeScript types and Zod schemas (@neha/shared)
├── docker-compose.yml         # Local PostgreSQL container for development
├── turbo.json                 # Turborepo task pipeline
└── package.json               # Monorepo root workspace config
```

---

## 4. Environment Setup

### Backend (`apps/api/.env`)

Copy `apps/api/.env.example` to `apps/api/.env`:

```bash
# App
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000

# Database (Neon Serverless PostgreSQL)
DATABASE_URL="postgresql://user:password@ep-pooler.region.aws.neon.tech/neha_institute?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-direct.region.aws.neon.tech/neha_institute?sslmode=require"

# Admin Seeding (required for npm run db:seed; refuses to run in production)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_password
ADMIN_NAME=Neha Ma'am

# JWT & Auth
JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRES_IN=120m
REFRESH_TOKEN_SECRET=change_me_to_another_long_random_string
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# AWS S3 Storage
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_BUCKET_NAME=neha-institute-storage

# Bunny Stream Video (Phase 1+)
BUNNY_LIBRARY_ID=your_bunny_library_id
BUNNY_API_KEY=your_bunny_api_key
BUNNY_TOKEN_AUTH_KEY=your_bunny_token_auth_key
BUNNY_CDN_HOSTNAME=video.yourdomain.com
BUNNY_WEBHOOK_SECRET_TOKEN=your_random_secret_token
```

### Frontend (`apps/web/.env.local`)

Copy `apps/web/.env.example` to `apps/web/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
```

---

## 5. Development Workflow

```bash
# 1. Install dependencies
npm install

# 2. Build the shared package
npm run build --workspace=@neha/shared

# 3. Generate Prisma client
npm run db:generate --workspace=@neha/api

# 4. Run type check across all workspaces
npm run type-check

# 5. Run development server (API on 4000, Web on 3000)
npm run dev
```

---

## 6. Database Migrations

- Migrations use Neon Serverless Postgres with `directUrl` configuration.
- To deploy migrations to Neon:
  ```bash
  cd apps/api
  npx prisma migrate deploy
  ```
- To seed the initial admin account and baseline plan (development only):
  ```bash
  cd apps/api
  npm run db:seed
  ```
