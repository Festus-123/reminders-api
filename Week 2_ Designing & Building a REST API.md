# Week 2: Designing & Building a REST API (MVC + Service)

Last week you got five routes responding with placeholder text. This week we give those routes a real, scalable structure — the same **Controller → Service → Model** pattern used by large engineering teams — and by the end of it, `reminders-api` will do real CRUD against an in-memory array (real persistence with PostgreSQL comes next week).

---

## Module 3: The Controller Layer

**Objective:** Understand why backends are layered, and extract your route logic into a dedicated Controller.

### 1. Why Layer a Backend At All?

Right now, `reminderRoutes.js` still has all the logic wedged into each route handler. That works for placeholder strings, but once real logic shows up — reading the database, validating input, computing things — a single file per resource gets messy fast. The fix used by most production backends is to split responsibilities into three layers:

A useful analogy is a restaurant:

* **Controller** — the waiter. Takes the request (order), passes it to the kitchen, brings back the response (dish). It doesn't cook anything itself.
* **Service** — the kitchen. Does the actual work: applies business logic, combines data, runs calculations.
* **Model** — the ingredients. Talks to the database and nothing else — it doesn't care how the food gets prepared or served.

| Layer | Responsibility | Talks To |
| :--- | :--- | :--- |
| **Controller** | Handle HTTP request/response, status codes | Service |
| **Service** | Business logic, validation rules, coordination | Model |
| **Model** | Database queries only | The database |

### 2. Building `reminderController.js`

```bash
mkdir src/controllers
touch src/controllers/reminderController.js
```

```javascript
// src/controllers/reminderController.js
export const ReminderController = {
  async getAllReminders(req, res) {
    res.send('Get all reminders');
  },

  async getReminderById(req, res) {
    res.send('Get single reminder by id');
  },

  async createReminder(req, res) {
    res.send('Create a new reminder');
  },

  async updateReminder(req, res) {
    res.send('Update some fields for existing reminder');
  },

  async deleteReminder(req, res) {
    res.send('Delete a reminder');
  },
};
```

Now clean up the router so it only wires paths to controller methods — no logic at all:

```javascript
// src/routes/reminderRoutes.js
import { Router } from 'express';
import { ReminderController } from '../controllers/reminderController.js';

const router = Router();

router.get('/', ReminderController.getAllReminders);
router.get('/:id', ReminderController.getReminderById);
router.post('/', ReminderController.createReminder);
router.patch('/:id', ReminderController.updateReminder);
router.delete('/:id', ReminderController.deleteReminder);

export default router;
```

> **Note:** the router now reads almost like documentation — "when a request hits `GET /:id`, call `ReminderController.getReminderById`." All the *how* lives in the controller.

### 3. Reading Data From Requests

Controllers are also where you pull data out of the request. There are two places data comes from:

**URL parameters** (`:id` in the path) — used for identifying *which* record you're working with:

```javascript
async getReminderById(req, res) {
  const reminderId = parseInt(req.params.id, 10);
  res.send(`Reminder ID: ${reminderId}`);
}
```

**Request body** (JSON sent by the client) — used for the actual data the client wants to send:

```javascript
async createReminder(req, res) {
  const { title, notes } = req.body;
  res.send(`Reminder: ${title}`);
}
```

`req.params.NAME` gets you a named route parameter; `req.body` gets you the parsed JSON body — which only works because you registered `express.json()` back in Week 1.

**⭐️ Class Exercise: Wire Every Controller Method**

Update all five `ReminderController` methods so that `getReminderById`, `updateReminder`, and `deleteReminder` read and echo back `req.params.id`, and `createReminder` reads and echoes back `req.body.title`.

---

## Module 4: The Service and Model Layers

**Objective:** Add the remaining two layers, and get real (if temporary) in-memory CRUD working end to end.

### 1. The Service Layer

The service layer holds the actual **business logic** — for now, that's just reading from and writing to an array, but this is exactly where things like "you can't complete a reminder that's already deleted" would live later.

```bash
mkdir src/services
touch src/services/reminderService.js
```

```javascript
// src/services/reminderService.js
export const ReminderService = {
  async getAllReminders(filters) {
    // Fetch All Reminders
    return [];
  },

  async getReminderById(reminderId) {
    // Fetch Reminder By Id
    return {};
  },

  async createReminder(newReminder) {
    // Create Reminder
    return {};
  },

  async updateReminder(reminderId, newValues) {
    // Update Reminder
    return {};
  },

  async deleteReminder(reminderId) {
    // Delete Reminder
    return { message: 'Reminder deleted successfully' };
  },
};
```

