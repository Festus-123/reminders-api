# Week 5: Input Validation, Error Handling & Connecting the Mobile Client

The API works — but right now it trusts every request completely. Send `POST /reminders` with no `title` at all, or a `title` that's 10,000 characters long, and it'll happily try to insert it. This week we lock that down with real validation and consistent error responses, and then do the thing that actually proves this API works: connect it to the real React Native app from the companion course, running on a real device.

---

## Module 9: Validation with Zod & Centralized Error Handling

**Objective:** Reject bad data before it reaches your database, and return clean, consistent error responses.

### 1. Why Validate at the Edge?

Without validation, users can send data that breaks your app in ways that are hard to trace back to the cause, and unhandled errors can leak internal details (stack traces, SQL fragments) that are a security risk. The fix: check incoming data **before** it goes anywhere near your business logic.

```bash
npm install zod
```

### 2. Building the Schemas

```bash
mkdir src/schemas
touch src/schemas/reminderSchema.js
```

```javascript
// src/schemas/reminderSchema.js
import { z } from 'zod';

// The full shape of a reminder as stored in the database
export const reminderSchema = z.object({
  id: z.number(),
  title: z.string().min(1, 'Title should be longer').max(255),
  notes: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  completed: z.boolean().optional().default(false),
  userId: z.number(),
  createdAt: z.string().datetime(),
});

// What a client is allowed to send when CREATING a reminder
// (id, completed, createdAt, userId are all set by the server, never the client)
export const createReminderSchema = reminderSchema.omit({
  id: true,
  completed: true,
  createdAt: true,
  userId: true,
});

// What a client is allowed to send when UPDATING a reminder
// (everything optional — a PATCH might only touch one field)
export const updateReminderSchema = z.object({
  title: z.string().min(1, 'Title should be longer').max(255).optional(),
  notes: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  completed: z.boolean().optional(),
});
```

> **Note:** `createReminderSchema` is *derived* from `reminderSchema` with `.omit()` rather than written from scratch — one source of truth for what a reminder looks like, with two narrower views on top of it.

### 3. The Validation Middleware

```bash
mkdir src/middlewares
touch src/middlewares/validationMiddleware.js
```

```javascript
// src/middlewares/validationMiddleware.js
import { ZodError } from 'zod';

export function validateData(schema) {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((issue) => ({
          message: `${issue.path.join('.')} is ${issue.message}`,
        }));
        res.status(400).json({ error: 'Invalid data', details: errorMessages });
      } else {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  };
}
```

`validateData(schema)` is a **middleware factory** — a function that returns a middleware, configured for whichever schema you pass in. Apply it to the routes that accept a body:

```javascript
// src/routes/reminderRoutes.js
import { createReminderSchema, updateReminderSchema } from '../schemas/reminderSchema.js';
import { validateData } from '../middlewares/validationMiddleware.js';

router.post('/', validateData(createReminderSchema), ReminderController.createReminder);
router.patch('/:id', validateData(updateReminderSchema), ReminderController.updateReminder);
```

> **Note:** `GET` and `DELETE` don't receive a body from the client, so they don't need validation here.

### 4. Custom Errors Instead of Plain `Error`

`throw new Error()` always defaults to a `500` — there's no clean way to say "this is actually a 404" or "this is actually a 403." We fix that with a small custom error class:

```bash
mkdir src/utils src/constants
touch src/utils/CustomError.js src/constants/errorMessages.js
```

```javascript
// src/utils/CustomError.js
export class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}
```

```javascript
// src/constants/errorMessages.js
const ERROR_MESSAGES = {
  REMINDER_NOT_FOUND: 'Reminder not found',
  INVALID_DATA: 'Invalid data',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'You do not have permission to perform this action',
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
};

export default ERROR_MESSAGES;
```

Centralizing error text means you can fix a typo or add translations in one place later, instead of hunting through every service file.

### 5. One Centralized Error Handler

```javascript
// src/middlewares/errorHandlerMiddleware.js
import ERROR_MESSAGES from '../constants/errorMessages.js';

function errorHandlerMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

  // Every error that reaches this point gets logged — a silent 500 in production
  // is strictly worse than a noisy one, because at least a noisy one leaves a trail.
  console.error(`[${req.method} ${req.originalUrl}] ${statusCode}: ${err.stack || err.message}`);

  res.status(statusCode).json({ error: message });
}

export default errorHandlerMiddleware;
```

> **This log line is not optional.** Without it, every unexpected `500` your API ever produces vanishes the instant the response is sent — nothing records what broke, when, or on which request. `console.error` is the minimum bar; Week 6 upgrades this to a real structured logger once the API is actually deployed and `console.error` alone is no longer enough to find anything in production.

Register it **last**, after every route:

```javascript
// src/index.js
import errorHandlerMiddleware from './middlewares/errorHandlerMiddleware.js';
// ... all your app.use() route mounting ...
app.use(errorHandlerMiddleware); // must be last
```

Now update the service layer to `throw new CustomError(...)` instead of plain errors, and the controllers to forward every caught error with `next(error)` instead of handling it inline:

