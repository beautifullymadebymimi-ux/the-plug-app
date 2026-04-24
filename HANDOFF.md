# The Plug App — Full Ownership Handoff Guide

This document provides everything you need to run, maintain, and publish **The Plug** app independently outside of Manus.

---

## 1. Required Environment Variables

The app uses two sets of environment variables: **server-side** (used by the Express backend) and **client-side** (exposed to the React Native frontend via the `EXPO_PUBLIC_` prefix).

### Server-Side Variables

| Variable | Purpose | Manus-Specific? |
|----------|---------|-----------------|
| `DATABASE_URL` | MySQL connection string (e.g., `mysql://user:pass@host:3306/dbname`) | No — works with any MySQL 8+ database |
| `JWT_SECRET` | Secret key used to sign/verify session JWTs (cookie-based auth) | No — set any strong random string |
| `VITE_APP_ID` | App identifier used in OAuth token exchange and session creation | **Yes** — currently a Manus-issued app ID |
| `OAUTH_SERVER_URL` | Base URL of the OAuth token exchange server (e.g., `https://api.manus.im`) | **Yes** — points to Manus OAuth service |
| `VITE_OAUTH_PORTAL_URL` | Base URL of the login portal UI (e.g., `https://manus.im`) | **Yes** — the "Sign in to The Plug" page is hosted by Manus |
| `OWNER_OPEN_ID` | Your unique user ID in the OAuth system; the first user matching this ID gets "admin" role | **Yes** — assigned by Manus OAuth |
| `OWNER_NAME` | Display name of the app owner | No — any string |
| `BUILT_IN_FORGE_API_URL` | Base URL for the Manus storage/notification proxy | **Yes** — Manus internal service |
| `BUILT_IN_FORGE_API_KEY` | API key for the Manus storage/notification proxy | **Yes** — Manus internal credential |
| `NODE_ENV` | `development` or `production` | No — standard Node.js |
| `PORT` | Server port (defaults to 3000) | No |

### Client-Side Variables (auto-mapped by `scripts/load-env.js`)

The `load-env.js` script automatically maps server variables to `EXPO_PUBLIC_` equivalents at build time:

| Server Variable | Maps To | Used For |
|----------------|---------|----------|
| `VITE_APP_ID` | `EXPO_PUBLIC_APP_ID` | OAuth login URL construction |
| `VITE_OAUTH_PORTAL_URL` | `EXPO_PUBLIC_OAUTH_PORTAL_URL` | Login page redirect URL |
| `OAUTH_SERVER_URL` | `EXPO_PUBLIC_OAUTH_SERVER_URL` | OAuth server communication |
| `OWNER_OPEN_ID` | `EXPO_PUBLIC_OWNER_OPEN_ID` | Client-side admin detection |
| `OWNER_NAME` | `EXPO_PUBLIC_OWNER_NAME` | Display owner name in UI |

---

## 2. Database

The app uses **MySQL 8+** with **Drizzle ORM**.

**Connection:** Set `DATABASE_URL` to a standard MySQL connection string: `mysql://username:password@hostname:3306/database_name?ssl={"rejectUnauthorized":true}`

**Schema location:** `drizzle/schema.ts` — contains 12 tables: `users`, `member_profiles`, `events`, `event_rsvps`, `songs`, `setlists`, `setlist_songs`, `media`, `devotionals`, `chat_messages`, `suggestions`, `suggestion_comments`, `member_payments`.

**Migration steps:**
```bash
# Generate migration SQL and apply it
pnpm db:push
```

This runs `drizzle-kit generate && drizzle-kit migrate`, which reads `drizzle.config.ts` and applies schema changes to your database.

**To use your own MySQL database:** Provision a MySQL 8+ instance from any provider (PlanetScale, Railway, AWS RDS, DigitalOcean, or local MySQL), create a database, set the `DATABASE_URL`, and run `pnpm db:push` to create all tables. Your existing data in the Manus-hosted database will not transfer automatically — you would need to export/import it manually via `mysqldump`.

---

## 3. Authentication System (Manus OAuth) — How to Replace

The current auth system is **fully dependent on Manus OAuth**. Here is what it does and how to replace it:

**Current flow:**
1. User taps "Sign In" → redirected to `manus.im/app-auth` login page
2. User authenticates via Google/Apple/Facebook/Microsoft/email
3. Manus OAuth server issues an authorization code
4. Your server (`server/_core/oauth.ts`) exchanges the code for an access token via `OAUTH_SERVER_URL`
5. Your server creates a local JWT session cookie signed with `JWT_SECRET`
6. Subsequent requests are authenticated by verifying that JWT locally