### 2. The Model Layer

The model is the *only* layer allowed to touch the actual data store. This week that's an in-memory array; next week it becomes real SQL — and because the Service layer never talks to the array directly, that swap will barely touch the Service at all.

```bash
mkdir src/models
touch src/models/reminderModel.js
```

```javascript
// src/models/reminderModel.js
let reminders = []; // temporary in-memory "database"
let nextId = 1;

export const ReminderModel = {
  async getAll() {
    return reminders;
  },

  async findById(id) {
    return reminders.find((r) => r.id === id);
  },

  async create({ title, notes, userId }) {
    const reminder = {
      id: nextId++,
      title,
      notes: notes ?? null,
      completed: false,
      userId,
      createdAt: new Date().toISOString(),
    };
    reminders.push(reminder);
    return reminder;
  },

  async update(id, newValues) {
    const reminder = reminders.find((r) => r.id === id);
    if (!reminder) return null;
    Object.assign(reminder, newValues);
    return reminder;
  },

  async delete(id) {
    const lengthBefore = reminders.length;
    reminders = reminders.filter((r) => r.id !== id);
    return lengthBefore - reminders.length; // rows deleted (0 or 1)
  },
};
```

### 3. Wiring All Three Layers Together

Now update the Service to call the Model, and the Controller to call the Service:

```javascript
// src/services/reminderService.js
import { ReminderModel } from '../models/reminderModel.js';

export const ReminderService = {
  async getAllReminders() {
    return ReminderModel.getAll();
  },

  async getReminderById(reminderId) {
    const reminder = await ReminderModel.findById(reminderId);
    if (!reminder) throw new Error('Reminder not found');
    return reminder;
  },

  async createReminder(newReminder) {
    const { title, notes, userId } = newReminder;
    const sanitized = { title: title?.trim(), notes: notes?.trim(), userId };
    return ReminderModel.create(sanitized);
  },

  async updateReminder(reminderId, newValues) {
    const updated = await ReminderModel.update(reminderId, newValues);
    if (!updated) throw new Error('Reminder not found');
    return updated;
  },

  async deleteReminder(reminderId) {
    const rowsDeleted = await ReminderModel.delete(reminderId);
    if (rowsDeleted === 0) throw new Error('Reminder not found');
    return { message: 'Reminder deleted successfully' };
  },
};
```

```javascript
// src/controllers/reminderController.js
import { ReminderService } from '../services/reminderService.js';

export const ReminderController = {
  async getAllReminders(req, res) {
    try {
      const reminders = await ReminderService.getAllReminders();
      res.status(200).json(reminders);
    } catch (error) {
      res.status(500).json({ message: 'Internal Server Error' });
    }
  },

  async getReminderById(req, res) {
    try {
      const reminderId = parseInt(req.params.id, 10);
      const reminder = await ReminderService.getReminderById(reminderId);
      res.status(200).json(reminder);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  },

  async createReminder(req, res) {
    try {
      const newReminder = await ReminderService.createReminder(req.body);
      res.status(201).json(newReminder);
    } catch (error) {
      res.status(500).json({ message: 'Internal Server Error' });
    }
  },

  async updateReminder(req, res) {
    try {
      const reminderId = parseInt(req.params.id, 10);
      const updated = await ReminderService.updateReminder(reminderId, req.body);
      res.status(200).json(updated);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  },

  async deleteReminder(req, res) {
    try {
      const reminderId = parseInt(req.params.id, 10);
      const result = await ReminderService.deleteReminder(reminderId);
      res.status(200).json(result);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  },
};
```

> **Note:** the controller now only knows about *HTTP* concerns — status codes and JSON shapes. It has no idea whether reminders live in an array or a database. That's the whole point of layering: next week, only `reminderModel.js` changes.

### 4. Real-World List Endpoints: Pagination, Filtering & Sorting

Right now `GET /reminders` returns the *entire* array, every single time, no matter how large it grows. A real client — especially a mobile app rendering a scrolling list — never actually wants "everything at once." This is one of the most common things a junior backend dev is expected to already know how to do.

* **Pagination:** `?limit=20&offset=0` — return a bounded page of results, not the whole table.
* **Filtering:** `?completed=true` — return only reminders matching a condition.
* **Sorting:** `?sort=-createdAt` — a leading `-` means descending; no `-` means ascending.

Update all three layers to pass these through:

