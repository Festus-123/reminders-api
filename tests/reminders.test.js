// tests/reminders.test.js
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("Reminders API", () => {
  let accessToken;

  beforeAll(async () => {
    const signupRes = await request(app)
      .post("/api/v1/auth/signup")
      .send({
        email: `test-${Date.now()}@example.com`,
        password: "password123",
      });
    accessToken = signupRes.body.accessToken;
  });

  it("reject user with wrong password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: `test-${Date.now()}@example.com`,
        password: "wrongpassword",
      });
    expect(res.status).toBe(401);
  });

  it("rejects requests with no token", async () => {
    const res = await request(app).get("/api/v1/reminders");
    expect(res.status).toBe(401);
  });

  it("creates and fetches a reminder for the logged-in user", async () => {
    const createRes = await request(app)
      .post("/api/v1/reminders")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "Buy milk", notes: "Whole milk, not skim" });

    expect(createRes.status).toBe(201);
    expect(createRes.body.title).toBe("Buy milk");

    const listRes = await request(app)
      .get("/api/v1/reminders")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThan(0);
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/api/v1/reminders")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ notes: "no title here" });

    expect(res.status).toBe(400);
  });

  it("it updates a reminer", async () => {
    const updateRes = await request(app)
      .patch("/api/v1/reminders/1")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "Updated title" });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.title).toBe("Updated title");
  });

  it("it dosen't permit deleting a reminder that doesn't belong to the user", async () => {
    const deleteRes = await request(app)
      .delete("/api/v1/reminders/9999")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(deleteRes.status).toBe(403);
  });
});
