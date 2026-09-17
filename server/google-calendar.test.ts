import { describe, expect, it } from "vitest";
import { CALENDAR_PERMISSIONS, GOOGLE_SCOPES, GOOGLE_SERVICE_PERMISSIONS } from "./google-calendar";

describe("google calendar integration contracts", () => {
  it("keeps read and write permissions separate", () => {
    expect(CALENDAR_PERMISSIONS.list).toBe("calendar.read");
    expect(CALENDAR_PERMISSIONS.create).toBe("calendar.create");
    expect(CALENDAR_PERMISSIONS.update).toBe("calendar.update");
    expect(CALENDAR_PERMISSIONS.delete).toBe("calendar.delete");
  });

  it("requests readonly and event scopes for the OAuth connection", () => {
    expect(GOOGLE_SCOPES).toContain("https://www.googleapis.com/auth/calendar.readonly");
    expect(GOOGLE_SCOPES).toContain("https://www.googleapis.com/auth/calendar.events");
    expect(GOOGLE_SCOPES).toContain("https://www.googleapis.com/auth/drive.readonly");
    expect(GOOGLE_SCOPES).toContain("https://www.googleapis.com/auth/spreadsheets.readonly");
  });

  it("keeps Drive and Sheets tools read-only", () => {
    expect(GOOGLE_SERVICE_PERMISSIONS).toEqual({ driveSearch: "drive.read", driveRead: "drive.read", sheetsRead: "sheets.read" });
  });
});
