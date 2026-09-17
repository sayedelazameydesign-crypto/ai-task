import { describe, expect, it } from "vitest";
import { createTask, getTaskEvents, pauseTask, resumeTask } from "./task-service";

describe("task service", () => {
  it("creates a resumable queued task and emits a creation event", async () => {
    const task = await createTask({ userId: 0, goal: "اختبار دورة المهمة", messages: [{ role: "user", content: "اختبر المهمة" }] });
    expect(task.status).toBe("queued");
    const events = await getTaskEvents(task.id);
    expect(events[0]?.type).toBe("task.created");
  });

  it("can pause and resume a queued task", async () => {
    const task = await createTask({ userId: 0, goal: "اختبار الإيقاف", messages: [{ role: "user", content: "اختبر الإيقاف" }] });
    await pauseTask(task.id);
    expect((await pauseTask(task.id))?.status).toBe("paused");
    await resumeTask(task.id);
    const events = await getTaskEvents(task.id);
    expect(events.some(event => event.type === "task.resumed")).toBe(true);
  });

  it("returns the same task for a repeated idempotency key", async () => {
    const input = { userId: 0, goal: "مهمة idempotency", messages: [{ role: "user" as const, content: "لا تكررني" }], idempotencyKey: `test-${Date.now()}` };
    const first = await createTask(input);
    const second = await createTask(input);
    expect(second.id).toBe(first.id);
  });
});
