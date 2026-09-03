# Week 6: Testing, Security & Deployment — Ship the Reminders API

This is it — the last week. The Reminders API already works end to end against a real mobile app. This week we make sure it *keeps* working (automated tests), harden it against the basics (security middleware), and put it on the public internet where the real, shipped React Native app can actually reach it.

---

## Module 11: Automated Testing

**Objective:** Write real integration tests so future changes can't silently break signup, login, or reminders CRUD.

### 1. Why Automate What You've Been Testing By Hand?

You've been testing every endpoint manually in Postman for five weeks. That works, but it doesn't scale, and it's easy to forget to re-check something after a change. **Integration tests** send real HTTP requests to your actual Express app and assert on the response — the same thing you've been doing by hand, just repeatable in seconds.

### 2. Setting Up Vitest + Supertest

```bash
npm install --save-dev vitest supertest
```

Supertest lets you send requests directly to your Express `app` object, in-process — no need for the server to actually be listening on a port.

```javascript
// src/app.js — export the app itself, separate from app.listen()
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';
import errorHandlerMiddleware from './middlewares/errorHandlerMiddleware.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' })); // deliberately unversioned — health checks are infrastructure, not API surface
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/reminders', reminderRoutes);

app.use(errorHandlerMiddleware);

export default app;
```

```javascript
// src/index.js — now just imports app and starts listening
import app from './app.js';

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Reminders API listening on port ${PORT}`);
});
```

> **Note:** splitting `app.js` (the Express app itself) from `index.js` (starting the server) is what makes testing possible — tests import `app` and never actually bind to a port.

A smoke test:

```javascript
// tests/health.test.js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('GET /health', () => {
  it('returns 200 and status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
```

### 3. Testing the Real Endpoints

Use a **dedicated Neon database branch** for tests (Neon supports instant, cheap branching) so tests never touch your real development or production data.

```javascript
// tests/reminders.test.js
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Reminders API', () => {
  let accessToken;

  beforeAll(async () => {
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: `test-${Date.now()}@example.com`, password: 'password123' });
    accessToken = signupRes.body.accessToken;
  });

  it('rejects requests with no token', async () => {
    const res = await request(app).get('/api/v1/reminders');
    expect(res.status).toBe(401);
  });

  it('creates and fetches a reminder for the logged-in user', async () => {
    const createRes = await request(app)
      .post('/api/v1/reminders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Buy milk', notes: 'Whole milk, not skim' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.title).toBe('Buy milk');

    const listRes = await request(app)
      .get('/api/v1/reminders')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThan(0);
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/v1/reminders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ notes: 'no title here' });

    expect(res.status).toBe(400);
  });
});
```

**⭐️ Class Exercise: Write the Missing Tests**

Add tests for: logging in with the wrong password (`401`), updating a reminder (`200`, and the field actually changed), and deleting a reminder you don't own (`403`).

### 4. Making Tests Actually Run Automatically: GitHub Actions

Tests sitting in a `tests/` folder only protect you if you remember to run them before every push. **CI (Continuous Integration)** means a server runs them for you, automatically, on every push or pull request — so a broken test blocks the merge instead of quietly shipping.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm ci
      - run: npm test
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          JWT_SECRET: ${{ secrets.TEST_JWT_SECRET }}
```

* `actions/checkout` pulls your repo onto the runner; `actions/setup-node` installs the exact Node version you specify.
* `npm ci` (not `npm install`) installs *exactly* what's in `package-lock.json` — the standard, reproducible choice for CI.
* `secrets.TEST_DATABASE_URL`/`secrets.TEST_JWT_SECRET` are set in your Github repo's **Settings → Secrets and variables → Actions** — pointing at your dedicated Neon test branch from section 3, never your real database.

**⭐️ Class Exercise: Wire Up Real CI**
1. Add `.github/workflows/ci.yml` exactly as shown, and add `TEST_DATABASE_URL`/`TEST_JWT_SECRET` as repository secrets on Github.
2. Push a commit and confirm a green checkmark appears next to it on Github — click into it to see your actual test output run remotely.
3. Deliberately break a test locally, push it, and confirm Github shows a red ❌ instead of a green ✅ — this is the entire point: a broken test is now visible to anyone looking at the repo, not just to you if you happened to run `npm test` yourself.

---

## Module 12: Hardening & Shipping

**Objective:** Add baseline production security, then deploy the API to a live URL.

### 1. Security Headers & Rate Limiting

```bash
npm install helmet express-rate-limit
```

```javascript
// src/app.js
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

app.use(helmet()); // sets a batch of sensible security-related HTTP headers

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
});
app.use(limiter);
```

`helmet()` protects against a handful of well-known attack vectors (clickjacking, MIME-sniffing, etc.) with one line. This app-wide rate limiter protects against basic abuse — but it under-protects one specific route.

> **Why `/auth/login` needs its own, stricter limiter:** 100 requests per 15 minutes spread across your *entire* API is generous for normal use, but it's a gift to an attacker brute-forcing passwords against `POST /auth/login` specifically — 100 guesses every 15 minutes, forever, is still plenty. A sensitive endpoint like login deserves a tighter limiter of its own, on top of the general one:
> ```javascript
> // src/routes/authRoutes.js
> import rateLimit from 'express-rate-limit';
>
> const loginLimiter = rateLimit({
>   windowMs: 15 * 60 * 1000,
>   max: 5, // 5 login attempts per 15 minutes, per IP — deliberately much stricter
>   message: { error: 'Too many login attempts. Please try again later.' },
> });
>
> router.post('/login', loginLimiter, AuthController.login);
> ```
> The general `limiter` from above still applies to everything else; this one stacks an extra, tighter check specifically where brute-forcing is actually a risk.

