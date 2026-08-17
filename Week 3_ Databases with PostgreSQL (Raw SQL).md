# Week 3: Databases with PostgreSQL (Raw SQL)

Every reminder you've created so far has vanished the moment you restarted the server — because it only ever lived in a JavaScript array in memory. This week, `reminders-api` gets a real database. We're deliberately reaching for **raw SQL via the `pg` library instead of an ORM** — understanding what's actually happening to your data is worth more right now than hiding behind an abstraction, and you can always add an ORM later once you know what it's saving you from.

---

## Module 5: Connecting to a Real Database

**Objective:** Stand up a real PostgreSQL database and connect to it from Express.

### 1. Choosing a Database

There are three broad ways to run a database:

| Database Type | Description | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Self-Hosted** | You install, configure, and maintain it yourself. | Full control, tune it however you like. | Requires real ops expertise; manual backups & scaling. |
| **Managed (e.g. AWS RDS)** | A cloud provider handles backups, scaling, maintenance. | Automated backups, less maintenance, scales for high traffic. | Can get expensive if not tuned correctly. |
| **Serverless (e.g. Neon)** | Fully cloud-managed, autoscales, pay for what you use. | No servers to manage, cheap for spiky/small workloads, quick to start. | Less low-level tuning control. |

For a small project like ours, **serverless Postgres** is the easy, sensible choice: no servers to manage, it scales automatically, and it has a generous free tier. If you're running a consistently high-traffic app or need deep performance tuning later, a managed database like RDS becomes worth the extra ops work — but that's not this project.

### 2. Creating a Neon Project

