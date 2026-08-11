# Week 1: Node.js & Express Fundamentals — Bootstrapping the API

Welcome to the Node/Express course! Over the next six weeks you're going to build **one real product**: the backend for a Reminders app (an Apple Reminders clone). No throwaway examples — everything you write this week is the actual first commit of `reminders-api`, the same codebase you'll keep extending all the way to a live, deployed URL in Week 6.

This week we answer two questions: what is Node.js actually doing for us, and how do we stand up the smallest possible Express server that can talk to the outside world?

---

## Module 1: Your First Express Server

**Objective:** Understand what Node.js and Express give you, and get a real server responding to requests.

### 1. What Is Node.js?

Browsers run JavaScript inside a sandbox — no filesystem access, no ability to open a network port and listen for requests. **Node.js** is a JavaScript runtime built on Chrome's V8 engine that runs *outside* the browser, with access to the operating system: files, network, processes. That's what makes it possible to write a web server in JavaScript at all.

**Express** is a minimal, unopinionated web framework built on top of Node's built-in `http` module. You *could* build a server with raw `http.createServer()`, but you'd end up hand-rolling routing, body parsing, and error handling yourself. Express gives you all of that as a small, well-understood layer.

Confirm you have a recent Node.js installed:

```bash
node -v
# should print v24.x.x or newer (the current LTS)
```

### 2. Project Setup

Every project starts the same way: an empty folder, a `package.json`, and your dependencies.

```bash
mkdir reminders-api
cd reminders-api
npm init -y
npm install express
```

`npm init -y` creates a `package.json` with sensible defaults. Open it and add `"type": "module"` so we can use modern `import`/`export` syntax instead of `require`:

```json
{
  "name": "reminders-api",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js"
  },
  "dependencies": {
    "express": "^5.0.0"
  }
}
```

Create the entry file:

```bash
mkdir src
touch src/index.js
```

### 3. Your First Server

```javascript
// src/index.js
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Reminders API listening on port ${PORT}`);
});
```

Run it:

```bash
node src/index.js
```

You should see `Reminders API listening on port 3000` — and the process just... sits there. That's correct! A server's job is to stay alive and wait for requests.

> **Note:** `process.env.PORT || 3000` reads the `PORT` environment variable if one is set (which hosting platforms like Railway/Render will do automatically), falling back to `3000` for local development.

### 4. Defining Your First Routes

A **route** pairs an HTTP method (GET, POST, PATCH, DELETE...) and a URL path with a handler function. Every reminder in our app will eventually need five operations — the same five you'll see on almost every REST resource:

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/reminders` | Get all reminders |
| `GET` | `/reminders/:id` | Get one reminder by id |
| `POST` | `/reminders` | Create a new reminder |
| `PATCH` | `/reminders/:id` | Update some fields on an existing reminder |
| `DELETE` | `/reminders/:id` | Delete a reminder |

Let's add all five, for now just responding with a placeholder message:

```javascript
// src/index.js
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/reminders', (req, res) => {
  res.send('Get all reminders');
});

app.get('/reminders/:id', (req, res) => {
  res.send('Get single reminder by id');
});

app.post('/reminders', (req, res) => {
  res.send('Create a new reminder');
});

app.patch('/reminders/:id', (req, res) => {
  res.send('Update some fields for existing reminder');
});

app.delete('/reminders/:id', (req, res) => {
  res.send('Delete a reminder');
});

app.listen(PORT, () => {
  console.log(`Reminders API listening on port ${PORT}`);
});
```

> **Note:** `:id` is a **route parameter** — a placeholder that matches any value in that position of the URL (`/reminders/1`, `/reminders/42`, etc). We can have three different routes that all start with `/reminders/:id` because each is attached to a different HTTP method (`.get`, `.patch`, `.delete`).

**⭐️ Class Exercise: Prove It Works**

1. Restart your server (`node src/index.js`).
2. Open Postman (or Thunder Client) and send a request to each of the five routes above.
3. Confirm each one returns its placeholder message with a `200` status.

---

## Module 2: Routers & Middleware

**Objective:** Organize routes into their own file and understand Express middleware.

### 1. Why Not Just Keep Adding to `index.js`?

Right now `index.js` holds every route. That's fine for five routes — but this project will eventually have reminders routes *and* auth routes, plus server setup, plus middleware registration. Cramming everything into one file makes it hard to find anything. The fix: **one file per resource**, using Express's `Router`.

### 2. Creating `reminderRoutes.js`