### 2. Structured Logging

A simple request logger tells you what's actually happening in production, instead of finding out something's broken from a user complaint. `morgan` is the common starting point:

```bash
npm install morgan
```

```javascript
// src/app.js
import morgan from 'morgan';
app.use(morgan('combined'));
```

**Beyond `morgan`: Structured Logs.** `morgan`'s `combined` format is a plain text line — great for reading in a terminal, much harder to *query* once you're staring at millions of lines in a real hosting provider's log viewer (or a service like Datadog/CloudWatch). A structured logger like **`pino`** logs the same information as JSON instead, so you can filter "every 500 in the last hour" or "every request from this one user" as an actual query, not a `grep` and a prayer:

```bash
npm install pino pino-http
```

```javascript
// src/app.js
import pinoHttp from 'pino-http';
app.use(pinoHttp());
```

`pino-http` logs every request as one JSON line — method, path, status, response time — automatically. This course sticks with `morgan` as the simpler default, but know `pino`'s name: it's what a real production Node API almost always reaches for once logs need to be searched, not just read.

### 3. Deploying

We'll deploy to **Railway** or **Render** — both have a free tier suitable for a course project.

1. Push `reminders-api` to Github if you haven't already.
2. Create a new project on Railway/Render and connect your Github repo.
3. Set environment variables in the platform's dashboard (never commit them):
   * `DATABASE_URL` — your Neon connection string (consider using a **separate production Neon branch/project** from your dev one).
   * `JWT_SECRET` — a long, random production secret, different from your local one.
4. Deploy. Confirm the live URL responds:
   ```bash
   curl https://your-app.up.railway.app/health
   # {"status":"ok"}
   ```

> **A Note on Docker:** Railway/Render can deploy straight from your Github repo with zero config, which is why this course uses that path. A real production team more often deploys a **container** instead — a `Dockerfile` describing exactly how to build a runnable image of your app, so it behaves identically on your laptop, in CI, and in production. A minimal one for this API would be barely more than:
> ```dockerfile
> FROM node:24-alpine
> WORKDIR /app
> COPY package*.json ./
> RUN npm ci --omit=dev
> COPY . .
> CMD ["node", "src/index.js"]
> ```
> Both Railway and Render accept a `Dockerfile` directly if you ever want to try it — nothing to submit here, just worth knowing this exists as the more portable, industry-standard alternative to a platform's auto-detected build.

### 4. Final Integration

Update the React Native app's production build (companion course, Week 6) to point at this deployed URL instead of your local machine. Run through the full flow one more time — signup, login, create/edit/complete/delete a reminder — against the **live** API.

**⭐️ Class Exercise: Ship It**

Deploy your API. Send its live `/health` URL to a classmate and have them hit it from their own machine — if they get `{"status":"ok"}` back, it's really live.

---

## 📝 Week 6 / Final Project: Ship the Reminders API

**Goal:** Combine everything from all six weeks into one live, tested, secure service.

### Requirements

1. **Architecture:** Full Controller/Service/Model layering for both `reminders` and `auth`, mounted under `/api/v1`.
2. **Persistence:** Real PostgreSQL (Neon) via parameterized raw SQL — no in-memory data anywhere.
3. **Auth:** Signup/login with hashed passwords and both an access and refresh JWT; refresh tokens stored and rotated; every reminder scoped to its owner, with ownership enforced on update/delete.
4. **Validation & Errors:** Every write endpoint validated with Zod; all errors flow through one central handler with correct status codes, and every error is actually logged, not just returned to the client.
5. **List Endpoint:** `GET /reminders` supports pagination, filtering (including `overdue`, using the previously-unused `due_date` column), and sorting.
6. **Tests:** Vitest + Supertest covering auth and full reminders CRUD, all passing — and running automatically in GitHub Actions CI on every push.
7. **Security:** `helmet` enabled; a general rate limiter plus a stricter, dedicated one on `/auth/login`; secrets live in environment variables, never in code.
8. **Deployment:** Live on Railway or Render, backed by a production Neon database.
9. **Integration:** The deployed React Native app (companion course) works end to end against this live API.

### Final Deliverable

Submit: your Github repo URL, your live API URL, a link to a green CI run on Github, and a short screen recording (or live demo) showing the deployed mobile app successfully signing up, logging in, and managing reminders against this deployed API.

### Git Workflow

* `git commit -m "test: add Vitest + Supertest coverage for auth and reminders"`
* `git commit -m "ci: add GitHub Actions workflow to run tests on every push"`
* `git commit -m "chore: add helmet, tiered rate limiting, and request logging"`
* `git commit -m "chore: deploy reminders-api to production"`

Congratulations — you've built and shipped a real, authenticated, tested, versioned backend service from an empty folder, complete with refresh tokens, pagination, and a real CI pipeline. Everything from here (background jobs, richer full-text search, an OpenAPI spec, Docker) is a natural extension of the architecture you already understand.