1. Go to [neon.tech](https://neon.tech/) and create a free account.
2. Click **New Project**.
3. Give it a name (e.g. `reminders-api`).
4. Pick a region close to where your users (or you, for development) actually are.
5. Click **Create** — you now have a running PostgreSQL database.

### 3. Installing `pg`

We need a PostgreSQL client for Node. The most widely used one is `pg` (node-postgres):

```bash
npm install pg
```

`pg` is the standard choice because it's the most widely used Postgres client for Node, supports **connection pooling** out of the box, and works with any Postgres-compatible service (not just Neon).

### 4. Getting Your Connection String

1. Open your Neon dashboard.
2. Click **Connect to your database**.
3. Copy the connection string — it looks like:
   ```
   postgres://user:password@your-db-host.compute.neon.tech/dbname
   ```
4. Add it to a `.env` file in your project root:
   ```
   DATABASE_URL=postgres://user:password@your-db-host.compute.neon.tech/dbname
   ```

> **Warning:** never commit `.env` to Git. Add it to `.gitignore` right now if it isn't already there. Credentials in a public repo will get scraped and abused within minutes.

### 5. Creating the Connection

```bash
mkdir src/config
touch src/config/db.js
```

```javascript
// src/config/db.js
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Sanity check: confirm we can actually reach the database
async function getPgVersion() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT version()');
    console.log(result.rows[0]);
  } finally {
    client.release();
  }
}

getPgVersion();

export default pool;
```

A `Pool` maintains a small set of reusable database connections instead of opening a brand-new one for every query — opening a fresh TCP connection per request is slow and doesn't scale.

### 6. Testing the Connection

Node has a native `--env-file` flag (no `dotenv` package required, since Node 20.6+):

```bash
node --env-file=.env src/config/db.js
```

If everything's wired up correctly, you'll see something like:

```json
{ "version": "PostgreSQL 16.0 on x86_64-pc-linux-gnu, compiled by gcc ..." }
```

**⭐️ Class Exercise: Confirm the Connection**

Run the command above. If it fails, double-check: is `.env` actually in your project root? Did you copy the *whole* connection string, including the password? Is your Neon project still running (it can pause on the free tier after inactivity)?

---

## Module 6: Hand-Rolled Migrations & Raw SQL Queries

**Objective:** Version-control your schema with hand-written migrations, and rewire the Model layer to run real SQL.

### 1. What Are Migrations?

A **migration** is a version-controlled, structured change to your database schema. Tools like Knex, Sequelize, TypeORM, or Prisma normally automate generating and running these. This week, we'll write them by hand — so you understand exactly what those tools are doing for you under the hood.

```bash
mkdir src/migrations
touch src/migrations/20260101_create_users_table.js
touch src/migrations/20260101_create_reminders_table.js
```

> **Note:** the timestamp prefix isn't decoration — it's what keeps migrations running in the correct order as your schema evolves. If you were using a migration tool, this naming would be generated for you automatically.

### 2. The `users` Table

```javascript
// src/migrations/20260101_create_users_table.js
import db from '../config/db.js';

export async function up() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    console.log(error);
  }
}

export async function down() {
  try {
    await db.query('DROP TABLE IF EXISTS users');
  } catch (error) {
    console.log(error);
  }
}

up();
```

* `id SERIAL PRIMARY KEY` — an auto-incrementing integer primary key.
* `email VARCHAR(255) UNIQUE NOT NULL` — no two users can share an email, and it can't be blank.
* `password_hash VARCHAR(255) NOT NULL` — we store a bcrypt **hash**, never the raw password (more on this in Week 4).
* `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP` — defaults to "now" automatically.

### 3. The `reminders` Table

```javascript
// src/migrations/20260101_create_reminders_table.js
import db from '../config/db.js';

export async function up() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        notes TEXT,
        due_date TIMESTAMP,
        completed BOOLEAN DEFAULT FALSE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    console.log(error);
  }
}

export async function down() {
  try {
    await db.query('DROP TABLE IF EXISTS reminders');
  } catch (error) {
    console.log(error);
  }
}

up();
```

* `user_id INT REFERENCES users(id) ON DELETE CASCADE` — a **foreign key**. If a user is deleted, all of their reminders are automatically deleted too.
* `due_date TIMESTAMP` — nullable; not every reminder needs one.

### 4. Running the Migrations

```bash
node --env-file=.env src/migrations/20260101_create_users_table.js
node --env-file=.env src/migrations/20260101_create_reminders_table.js
```

This creates both tables in your Neon database. To reverse one, temporarily change the file to call `down()` instead of `up()` and rerun it.

> **The Gap Between This and a Real Migration Tool:** Notice nothing here tracks *which* migrations have already run. Run `20260101_create_users_table.js` twice and `CREATE TABLE IF NOT EXISTS` quietly no-ops the second time — harmless here, but a real migration tool (Knex, Prisma) keeps a `schema_migrations` table recording every migration's filename and the timestamp it ran, so it knows exactly which ones are still pending on a given database and runs only those, in order. Worth naming as the actual hard problem those tools solve, even though hand-writing that bookkeeping yourself is out of scope for this course.

### 5. Rewriting the Model Layer

Because the Service layer only ever talks to `ReminderModel` — never the array directly — swapping the storage mechanism only touches this one file.

```javascript
// src/models/reminderModel.js
import db from '../config/db.js';

export const ReminderModel = {
  async getAll(userId, { completed, overdue, sort, limit = 20, offset = 0 } = {}) {
    const conditions = ['user_id = $1'];
    const values = [userId];

    if (completed !== undefined) {
      values.push(completed);
      conditions.push(`completed = $${values.length}`);
    }

    if (overdue) {
      // due_date exists on the table since Module 5 — this is its first real use
      conditions.push('due_date < NOW() AND completed = FALSE');
    }

    const orderBy = sort === 'createdAt' ? 'created_at ASC' : 'created_at DESC';

    values.push(limit, offset);
    const query = `
      SELECT * FROM reminders
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const result = await db.query(query, values);
    return result.rows;
  },

  async findById(id) {
    const result = await db.query('SELECT * FROM reminders WHERE id = $1', [id]);
    return result.rows[0];
  },

  async create({ title, notes, dueDate, userId }) {
    const result = await db.query(
      `INSERT INTO reminders (title, notes, due_date, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, notes, dueDate, userId]
    );
    return result.rows[0];
  },

  async update(id, newValues) {
    const fields = Object.keys(newValues);
    const setClauses = fields.map((key, index) => `${key} = $${index + 1}`);
    const values = Object.values(newValues);
    values.push(id); // id goes last, for the WHERE clause

    const query = `
      UPDATE reminders
      SET ${setClauses.join(', ')}
      WHERE id = $${values.length}
      RETURNING *
    `;
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async delete(id) {
    const result = await db.query('DELETE FROM reminders WHERE id = $1', [id]);
    return result.rowCount;
  },
};
```

> **Warning:** always use parameterized placeholders (`$1`, `$2`, ...) for any value coming from a request — never build SQL strings by concatenating user input directly. That's how SQL injection happens.

Notice `update()` builds its `SET` clause **dynamically** from whatever fields were actually sent — a `PATCH` with just `{ "completed": true }` only touches the `completed` column, leaving everything else untouched.

Also notice `getAll()` now runs Week 2's `{ completed, sort, limit, offset }` query-param contract as *real* SQL — `WHERE`, `ORDER BY`, `LIMIT`/`OFFSET` — exactly as promised back then, with zero changes needed to the Controller or Service. The new `overdue` flag is the first thing in the whole course to actually *read* the `due_date` column — it's been sitting on the table since Module 5's migration, created but unused until now.

**⭐️ Class Exercise: Prove Persistence**

1. Create a reminder via Postman.
2. Restart your server (`Ctrl+C`, then `npm run dev` again).
3. `GET /reminders` — the reminder you created is still there. That's the whole point of this week.
4. Create a reminder with a `due_date` in the past and `completed: false`. Test `GET /reminders?overdue=true` and confirm it comes back; confirm a reminder with a future `due_date` does not.
5. Re-run last week's `?completed=`, `?sort=`, and `?limit=`/`?offset=` checks — same query params, now backed by real SQL instead of an in-memory array.

---

## 📝 Week 3 Assignment: "Persist Reminders to PostgreSQL"

**Objective:** The same layered API from Week 2, now backed by a real database.

### Requirements

1. **Neon database:** a free project created, with a `.env` file (not committed) holding `DATABASE_URL`.
2. **Migrations:** `migrations/<timestamp>_create_users_table.js` and `..._create_reminders_table.js`, both runnable via `node --env-file=.env`.
3. **Model layer:** every method in `reminderModel.js` runs real parameterized SQL — no in-memory array left anywhere in the codebase.
4. **List endpoint, for real:** `getAll()` runs Week 2's `completed`/`sort`/`limit`/`offset` query params as actual SQL, plus a new `overdue` filter using the `due_date` column.
5. **Proof of persistence:** in your PR/commit description, paste a `GET /reminders` response *before* and *after* restarting the server, showing the data survived.

### Git Workflow

* `git commit -m "feat: connect to Neon PostgreSQL via pg"`
* `git commit -m "feat: add hand-rolled migrations for users and reminders tables"`
* `git commit -m "feat: persist reminders to PostgreSQL via raw SQL"`
