// src/schemas/reminderSchema.js
import { z } from 'zod';

// The full shape of a reminder as stored in the database
export const reminderSchema = z.object({
  id: z.number(),
  title: z.string().min(1, 'Title should be longer').max(255),
  notes: z.string().nullable().optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  completed: z.boolean().optional().default(false),
  userId: z.number(),
  createdAt: z.union([z.string().datetime({ offset: true }), z.date(), z.string()]),
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
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  completed: z.boolean().optional(),
});