```bash
mkdir src/routes
touch src/routes/reminderRoutes.js
```

```javascript
// src/routes/reminderRoutes.js
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.send('Get all reminders');
});

router.get('/:id', (req, res) => {
  res.send('Get single reminder by id');
});

router.post('/', (req, res) => {
  res.send('Create a new reminder');
});

router.patch('/:id', (req, res) => {
  res.send('Update some fields for existing reminder');
});

router.delete('/:id', (req, res) => {
  res.send('Delete a reminder');
});

export default router;
```

Notice the paths changed from `/reminders` to `/` and from `/reminders/:id` to `/:id`. That's because we're about to **mount** this router under the `/reminders` prefix — so it never needs to repeat it.

### 3. Mounting the Router

```javascript
// src/index.js
import express from 'express';
import reminderRoutes from './routes/reminderRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/api/v1/reminders', reminderRoutes);

app.listen(PORT, () => {
  console.log(`Reminders API listening on port ${PORT}`);
});
```

`app.use('/api/v1/reminders', reminderRoutes)` mounts the entire router under `/api/v1/reminders`. Now `GET /api/v1/reminders`, `POST /api/v1/reminders`, `PATCH /api/v1/reminders/:id`, and `DELETE /api/v1/reminders/:id` are all served from `reminderRoutes.js`, and `index.js` no longer contains any route logic at all — just wiring.

> **Why `/api/v1` and not just `/reminders`?** This is the one moment in the whole course where adding a version prefix is nearly free — one string, in one mount call — versus retrofitting it later once real clients (like the React Native app) have the unversioned URL baked in everywhere. `/v1` costs nothing today and buys you the ability to ship a breaking `/v2` later without touching existing clients at all. Notice `reminderRoutes.js` itself needed zero changes — the version prefix lives entirely at the mount point in `index.js`, not inside the router.

### 4. What Is Middleware?

**Middleware** is a function that runs *before* your route handler gets the request. It has the signature `(req, res, next)` and can inspect or modify the request, short-circuit it with a response, or call `next()` to hand off to whatever's next in the chain.

Express does **not** parse JSON request bodies by default — you have to opt in with a built-in middleware:

```javascript
// src/index.js
import express from 'express';
import reminderRoutes from './routes/reminderRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // Parses incoming JSON bodies into req.body
app.use('/api/v1/reminders', reminderRoutes);

app.listen(PORT, () => {
  console.log(`Reminders API listening on port ${PORT}`);
});
```

> **Warning:** middleware that should apply to *every* request (like `express.json()`) needs to be registered with `app.use()` **before** your routes. Express runs middleware in the order it's registered.

### 5. Faster Dev Workflow with `nodemon`

Restarting the server by hand after every change gets old fast. `nodemon` watches your files and restarts automatically.

```bash
npm install --save-dev nodemon
```

Add a script to `package.json`:

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  }
}
```

From now on, run `npm run dev` while you work.

**⭐️ Class Exercise: Refactor & Confirm**

1. Move all five reminder routes out of `index.js` and into `reminderRoutes.js` using `Router()`.
2. Mount the router in `index.js` under `/api/v1/reminders`.
3. Add `express.json()` as the first `app.use()` call.
4. Run `npm run dev`, change a placeholder message, save, and confirm the server restarts on its own.

---

## 📝 Week 1 Assignment: "Bootstrap the Reminders API"

**Objective:** Have a running Express server, structured into a router, ready for real logic next week.

### Requirements

1. **Project structure:**
   ```
   reminders-api/
     src/
       index.js
       routes/
         reminderRoutes.js
     package.json
   ```
2. **Server:** `npm run dev` starts the server on port `3000` (or `process.env.PORT`) using `nodemon`.
3. **Routes:** All five reminder routes (`GET /reminders`, `GET /reminders/:id`, `POST /reminders`, `PATCH /reminders/:id`, `DELETE /reminders/:id`) live in `routes/reminderRoutes.js` and are mounted in `index.js` via `app.use('/api/v1/reminders', reminderRoutes)` — so in practice they're reachable at `/api/v1/reminders`, etc.
4. **Middleware:** `express.json()` is registered before your routes.
5. **Verification:** Every route responds with its placeholder message when tested in Postman.

### Git Workflow

* `git init`, then push to a new `reminders-api` repository on Github.
* Suggested commits:
  * `git commit -m "feat: scaffold Express server with reminder route stubs"`
  * `git commit -m "refactor: extract reminder routes into their own router"`
  * `git commit -m "chore: add nodemon for local development"`