**Key files to replace:**
- `server/_core/sdk.ts` — The `SDKServer` class handles token exchange, user info retrieval, and session management. The `exchangeCodeForToken()` and `getUserInfo()` methods call Manus-specific gRPC endpoints.
- `server/_core/oauth.ts` — Express routes for `/api/oauth/callback`, `/api/oauth/mobile`, `/api/auth/me`, `/api/auth/logout`, `/api/auth/session`.
- `constants/oauth.ts` — Client-side login URL construction pointing to `manus.im/app-auth`.

**Recommended replacement options:**

| Option | Effort | Description |
|--------|--------|-------------|
| **Clerk** | Low | Drop-in auth provider with Expo SDK. Replace OAuth routes with Clerk middleware. |
| **Supabase Auth** | Low-Medium | Free tier includes social logins. Replace SDK calls with Supabase client. |
| **Firebase Auth** | Medium | Google's auth service with social login support. Well-documented Expo integration. |
| **Custom OAuth** | High | Set up your own OAuth server with Passport.js or similar. Full control but most work. |

**What you can keep:** The local JWT session system (`JWT_SECRET`, `verifySession`, `signSession`) is self-contained and works independently. You only need to replace the token exchange and user info retrieval parts that call Manus endpoints.

---

## 4. Storage/Upload Services

**Current setup:** File uploads (profile images, audio files) use a Manus-hosted S3-compatible storage proxy defined in `server/storage.ts`. It requires two environment variables:

- `BUILT_IN_FORGE_API_URL` — Manus storage proxy base URL
- `BUILT_IN_FORGE_API_KEY` — Manus storage proxy API key

**These will stop working outside Manus.** To replace:

| Option | Steps |
|--------|-------|
| **AWS S3** | Create an S3 bucket, get access keys, replace `storagePut`/`storageGet` in `server/storage.ts` with `@aws-sdk/client-s3` calls |
| **Cloudflare R2** | S3-compatible, often cheaper. Same code pattern as S3. |
| **Supabase Storage** | Free tier available. Replace with Supabase storage client. |
| **Firebase Storage** | If using Firebase Auth, this is a natural pairing. |

The `server/storage.ts` file is a clean abstraction — you only need to rewrite the `storagePut()` and `storageGet()` functions (about 30 lines each) to point to your new storage provider.

**Notification service** (`server/_core/notification.ts`) also uses the forge API to send owner notifications. Replace with email (Nodemailer + Gmail/SendGrid) or push notifications (Expo Push).

---

## 5. Local Setup Steps

```bash
# 1. Clone/download the project
cd the-plug-app

# 2. Install dependencies
pnpm install

# 3. Create .env file at project root
cat > .env << 'EOF'
DATABASE_URL=mysql://user:pass@localhost:3306/theplug
JWT_SECRET=your-random-secret-string-at-least-32-chars
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im
OWNER_OPEN_ID=your-owner-open-id
OWNER_NAME=Your Name
BUILT_IN_FORGE_API_URL=https://your-storage-url
BUILT_IN_FORGE_API_KEY=your-storage-key
NODE_ENV=development
EOF

# 4. Push database schema
pnpm db:push

# 5. Start development (runs Express server on :3000 + Metro on :8081)
pnpm dev

# 6. Open in browser
# Web: http://localhost:8081
# API: http://localhost:3000

# 7. Test on phone (Expo Go)
# Scan the QR code shown in terminal with Expo Go app
```

**Prerequisites:** Node.js 22+, pnpm 9+, MySQL 8+ running locally or remotely.

---

## 6. Publishing to iOS App Store

The project is already configured for **EAS Build** (Expo Application Services). Here are the exact steps:

```bash
# 1. Install EAS CLI globally
npm install -g eas-cli

# 2. Log in to your Expo account (create one at expo.dev if needed)
eas login

# 3. Update app.config.ts with your own identifiers:
#    - Change bundleId to your own (e.g., "com.theplugworship.app")
#    - Change appSlug if desired
#    - Update scheme to match your bundle ID

# 4. Register your app with Apple
eas build:configure

# 5. Build for iOS production
eas build --platform ios --profile production
# This will prompt you to log in with your Apple Developer account ($99/year)
# EAS handles provisioning profiles and certificates automatically

# 6. Submit to App Store
eas submit --platform ios --profile production
# This uploads the build to App Store Connect

# 7. In App Store Connect (appstoreconnect.apple.com):
#    - Add screenshots, description, keywords
#    - Set pricing (Free)
#    - Submit for review (typically 1-3 days)
```

