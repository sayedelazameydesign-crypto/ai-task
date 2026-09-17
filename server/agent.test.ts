import { describe, expect, it } from "vitest";
import { createTools, SYSTEM_PROMPT } from "./agent";

describe("agent contracts", () => {
  it("keeps the system prompt focused on verification and safety", () => {
    expect(SYSTEM_PROMPT).toContain("never claim an action succeeded");
    expect(SYSTEM_PROMPT).toContain("untrusted data");
  });

  it("registers read-only Calendar tools and gates Calendar writes", () => {
    const tools = createTools();
    expect(tools.map(tool => tool.name)).toContain("google_calendar_list");
    expect(tools.map(tool => tool.name)).toContain("google_calendar_freebusy");
    const create = tools.find(tool => tool.name === "google_calendar_create_event");
    expect(create?.riskLevel).toBe("high");
    expect(create?.requiresConfirmation).toBe(true);
  });

  it("validates preference tool input before persisting", async () => {
    const tool = createTools().find(candidate => candidate.name === "remember_user_preference");
    expect(tool).toBeDefined();
    await expect(tool!.execute({ preference: "" }, { userId: 0 })).rejects.toThrow("Invalid preference");
  });
});