```javascript
// src/services/reminderService.js
import CustomError from '../utils/CustomError.js';
import ERROR_MESSAGES from '../constants/errorMessages.js';

async getReminderById(reminderId, userId) {
  const reminder = await ReminderModel.findById(reminderId);
  if (!reminder) throw new CustomError(ERROR_MESSAGES.REMINDER_NOT_FOUND, 404);
  if (reminder.user_id !== userId) {
    throw new CustomError(ERROR_MESSAGES.FORBIDDEN, 403);
  }
  return reminder;
}
```

```javascript
// src/controllers/reminderController.js
async getReminderById(req, res, next) {
  try {
    const reminderId = parseInt(req.params.id, 10);
    const reminder = await ReminderService.getReminderById(reminderId, req.user.id);
    res.status(200).json(reminder);
  } catch (error) {
    next(error); // hand off to errorHandlerMiddleware
  }
}
```

**How it all ties together:** the router validates the shape of the data first (`validateData`), then the controller only handles req/res and forwards errors, then the service throws structured `CustomError`s when something's actually wrong, and the one `errorHandlerMiddleware` at the very end turns any of those into a clean, consistent JSON response.

**⭐️ Class Exercise: Break It On Purpose**

Send `POST /reminders` with an empty `title`. Confirm you get a `400` with a readable message instead of a `500` or a silently-created broken reminder. Then try to `GET /reminders/999999` (an id that doesn't exist) and confirm you get a clean `404`.

---

## Module 10: Talking to a Real Mobile Client

**Objective:** Configure the API for a mobile client and prove the integration works on a real device.

### 1. Enabling CORS

**CORS (Cross-Origin Resource Sharing)** controls which origins are allowed to call your API from a browser context. Native mobile apps aren't subject to CORS the way browsers are, but Expo's dev tools and any web preview of your app will be — so configure it anyway:

```bash
npm install cors
```

```javascript
// src/index.js
import cors from 'cors';
app.use(cors());
```

### 2. Reviewing the Response Contract

Before testing against the real app, walk through every endpoint's JSON shape and compare it against what the React Native course expects (its Week 5). Field names matter — `title` on both sides, not `title` here and `reminder` there.

| Endpoint | Response Shape |
| :--- | :--- |
| `POST /api/v1/auth/signup`, `POST /api/v1/auth/login` | `{ accessToken: string, refreshToken: string, user: { id, email } }` |
| `POST /api/v1/auth/refresh` | `{ accessToken: string, refreshToken: string }` |
| `GET /api/v1/reminders` | `[{ id, title, notes, dueDate, completed, userId, createdAt }, ...]` |
| `POST /api/v1/reminders`, `GET /api/v1/reminders/:id`, `PATCH /api/v1/reminders/:id` | `{ id, title, notes, dueDate, completed, userId, createdAt }` |
| `DELETE /api/v1/reminders/:id` | `{ message: string }` |
| Any error | `{ error: string }` or `{ error: string, details: [...] }` |

> **This table, formalized:** what you're doing here by hand — writing down every endpoint's shape so another team can build against it — is exactly what an **OpenAPI** spec does formally, in a machine-readable file both sides can generate code and docs from instead of a table in a markdown doc. Worth reaching for on a real team with more than one consumer of an API; this table is the same idea at course scale.

### 3. Real-Device Testing

`localhost` on your laptop doesn't mean anything to a physical phone — it refers to the phone itself, not your computer. To test from a real device (or the Expo Go app):

1. Find your computer's **LAN IP address** (e.g. `192.168.1.42`) — on macOS, `ipconfig getifaddr en0`.
2. Point the Expo app's API base URL at `http://192.168.1.42:3000` instead of `http://localhost:3000`.
3. Make sure your phone and computer are on the **same Wi-Fi network**.
4. If that's not possible (different networks, restrictive Wi-Fi), use a tunnel like `ngrok` or Expo's built-in tunnel option instead.

**⭐️ Class Exercise: The Real Integration Test**

Using the actual Expo app from the React Native course: sign up, log in, create a reminder, and confirm it shows up in a `GET /reminders` from Postman too — proving both apps are really talking to the same database. Fix anything that breaks along the way (a mismatched field name, a missing CORS header, a wrong base URL) — these are the real bugs that only show up once two real systems talk to each other.

---

## 📝 Week 5 Assignment: "Validated, Integrated, and Talking to a Real App"

**Objective:** Lock down input validation and error handling, and prove real end-to-end integration.

### Requirements

1. Every `POST`/`PATCH` reminder request is validated with a Zod schema; invalid input returns `400` with clear, field-level messages.
2. All errors — from any layer — flow through the single `errorHandlerMiddleware` and return a consistent `{ error: "..." }` shape with the correct status code.
3. `cors` is configured and enabled.
4. The real Expo app from the React Native course can sign up, log in, and perform full reminders CRUD against this API from a physical device or simulator on your local network.

### Git Workflow

* `git commit -m "feat: add Zod validation for reminder create/update"`
* `git commit -m "feat: add CustomError class and centralized error handler"`
* `git commit -m "feat: enable CORS and verify integration with the React Native app"`