**Important `app.config.ts` changes before publishing:**

| Setting | Current Value | Change To |
|---------|--------------|-----------|
| `bundleId` | `space.manus.the.plug.app.t20260416143548` | Your own (e.g., `com.theplugworship.app`) |
| `scheme` | `manus20260416143548` | Your own (e.g., `theplugworship`) |
| `experiments.baseUrl` | `"/api"` | Remove this line (only needed for Manus gateway) |
| `extra.eas.projectId` | `08d5dc4c-b5d9-4120-a18d-45a48da73e3f` | Your own EAS project ID (auto-generated by `eas build:configure`) |

**For Android (Google Play):**
```bash
eas build --platform android --profile production
eas submit --platform android --profile production
```

---

## 7. Manus-Specific Dependencies That Will Break

| Dependency | Files Affected | Impact | Priority to Replace |
|-----------|---------------|--------|-------------------|
| **Manus OAuth** (login/signup) | `server/_core/sdk.ts`, `server/_core/oauth.ts`, `constants/oauth.ts` | Users cannot sign in at all | **Critical** — app is unusable without auth |
| **Manus Storage Proxy** (file uploads) | `server/storage.ts` | Profile image uploads, audio uploads fail | **High** — core features broken |
| **Manus Notification Service** | `server/_core/notification.ts` | Owner notifications on new signups fail silently | **Low** — app still works, just no notifications |
| **`experiments.baseUrl: "/api"`** | `app.config.ts` | Routing breaks if not behind Manus gateway | **Medium** — remove when self-hosting |
| **Manus-hosted MySQL** | `DATABASE_URL` env var | No data access | **Critical** — provision your own DB |
| **`space.manus.*` bundle ID** | `app.config.ts` | Cannot publish to App Store under Manus namespace | **Critical** — change before publishing |

---

## 8. Recommended Path to Full Ownership

The most practical path to fully owning and maintaining this app long-term:

**Phase 1 — Immediate (Day 1-2):**
1. Download the full source code from Manus (use the "Download as ZIP" option in the Management UI's three-dot menu).
2. Set up a **MySQL database** on Railway, PlanetScale, or AWS RDS. Export your existing data from the Manus database (connection info available in Settings > Database in the Management UI).
3. Replace the **bundle ID** in `app.config.ts` with your own (e.g., `com.theplugworship.app`).
4. Remove `experiments.baseUrl: "/api"` from `app.config.ts` since you won't be behind the Manus gateway.

**Phase 2 — Auth Replacement (Day 3-5):**
5. Replace Manus OAuth with **Clerk** or **Supabase Auth**. This is the biggest change but both have excellent Expo guides. You'll rewrite `server/_core/sdk.ts` and `server/_core/oauth.ts` to use your new auth provider's SDK.
6. Update `constants/oauth.ts` on the client to redirect to your new login page.

**Phase 3 — Storage Replacement (Day 5-7):**
7. Replace Manus storage with **AWS S3** or **Cloudflare R2**. Rewrite the two functions in `server/storage.ts`.
8. Replace the notification service in `server/_core/notification.ts` with **Nodemailer** (Gmail SMTP) or **Expo Push Notifications**.

**Phase 4 — Deploy & Publish (Day 7-10):**
9. Deploy the Express server to **Railway**, **Render**, or **Fly.io** (all have free/cheap tiers and support Node.js + MySQL).
10. Build and submit to the App Store using `eas build` and `eas submit` (requires Apple Developer account, $99/year).
11. Set up a custom domain for your web version.

**Long-term maintenance:** The tech stack (Expo SDK 54, React Native 0.81, TypeScript, Drizzle ORM) is modern and well-supported. Keep dependencies updated with `npx expo install --fix` periodically. Expo publishes SDK updates roughly every 3-4 months.

---

**Questions?** The codebase is well-structured with clear separation between client (`app/`, `components/`, `hooks/`, `lib/`) and server (`server/`). All Manus-specific code is isolated in `server/_core/sdk.ts`, `server/_core/oauth.ts`, `server/storage.ts`, `server/_core/notification.ts`, and `constants/oauth.ts` — making replacement straightforward without touching the rest of the app.