```javascript
// src/controllers/reminderController.js (getAllReminders, updated)
async getAllReminders(req, res) {
  try {
    const { completed, sort, limit, offset } = req.query;
    const filters = {
      completed: completed === undefined ? undefined : completed === 'true',
      sort,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    };
    const reminders = await ReminderService.getAllReminders(filters);
    res.status(200).json(reminders);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
},
```

```javascript
// src/services/reminderService.js (getAllReminders, updated)
async getAllReminders(filters) {
  return ReminderModel.getAll(filters);
},
```

```javascript
// src/models/reminderModel.js (getAll, updated — in-memory version)
async getAll({ completed, sort, limit, offset } = {}) {
  let result = [...reminders];

  if (completed !== undefined) {
    result = result.filter((r) => r.completed === completed);
  }

  if (sort === '-createdAt') {
    result = result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sort === 'createdAt') {
    result = result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  return result.slice(offset, offset + limit);
},
```

*This in-memory version is a stand-in — next week, the exact same `{ completed, sort, limit, offset }` shape passes straight through to a real SQL query instead (`WHERE`, `ORDER BY`, `LIMIT`/`OFFSET`), and neither the Controller nor the Service needs to change at all. That's the entire point of the layering you just built.*

**⭐️ Class Exercise: List With Real Query Params**
1. Create 5+ reminders, some with `completed: true`.
2. Test `GET /reminders?completed=true` and confirm only completed ones come back.
3. Test `GET /reminders?limit=2&offset=2` and confirm you get exactly reminders 3-4, not the whole list.
4. Test `GET /reminders?sort=-createdAt` and confirm the newest reminder comes back first.

### 5. Testing With a Real Postman Collection

A saved Postman collection is a real, useful deliverable — not just busywork. Create requests for all five routes, with example JSON bodies for `POST` and `PATCH`, and export the collection into your repo.

> **Beyond Postman — Naming OpenAPI:** A Postman collection is great for your own manual testing, but it isn't a *contract* another team can generate a client from or validate requests against automatically. **OpenAPI** (formerly Swagger) is the industry-standard format for describing a REST API's shape — every endpoint, every field, every status code — in a single spec file that tools can turn into interactive docs, generated client code, or automated request validation. Given a separate team (the React Native course, in this program's case) has to consume this exact API, an OpenAPI spec is the more rigorous, professional version of what your Postman collection does informally. This course sticks with Postman for simplicity, but know the name — you'll meet it fast on a real team.

| HTTP Status | When To Use It |
| :--- | :--- |
| `200 OK` | Successful GET, PATCH, or DELETE |
| `201 Created` | Successful POST that created a new resource |
| `404 Not Found` | The requested `:id` doesn't exist |
| `500 Internal Server Error` | Something unexpected broke on the server |

**⭐️ Class Exercise: Full CRUD, For Real**

Using Postman: create three reminders, list them all, fetch one by id, update one's `completed` field, then delete one. Confirm the array shrinks and grows exactly as expected at each step.

---

## 📝 Week 2 Assignment: "A Fully Layered In-Memory API"

**Objective:** Complete Controller/Service/Model separation with working in-memory CRUD.

### Requirements

1. **Controller** (`controllers/reminderController.js`): handles only `req`/`res` and status codes — no business logic.
2. **Service** (`services/reminderService.js`): holds business logic, delegates all data access to the Model.
3. **Model** (`models/reminderModel.js`): the only file touching the in-memory `reminders` array.
4. **Status codes:** `200` for reads/updates/deletes, `201` for creates, `404` when an id isn't found, `500` for unexpected errors.
5. **List endpoint:** `GET /reminders` supports `?completed=`, `?sort=`, and `?limit=`/`?offset=` query params, all the way through Controller → Service → Model.
6. **Postman collection:** committed to the repo at `postman/reminders-api.postman_collection.json`, covering all 5 routes (including a couple of query-param variations on the list endpoint) with example request bodies.

### Submission Code Structure (Starter)

If you're unsure where to start, this is the shape to fill in:

```javascript
// src/models/reminderModel.js
let reminders = [];
let nextId = 1;

export const ReminderModel = {
  async getAll() { /* TODO */ },
  async findById(id) { /* TODO */ },
  async create({ title, notes, userId }) { /* TODO */ },
  async update(id, newValues) { /* TODO */ },
  async delete(id) { /* TODO */ },
};
```

### Git Workflow

* `git commit -m "refactor: introduce Controller/Service/Model layers"`
* `git commit -m "feat: implement in-memory CRUD for reminders"`
* `git commit -m "chore: add Postman collection for manual testing"`
