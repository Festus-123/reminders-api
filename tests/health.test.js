// tests/health.test.js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app/app.js';

describe('GET /health', () => {
  it('returns 200 and status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});